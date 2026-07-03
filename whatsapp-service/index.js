require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
})

// Suppress libsignal/Baileys noise that prints directly to stdout/stderr,
// bypassing our structured logger. Covers: session key dumps, Bad MAC walls,
// "error in sending message again" on stale queued retries.
const _NOISE_LOG = /Closing session|Opening session|Closing open session|Failed to decrypt message with any known session/i
const _NOISE_ERR = /Session error|Bad MAC|PreKeyError|SessionError|failed to decrypt|No session record|Invalid PreKey|Timed Out|error in sending message again/i

const _log = console.log
console.log = (...a) => {
  const first = typeof a[0] === 'string' ? a[0] : ''
  if (_NOISE_LOG.test(first)) return
  _log(...a)
}

const _err = console.error
console.error = (...a) => {
  const s = a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')
  if (_NOISE_ERR.test(s)) return
  _err(...a)
}

// libsignal bypasses console and writes directly to process.stdout
const _stdoutWrite = process.stdout.write.bind(process.stdout)
process.stdout.write = (chunk, encoding, cb) => {
  const s = typeof chunk === 'string' ? chunk : chunk.toString()
  if (_NOISE_LOG.test(s) || _NOISE_ERR.test(s)) {
    if (typeof encoding === 'function') encoding()
    else if (typeof cb === 'function') cb()
    return true
  }
  return _stdoutWrite(chunk, encoding, cb)
}

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const QRCode = require('qrcode')
const express = require('express')
const cron = require('node-cron')

const app = express()
app.use(express.json())
const fs = require('fs')
const path = require('path')

// Shared files PHP reads to show QR status
const STATUS_FILE = path.join(__dirname, 'wa_status.txt')
const QR_FILE     = path.join(__dirname, 'wa_qr.png')

function writeStatus(status) {
  try { fs.writeFileSync(STATUS_FILE, status, 'utf8') } catch {}
}

async function writeQrFile(qrString) {
  try {
    const buf = await QRCode.toBuffer(qrString, { width: 300, margin: 2 })
    fs.writeFileSync(QR_FILE, buf)
    writeStatus('qr')
  } catch (err) {
    console.error('[wa] Failed to write QR file:', err.message)
  }
}

// ─── Persistent message store ─────────────────────────────────────────────────
// Survives restarts so getMessage() never returns blank hours later.
const STORE_FILE = path.join(__dirname, '.wa_auth', 'msg_store.json')
let msgStore = {}

function loadMsgStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      msgStore = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))
      console.log(`[wa] Message store loaded — ${Object.keys(msgStore).length} entries`)
    }
  } catch (err) {
    console.warn('[wa] Could not load message store:', err.message)
    msgStore = {}
  }
}

let _storeTimer = null
function saveMsgStore() {
  if (_storeTimer) return
  _storeTimer = setTimeout(() => {
    _storeTimer = null
    try {
      const keys = Object.keys(msgStore)
      if (keys.length > 2000) {
        const trimmed = {}
        keys.slice(-2000).forEach(k => { trimmed[k] = msgStore[k] })
        msgStore = trimmed
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(msgStore), 'utf8')
    } catch (err) {
      console.warn('[wa] Could not save message store:', err.message)
    }
  }, 500)
}

loadMsgStore()

let isReady = false
let latestQr = null
let sock = null
let settlingUntil = 0  // timestamp until which the session is still stabilising after reconnect

// Silent logger — Baileys is extremely verbose by default
// PreKeyError / SessionError / "failed to decrypt" are expected noise after a reconnect:
// old messages in the queue were encrypted with pre-keys that are no longer in the store.
// They don't affect sending and cannot be fixed at runtime — clear .wa_auth to reset.
const DECRYPT_NOISE = /PreKeyError|SessionError|failed to decrypt|No session record|Invalid PreKey|unexpected error in 'init queries'|Timed Out|error in sending message again|Bad MAC|remoteJid.*undefined/i

