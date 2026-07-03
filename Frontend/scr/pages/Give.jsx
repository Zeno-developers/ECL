import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Heart, Users, Landmark, Check } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import GooglePayButton from '../components/giving/GooglePayButton'
import { settingsAPI } from '../utils/api'
import { getCachedChurchSettings, normalizeChurchSettings } from '../utils/churchSettings'

const ease = [0.22, 1, 0.36, 1]

function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FUNDS = [
  {
    key: 'tithe',
    name: 'TITHE',
    description:
      'Honor God through faithful stewardship and support the ongoing ministry of the church.',
  },
  {
    key: 'offering',
    name: 'OFFERING',
    description:
      'Support special ministry initiatives, outreach, and moments of need within our community.',
  },
  {
    key: 'missions',
    name: 'MISSIONS',
    description:
      'Help us extend the Gospel through outreach and community impact initiatives.',
  },
  {
    key: 'building',
    name: 'BUILDING FUND',
    description:
      'Invest in future spaces for worship, growth, and community gathering.',
  },
]

const IMPACT = [
  {
    icon: Users,
    title: 'Community Outreach',
    body: 'Feeding programs, youth support, and local evangelism initiatives.',
  },
  {
    icon: Heart,
    title: 'Worship & Ministry',
    body: 'Supporting weekly gatherings, ministry operations, and spiritual care.',
  },
  {
    icon: Landmark,
    title: 'Future Growth',
    body: 'Building spaces and opportunities for future generations.',
  },
]

const PRESET_AMOUNTS = [100, 250, 500, 1000]
const FUND_OPTIONS = ['Tithe', 'Offering', 'Missions', 'Building Fund']

