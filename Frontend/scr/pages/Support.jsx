import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ChevronDown, Mail, Phone, MessageCircle, ArrowRight } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
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

const FAQS = [
  {
    q: 'How do I join Eternal Love Church?',
    a: 'You can visit us during any Sunday service — no prior registration needed. We also invite you to fill out our online contact form and one of our team will personally reach out to welcome you.',
  },
  {
    q: 'What time are Sunday services?',
    a: 'Our Sunday services are held at specific times that may vary by season. Visit our Events page or contact us directly for the current schedule.',
  },
  {
    q: 'How do I access the member portal?',
    a: 'Go to elchurch.site/login and register with your church-assigned phone number. You\'ll receive a PIN via SMS or WhatsApp. If you\'re having trouble, contact us and we\'ll assist you.',
  },
  {
    q: 'I\'m not receiving my verification PIN. What should I do?',
    a: 'First, ensure the phone number you\'re using is the same one registered with the church. If the issue persists, use the "Resend PIN" option on the login page, or contact us directly so we can verify your details.',
  },
  {
    q: 'How do I give online?',
    a: 'Visit our giving page at elchurch.site/give. You can give instantly using Google Pay without an account, or sign into the member portal to track your giving history and access additional payment methods.',
  },
  {
    q: 'How do I update my personal details?',
    a: 'Log into the member portal, go to Settings, and update your profile. For changes that affect church records (like your contact number), please contact us so we can update them on our end as well.',
  },
  {
    q: 'Where can I watch past sermons?',
    a: 'All our recorded sermons are available at elchurch.site/sermons, free to access without an account.',
  },
  {
    q: 'I want to serve — who do I contact?',
    a: 'We\'d love to have you on a ministry team. Check our Careers & Volunteering page for open positions, or reach out directly via WhatsApp or email and let us know your area of interest.',
  },
]

const FALLBACK_CONTACT = {
  phone: '0760803332',
  email: 'info@elchurch.site',
}

function toWANumber(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return '27760803332'
  return d.startsWith('27') ? d : '27' + d.replace(/^0/, '')
}

function formatPhone(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return '+27 76 080 3332'
  const local = d.startsWith('27') ? '0' + d.slice(2) : d
  if (local.length < 10) return '+27 ' + local.slice(1)
  return '+27 ' + local.slice(1, 3) + ' ' + local.slice(3, 6) + ' ' + local.slice(6)
}

function buildChannels(church) {
  const waNum = toWANumber(church.phone)
  const displayPhone = formatPhone(church.phone)
  const email = church.email || FALLBACK_CONTACT.email
  return [
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: displayPhone,
      href: `https://wa.me/${waNum}`,
      note: 'Fastest response — usually within a few hours',
    },
    {
      icon: Mail,
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      note: 'For detailed enquiries or documentation',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: displayPhone,
      href: `tel:+${waNum}`,
      note: 'Available during office hours',
    },
  ]
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.05]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-6 py-7 text-left"
      >
        <span className="text-sm font-semibold leading-[1.6] text-zinc-300">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease }}
          className="mt-0.5 shrink-0 text-zinc-600"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <p className="pb-7 text-sm leading-[1.9] text-zinc-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Support() {
  const [church, setChurch] = useState(() => ({
    ...FALLBACK_CONTACT,
    ...getCachedChurchSettings(),
  }))

  useEffect(() => {
    const handleUpdate = (e) => {
      const s = normalizeChurchSettings(e.detail || {})
      setChurch((prev) => ({ ...prev, ...s }))
    }
    window.addEventListener('church-settings-updated', handleUpdate)

    settingsAPI.getPublicSettings().then((res) => {
      const data = res?.data || {}
      if (!data.phone && !data.email) return
      const s = normalizeChurchSettings(data)
      setChurch((prev) => ({
        ...prev,
        phone: s.phone || prev.phone,
        email: s.email || prev.email,
      }))
    }).catch(() => {})

    return () => window.removeEventListener('church-settings-updated', handleUpdate)
  }, [])

  const channels = buildChannels(church)

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
          SUPPORT · HELP · CONTACT
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
          className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl"
        >
          <span className="block">WE'RE HERE</span>
          <span className="block text-[#D4AF37]">FOR YOU.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25, ease }}
          className="mt-8 max-w-md text-base leading-7 text-zinc-400 sm:text-lg"
        >
          Whether you need help with the portal, have a question about giving, or simply want to connect — we're ready to help.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#faq"
            className="inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-[#050505] transition hover:bg-[#c09b28]"
          >
            BROWSE FAQ
            <ArrowRight size={14} />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            CONTACT US
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

      {/* ─── CONTACT CHANNELS ─────────────────────────────────────── */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-28 sm:px-8">
        <FadeUp>
          <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
            Reach Us
          </p>
          <h2 className="mb-16 text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
            GET IN<br />
            <span className="text-zinc-600">TOUCH.</span>
          </h2>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-3">
          {channels.map(({ icon: Icon, label, value, href, note }, i) => (
            <FadeUp key={label} delay={i * 0.08}>
              <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#D4AF37]/20 hover:bg-white/[0.04]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
                  <Icon size={18} className="text-[#D4AF37]" />
                </div>
                <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-zinc-600">{label.toUpperCase()}</p>
                <p className="mb-3 text-sm font-semibold text-white">{value}</p>
                <p className="text-xs leading-[1.7] text-zinc-600">{note}</p>
              </a>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.25} className="mt-8">
          <Link
            to="/contact"
            className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-zinc-500 transition hover:border-white/20 hover:text-white"
          >
            OPEN CONTACT FORM
            <ArrowRight size={13} />
          </Link>
        </FadeUp>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="relative overflow-hidden py-28 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(109,40,217,0.07)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-20 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

          <div className="grid gap-16 lg:grid-cols-[1fr_2fr] lg:gap-24">
            <FadeUp>
              <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
                FAQ
              </p>
              <h2 className="text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
                COMMON<br />
                <span className="text-[#D4AF37]">QUESTIONS.</span>
              </h2>
              <p className="mt-8 text-sm leading-[1.9] text-zinc-500 max-w-xs">
                Can't find what you're looking for? Reach out and we'll respond as quickly as we can.
              </p>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div>
                {FAQS.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ─── SCRIPTURE CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(109,40,217,0.1)_0%,transparent_70%)]" />
        <FadeUp className="relative max-w-3xl mx-auto text-center">
          <p className="mb-8 text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Matthew 11:28</p>
          <blockquote className="text-3xl sm:text-4xl font-black leading-[1.1] tracking-tight text-white">
            "Come to me, all you who are weary<br className="hidden sm:block" />
            <span className="text-[#D4AF37]"> and burdened, and I will give you rest."</span>
          </blockquote>
        </FadeUp>
      </section>

      <PublicFooter />
    </div>
  )
}