const logger = {
  level: 'silent',
  child: () => logger,
  trace: () => {}, debug: () => {}, info: () => {},
  warn: (...a) => {
    const s = a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')
    if (DECRYPT_NOISE.test(s)) return
    console.warn('[wa]', ...a)
  },
  error: (...a) => {
    const s = a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')
    if (DECRYPT_NOISE.test(s)) return
    console.error('[wa]', ...a)
  },
  fatal: (...a) => console.error('[wa]', ...a),
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./.wa_auth')

  const { version } = await fetchLatestBaileysVersion().catch(() => ({
    version: [2, 3000, 1015901307],
  }))

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['ELC Server', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    getMessage: async (key) => {
      return msgStore[key.id] || { conversation: '' }
    },
  })

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.id && msg.message) {
        msgStore[msg.key.id] = msg.message
      }
    }
    saveMsgStore()
  })

  // Track actual delivery — status 2=server ACK, 3=delivered to device, 4=read
  const STATUS_LABEL = { 0: 'ERROR', 1: 'PENDING', 2: 'SERVER_ACK', 3: 'DELIVERED', 4: 'READ', 5: 'PLAYED' }
  sock.ev.on('messages.update', (updates) => {
    for (const { key, update } of updates) {
      if (update?.status !== undefined && key?.fromMe) {
        const label = STATUS_LABEL[update.status] ?? `STATUS_${update.status}`
        const recipient = key.remoteJid?.split('@')[0] ?? '?'
        console.log(`[wa] Delivery update → ${recipient}: ${label}`)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      latestQr = qr
      console.log('\nNew QR code received — writing to wa_qr.png\n')
      qrcode.generate(qr, { small: true })
      writeQrFile(qr)
    }

    if (connection === 'close') {
      isReady = false
      writeStatus('waiting')
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      console.warn('[wa] Connection closed — status code:', statusCode)
      if (loggedOut) {
        console.log('[wa] Logged out. Delete the .wa_auth folder and restart to re-scan the QR.')
      } else {
        console.log('[wa] Reconnecting in 10s...')
        setTimeout(connectToWhatsApp, 10_000)
      }
    } else if (connection === 'open') {
      isReady = true
      settlingUntil = Date.now() + 8_000  // give the Signal session 8s to fully stabilise
      latestQr = null
      writeStatus('connected')
      try { fs.unlinkSync(QR_FILE) } catch {}
      console.log('WhatsApp client ready — messages will now be sent via 0717377666')
    }
  })
}

writeStatus('starting')
connectToWhatsApp().catch(err => {
  console.error('[wa] Fatal init error:', err.message)
  writeStatus('error: ' + err.message)
})

// Normalize SA phone to Baileys JID format
// 0760803332 → 27760803332@s.whatsapp.net
function toWhatsAppJid(phone) {
  phone = phone.replace(/[\s\-()]/g, '')
  if (phone.startsWith('+')) phone = phone.slice(1)
  if (phone.startsWith('0')) phone = '27' + phone.slice(1)
  return phone + '@s.whatsapp.net'
}

app.get('/status', (req, res) => {
  res.json({ ready: isReady })
})

// Returns the QR as a raw PNG image (for PHP to fetch and embed)
// 200 = QR image, 204 = connected (no content), 202 = not ready yet
app.get('/qr.png', async (req, res) => {
  if (isReady) return res.status(204).end()
  if (!latestQr) return res.status(202).end()
  try {
    const buf = await QRCode.toBuffer(latestQr, { width: 280, margin: 2 })
    res.set('Content-Type', 'image/png').send(buf)
  } catch (err) {
    res.status(500).end()
  }
})