function GuestGivingForm() {
  const [amount, setAmount] = useState(250)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [fund, setFund] = useState('Tithe')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [churchName, setChurchName] = useState(
    () => getCachedChurchSettings().name || 'Eternal Love Church'
  )

  useEffect(() => {
    const handleUpdate = (e) => {
      const s = normalizeChurchSettings(e.detail || {})
      if (s.name) setChurchName(s.name)
    }
    window.addEventListener('church-settings-updated', handleUpdate)
    settingsAPI.getPublicSettings().then((res) => {
      const n = res?.data?.name || res?.data?.churchName
      if (n) setChurchName(n)
    }).catch(() => {})
    return () => window.removeEventListener('church-settings-updated', handleUpdate)
  }, [])

  const effectiveAmount = isCustom ? (parseFloat(customAmount) || 0) : amount

  const handlePreset = (val) => {
    setIsCustom(false)
    setAmount(val)
    setCustomAmount('')
  }

  const handleCustom = (e) => {
    setIsCustom(true)
    setCustomAmount(e.target.value)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-16 text-center"
      >
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10">
          <Check size={28} className="text-[#D4AF37]" />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.4em] text-[#D4AF37] mb-4">GIFT RECEIVED</p>
        <h3 className="text-3xl font-black tracking-tighter text-white mb-4">
          Thank you for<br />your generosity.
        </h3>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          Your gift toward <span className="text-white font-semibold">{fund}</span> has been received.
        </p>
        <button
          onClick={() => { setSuccess(null); setError(null) }}
          className="mt-10 text-[10px] tracking-[0.25em] text-zinc-600 hover:text-zinc-400 transition"
        >
          GIVE AGAIN
        </button>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Amount presets */}
      <p className="mb-5 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">AMOUNT (ZAR)</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {PRESET_AMOUNTS.map((val) => (
          <button
            key={val}
            onClick={() => handlePreset(val)}
            className={`rounded-2xl border py-3 text-sm font-bold transition-all duration-200 ${
              !isCustom && amount === val
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300'
            }`}
          >
            R{val >= 1000 ? (val / 1000) + 'k' : val}
          </button>
        ))}
      </div>
      <input
        type="number"
        min="10"
        placeholder="Custom amount"
        value={customAmount}
        onChange={handleCustom}
        className={`w-full rounded-2xl border px-4 py-3 text-sm bg-white/[0.02] text-white placeholder-zinc-700 outline-none transition-all duration-200 mb-6 ${
          isCustom ? 'border-[#D4AF37]/50' : 'border-white/[0.08] focus:border-white/20'
        }`}
      />

      {/* Fund selector */}
      <p className="mb-5 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">FUND</p>
      <div className="grid grid-cols-2 gap-2 mb-8">
        {FUND_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFund(f)}
            className={`rounded-2xl border py-3 text-[11px] font-bold tracking-[0.1em] transition-all duration-200 ${
              fund === f
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Optional details */}
      <div className="mb-8 space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition focus:border-white/20"
        />
        <input
          type="email"
          placeholder="Email for receipt (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition focus:border-white/20"
        />
      </div>

      {/* Google Pay */}
      {effectiveAmount >= 10 && (
        <GooglePayButton
          amountZAR={effectiveAmount}
          fund={fund}
          donorName={name}
          donorEmail={email}
          merchantName={churchName}
          onSuccess={() => { setSuccess(true); setError(null) }}
          onError={(err) => setError(err?.message || 'Payment failed. Please try again.')}
        />
      )}

      {effectiveAmount < 10 && effectiveAmount > 0 && (
        <p className="text-center text-xs text-zinc-600">Minimum donation is R10.00</p>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}

      <p className="mt-6 text-center text-[10px] tracking-[0.15em] text-zinc-700">
        SECURED BY STRIPE · GOOGLE PAY
      </p>

      <div className="mt-8 border-t border-white/[0.04] pt-6 text-center">
        <p className="text-xs text-zinc-600">
          Member?{' '}
          <Link to="/giving" className="text-[#D4AF37] hover:underline">
            Sign in to give & track your giving history
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function Give() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <PublicNavigation variant="dark" />

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.18)_0%,transparent_70%)]" />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="text-[10px] font-semibold tracking-[0.45em] text-[#D4AF37]"
        >
          GIVING · GENEROSITY · STEWARDSHIP
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
          className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl"
        >
          <span className="block">GIVE</span>
          <span className="block text-[#D4AF37]">GENEROUSLY.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25, ease }}
          className="mt-8 max-w-md text-base leading-7 text-zinc-400 sm:text-lg"
        >
          Your generosity helps us serve people, strengthen community, and advance the mission of Eternal Love Church.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4, ease }}
          className="mt-10"
        >
          <a
            href="#give-now"
            className="inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-[#050505] transition hover:bg-[#c09b28]"
          >
            GIVE NOW
            <ArrowRight size={14} />
          </a>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-[0.3em] text-zinc-700">SCROLL</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-5 w-px bg-gradient-to-b from-zinc-700 to-transparent"
          />
        </motion.div>
      </section>

      {/* ─── DIVIDER ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>

      {/* ─── GIVING FUNDS ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-28 sm:px-8">
        <FadeUp>
          <p className="mb-16 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
            Ways to Give
          </p>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FUNDS.map((fund, i) => (
            <FadeUp key={fund.key} delay={i * 0.08}>
              <a
                href="#give-now"
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#D4AF37]/20 hover:bg-white/[0.04]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.05)_0%,transparent_70%)]" />

                <div>
                  <p className="text-[10px] font-bold tracking-[0.35em] text-[#D4AF37] mb-5">
                    {fund.name}
                  </p>
                  <p className="text-sm leading-[1.8] text-zinc-500">
                    {fund.description}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-zinc-600 transition-colors duration-200 group-hover:text-[#D4AF37]">
                  GIVE {fund.name.split(' ')[0]}
                  <ArrowRight size={11} />
                </div>
              </a>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── GUEST GIVING ─────────────────────────────────────────── */}
      <section id="give-now" className="relative overflow-hidden py-28 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(109,40,217,0.07)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-20 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-start">
            {/* Left — heading */}
            <FadeUp>
              <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
                Give Instantly
              </p>
              <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-[0.92] mb-8">
                NO ACCOUNT<br />
                <span className="text-[#D4AF37]">REQUIRED.</span>
              </h2>
              <p className="text-sm leading-[1.9] text-zinc-500 max-w-sm">
                Give in seconds using Google Pay. Select your amount, choose a fund, and complete your gift with one tap. Your generosity goes straight to work in the kingdom.
              </p>
              <div className="mt-12 space-y-4">
                {['Instant, secure checkout', 'No account needed', 'Optional email receipt', 'All major cards accepted'].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <Check size={10} className="text-[#D4AF37]" />
                    </div>
                    <span className="text-xs tracking-wide text-zinc-500">{item}</span>
                  </div>
                ))}
              </div>
            </FadeUp>

            {/* Right — form */}
            <FadeUp delay={0.1}>
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10">
                <GuestGivingForm />
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ─── SCRIPTURE ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(109,40,217,0.1)_0%,transparent_70%)]" />
        <FadeUp className="relative max-w-4xl mx-auto text-center">
          <p className="mb-8 text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Malachi 3:10</p>
          <blockquote className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight text-white">
            "Bring the whole tithe into the storehouse,<br className="hidden sm:block" />
            <span className="text-[#D4AF37]"> that there may be food in my house."</span>
          </blockquote>
        </FadeUp>
      </section>

      {/* ─── WHERE GIVING GOES ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-32 sm:px-8">
        <div className="mb-16 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        <FadeUp>
          <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
            Where Your Giving Goes
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-[0.95] mb-16">
            EVERY GIFT<br />
            <span className="text-zinc-600">HAS PURPOSE.</span>
          </h2>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-3">
          {IMPACT.map(({ icon: Icon, title, body }, i) => (
            <FadeUp key={title} delay={i * 0.1}>
              <div className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]">
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
                  <Icon size={18} className="text-[#D4AF37]" />
                </div>
                <h3 className="mb-3 text-sm font-bold tracking-wide text-white">{title}</h3>
                <p className="text-sm leading-[1.8] text-zinc-600">{body}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* CTA */}
        <FadeUp delay={0.3} className="mt-20 text-center">
          <a
            href="#give-now"
            className="inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/40 px-10 py-4 text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.2)]"
          >
            BEGIN GIVING
            <ArrowRight size={13} />
          </a>
        </FadeUp>
      </section>

      <PublicFooter />
    </div>
  )
}
