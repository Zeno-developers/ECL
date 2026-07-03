const OFFLINE_ACCOUNTS_KEY = 'elchurch_offline_accounts_v1'
const OFFLINE_SESSION_KEY = 'elchurch_offline_session_v1'

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

const readJson = (key, fallback) => {
  if (!isBrowser()) return fallback

  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  if (!isBrowser()) return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to persist ${key}:`, error)
  }
}

const getAccounts = () => readJson(OFFLINE_ACCOUNTS_KEY, {})

const setAccounts = (accounts) => writeJson(OFFLINE_ACCOUNTS_KEY, accounts)

const arrayBufferToHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const hexToBytes = (hex) => {
  const clean = String(hex || '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes
}

const createSalt = () => {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return arrayBufferToHex(salt)
}

const derivePasswordHash = async (password, salt, iterations = 120000) => {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  )

  return arrayBufferToHex(bits)
}

const isCryptoAvailable = () =>
  typeof crypto !== 'undefined' &&
  typeof crypto.subtle !== 'undefined' &&
  typeof TextEncoder !== 'undefined'

const sanitizeUser = (user = {}) => {
  if (!user || typeof user !== 'object') return null

  const cloned = JSON.parse(JSON.stringify(user))
  delete cloned.password
  delete cloned.reset_token
  delete cloned.reset_token_expires
  delete cloned.verification_token
  return cloned
}

export const recordOfflineSession = async ({
  email,
  password = null,
  user = null,
  token = null,
  refreshToken = null,
}) => {
  if (!isBrowser()) return null

  const normalizedEmail = normalizeEmail(email || user?.email)
  if (!normalizedEmail) return null

  const accounts = getAccounts()
  const existing = accounts[normalizedEmail] || { email: normalizedEmail }

  const nextRecord = {
    ...existing,
    email: normalizedEmail,
    user: sanitizeUser(user) || existing.user || null,
    token: token ?? existing.token ?? null,
    refreshToken: refreshToken ?? existing.refreshToken ?? null,
    lastSeenAt: new Date().toISOString(),
  }

  if (password && isCryptoAvailable()) {
    const salt = existing.salt || createSalt()
    nextRecord.salt = salt
    nextRecord.passwordHash = await derivePasswordHash(password, salt)
  }

  accounts[normalizedEmail] = nextRecord
  setAccounts(accounts)
  writeJson(OFFLINE_SESSION_KEY, {
    email: normalizedEmail,
    rememberedAt: nextRecord.lastSeenAt,
  })

  return nextRecord
}

export const getOfflineAccount = (email) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const accounts = getAccounts()
  return accounts[normalizedEmail] || null
}

export const getStoredOfflineSession = () => {
  const session = readJson(OFFLINE_SESSION_KEY, null)
  if (!session?.email) return null
  return getOfflineAccount(session.email)
}

export const clearOfflineSession = () => {
  if (!isBrowser()) return
  localStorage.removeItem(OFFLINE_SESSION_KEY)
}

export const verifyOfflineCredentials = async (email, password) => {
  const account = getOfflineAccount(email)
  if (!account || !account.passwordHash || !account.salt) {
    return null
  }

  if (!isCryptoAvailable()) {
    return null
  }

  const candidate = await derivePasswordHash(password, account.salt)
  if (candidate !== account.passwordHash) {
    return null
  }

  return {
    email: account.email,
    user: sanitizeUser(account.user),
    token: account.token || null,
    refreshToken: account.refreshToken || null,
    offline: true,
  }
}

export const restoreOfflineSession = () => {
  const account = getStoredOfflineSession()
  if (!account?.user) return null

  return {
    email: account.email,
    user: sanitizeUser(account.user),
    token: account.token || null,
    refreshToken: account.refreshToken || null,
    offline: true,
  }
}

export const isOfflineAuthNetworkError = (error) => {
  const message = String(error?.message || '')
  return (
    error?.status == null &&
    (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed') ||
      message.includes('fetch')
    )
  )
}