app.post('/send', async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' })
  }

  if (!isReady || !sock) {
    return res.status(503).json({ error: 'WhatsApp client not connected — scan the QR code first' })
  }

  const remaining = settlingUntil - Date.now()
  if (remaining > 0) {
    console.warn(`[wa] Send rejected — session still settling (${Math.ceil(remaining / 1000)}s left)`)
    return res.status(503).json({
      error: 'WhatsApp session is stabilising after reconnect — please retry in a few seconds',
      retryAfterSeconds: Math.ceil(remaining / 1000),
    })
  }

  const jid = toWhatsAppJid(phone)

  // SA numbers must be 11 digits after normalisation (27 + 9 digits)
  const digits = jid.replace('@s.whatsapp.net', '')
  if (!/^27\d{9}$/.test(digits)) {
    console.error(`[wa] Rejected invalid SA number: ${phone} → ${digits}`)
    return res.status(400).json({ error: `Invalid SA phone number: ${phone} (normalised to ${digits})` })
  }

  try {
    const sent = await sock.sendMessage(jid, { text: message })
    if (sent?.key?.id) {
      msgStore[sent.key.id] = { conversation: message }
      saveMsgStore()
    }
    console.log(`[wa] Queued → ${phone} (awaiting delivery ACK)`)
    res.json({ sent: true, to: phone })
  } catch (err) {
    console.error(`[wa] Failed to send to ${phone}:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Cron helpers ────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'
const CRON_SECRET = process.env.CRON_SECRET || ''

async function cronPost(url, label) {
  if (!CRON_SECRET) {
    console.warn(`[cron] CRON_SECRET not set — skipping ${label}`)
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': CRON_SECRET },
    })
    const text = await res.text()
    let body = {}
    try { body = text ? JSON.parse(text) : {} } catch { body = { message: text } }
    return { ok: res.ok, status: res.status, body }
  } catch (err) {
    console.error(`[cron] ${label} fetch error:`, err.message)
    return null
  }
}

// ─── Meeting poll generation (daily 20:00) ───────────────────────────────────
const CRON_SCHEDULE          = process.env.POLL_CRON_SCHEDULE || '0 20 * * *'
const MEETING_POLLS_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/api/attendance/polls/generate-cron`

async function generateMeetingPolls() {
  const r = await cronPost(MEETING_POLLS_ENDPOINT, 'meeting polls')
  if (!r) return
  if (r.ok && r.body.status === 'success') {
    const { created, emailed, target_date } = r.body.data || {}
    console.log(`[cron] Meeting polls generated: ${created} poll(s) for ${target_date}, ${emailed} email(s) sent`)
  } else {
    console.error(`[cron] Meeting poll generation failed (${r.status}):`, r.body.message || '')
  }
}

cron.schedule(CRON_SCHEDULE, generateMeetingPolls, { timezone: 'Africa/Johannesburg' })
console.log(`[cron] Meeting poll scheduler registered — runs at "${CRON_SCHEDULE}" Africa/Johannesburg`)
console.log(`[cron] Meeting poll endpoint: ${MEETING_POLLS_ENDPOINT}`)

// ─── Monday morning pastoral report (Monday 08:00) ───────────────────────────
const PASTORAL_REPORT_SCHEDULE = process.env.PASTORAL_REPORT_CRON_SCHEDULE || '0 8 * * 1'
const PASTORAL_REPORT_ENDPOINT = `${BACKEND_URL.replace(/\/$/, '')}/api/reports/pastoral-report-cron`

async function generatePastoralReport() {
  const r = await cronPost(PASTORAL_REPORT_ENDPOINT, 'pastoral report')
  if (!r) return
  if (r.ok && r.body.status === 'success') {
    const { service_date, emails_sent, whatsapp_sent, attendance, giving_sunday } = r.body.data || {}
    const total = giving_sunday?.total ? `R${Number(giving_sunday.total).toFixed(2)}` : 'R0.00'
    console.log(
      `[cron] Pastoral report sent for ${service_date}: ` +
      `${attendance?.total ?? 0} attendees, ${total} collected, ` +
      `${emails_sent} email(s), ${whatsapp_sent} WhatsApp(s)`
    )
  } else {
    console.error(`[cron] Pastoral report failed (${r.status}):`, r.body.message || '')
  }
}

cron.schedule(PASTORAL_REPORT_SCHEDULE, generatePastoralReport, { timezone: 'Africa/Johannesburg' })
console.log(`[cron] Pastoral report scheduler registered — runs at "${PASTORAL_REPORT_SCHEDULE}" Africa/Johannesburg`)
console.log(`[cron] Pastoral report endpoint: ${PASTORAL_REPORT_ENDPOINT}`)

function startServer(port, maxPort) {
  const server = app.listen(port, () => {
    console.log(`WhatsApp service HTTP running on port ${port}`)
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < maxPort) {
      console.warn(`[wa] Port ${port} in use, trying ${port + 1}...`)
      startServer(port + 1, maxPort)
    } else {
      console.warn(`[wa] HTTP server could not start (${err.message}) — file-based QR still works`)
    }
  })
}

const PORT = parseInt(process.env.PORT || '3002', 10)
startServer(PORT, PORT + 10)
