import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Music, Baby, Globe, Video, Coffee, BookOpen, X, Loader2, CheckCircle2 } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { settingsAPI, careersAPI } from '../utils/api'
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

const MINISTRIES = [
  {
    icon: Music,
    title: 'Worship & Arts',
    description: 'Vocalists, musicians, sound engineers, and creatives who lead our congregation into the presence of God.',
    openings: ['Vocalist', 'Keys / Guitar', 'Sound Engineer'],
  },
  {
    icon: Baby,
    title: "Children's Ministry",
    description: 'Passionate volunteers who create safe, fun, and spiritually rich environments for the next generation.',
    openings: ['Sunday School Teacher', 'Junior Church Leader', 'Nursery Attendant'],
  },
  {
    icon: Globe,
    title: 'Outreach & Missions',
    description: 'Teams that take the love of Christ beyond the walls of the church into communities that need it most.',
    openings: ['Community Coordinator', 'Street Evangelist', 'Feeding Programme'],
  },
  {
    icon: Video,
    title: 'Media & Technology',
    description: 'Creatives and engineers who manage livestreams, photography, social media, and digital communications.',
    openings: ['Camera Operator', 'Social Media Lead', 'Graphic Designer'],
  },
  {
    icon: Coffee,
    title: 'Hospitality',
    description: 'Warm, welcoming servants who ensure every person who walks through our doors feels valued and at home.',
    openings: ['Welcome Team', 'Usher', 'Events Coordinator'],
  },
  {
    icon: BookOpen,
    title: 'Administration',
    description: 'Behind-the-scenes leaders who keep the church functioning — from records and communications to planning.',
    openings: ['Church Secretary', 'Finance Assistant', 'Events Admin'],
  },
]

const STEPS = [
  { num: '01', title: 'Express Interest', body: 'Reach out to us via WhatsApp or email and tell us which ministry area excites you.' },
  { num: '02', title: 'Meet the Team', body: 'We\'ll connect you with the relevant ministry leader for an informal conversation.' },
  { num: '03', title: 'Shadow & Serve', body: 'Join a session to experience the ministry firsthand before committing.' },
  { num: '04', title: 'Join the Family', body: 'Once we\'re aligned, you become part of the team — trained, equipped, and released.' },
]

const WHY = [
  { stat: 'Purpose', body: 'Every role serves a mission bigger than itself.' },
  { stat: 'Growth', body: 'We invest in people — spiritually and practically.' },
  { stat: 'Community', body: 'Serve alongside people who genuinely care for each other.' },
  { stat: 'Impact', body: 'Your contribution changes lives and advances the kingdom.' },
]

function toWANumber(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return '27760803332'
  return d.startsWith('27') ? d : '27' + d.replace(/^0/, '')
}

function ApplyModal({ opening, onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await careersAPI.apply({
        opening_id: opening.id ?? null,
        department: opening.department,
        position: opening.title,
        ...form,
      })
      setDone(true)
    } catch {
      alert('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#D4AF37]/40 focus:ring-2 focus:ring-[#D4AF37]/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0d0d0d] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 size={48} className="text-[#D4AF37]" />
            <h3 className="text-xl font-black tracking-tight text-white">Application Submitted</h3>
            <p className="text-sm text-zinc-500">We've received your application for <span className="text-zinc-300">{opening.title}</span>. We'll be in touch soon.</p>
            <button onClick={onClose} className="mt-2 rounded-full bg-[#D4AF37] px-8 py-3 text-xs font-bold tracking-[0.2em] text-[#050505] hover:bg-[#c09b28]">CLOSE</button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.3em] text-[#D4AF37]">{opening.department.toUpperCase()}</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">{opening.title}</h3>
              </div>
              <button onClick={onClose} className="text-zinc-600 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required className={inputCls} placeholder="Full name *" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              <input required type="email" className={inputCls} placeholder="Email address *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <input className={inputCls} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <textarea rows={3} className={inputCls + ' resize-none'} placeholder="Tell us a little about yourself (optional)" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
              <button type="submit" disabled={submitting} className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3.5 text-[11px] font-bold tracking-[0.2em] text-[#050505] transition hover:bg-[#c09b28] disabled:opacity-60">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}


export default function Careers() {
  const [church, setChurch] = useState(() => ({
    phone: '0760803332',
    name: 'Eternal Love Church',
    ...getCachedChurchSettings(),
  }))
  const [apiOpenings, setApiOpenings] = useState(null) // null = not loaded yet
  const [applyTarget, setApplyTarget] = useState(null) // { id, title, department }

  useEffect(() => {
    const handleUpdate = (e) => {
      const s = normalizeChurchSettings(e.detail || {})
      setChurch((prev) => ({ ...prev, phone: s.phone || prev.phone, name: s.name || prev.name }))
    }
    window.addEventListener('church-settings-updated', handleUpdate)

    settingsAPI.getPublicSettings().then((res) => {
      const data = res?.data || {}
      const s = normalizeChurchSettings(data)
      if (s.phone || s.name) {
        setChurch((prev) => ({
          ...prev,
          phone: s.phone || prev.phone,
          name: s.name || prev.name,
        }))
      }
    }).catch(() => {})

    careersAPI.listPublic().then((res) => {
      const data = res?.data
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setApiOpenings(data)
      } else {
        setApiOpenings({})
      }
    }).catch(() => setApiOpenings({}))

    return () => window.removeEventListener('church-settings-updated', handleUpdate)
  }, [])

  const waNum = toWANumber(church.phone)
  const waApplyHref = `https://wa.me/${waNum}?text=Hi%2C%20I%27m%20interested%20in%20serving%20at%20${encodeURIComponent(church.name)}.`

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      {applyTarget && <ApplyModal opening={applyTarget} onClose={() => setApplyTarget(null)} />}
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
          SERVE · GROW · IMPACT
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
          className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl"
        >
          <span className="block">JOIN THE</span>
          <span className="block text-[#D4AF37]">MISSION.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25, ease }}
          className="mt-8 max-w-md text-base leading-7 text-zinc-400 sm:text-lg"
        >
          At {church.name}, serving isn't a role — it's a calling. Discover ministry opportunities where your gifts can make a lasting difference.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#ministries"
            className="inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-[#050505] transition hover:bg-[#c09b28]"
          >
            VIEW OPENINGS
            <ArrowRight size={14} />
          </a>
          <button
            onClick={() => setApplyTarget({ id: null, title: 'General Enquiry', department: 'General' })}
            className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] px-8 py-4 text-[11px] font-bold tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            APPLY NOW
          </button>
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

      {/* ─── WHY SERVE ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-28 sm:px-8">
        <FadeUp>
          <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
            Why Serve With Us
          </p>
          <h2 className="mb-16 text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
            MORE THAN<br />
            <span className="text-zinc-600">VOLUNTEERING.</span>
          </h2>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ stat, body }, i) => (
            <FadeUp key={stat} delay={i * 0.08}>
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]">
                <p className="mb-4 text-[10px] font-bold tracking-[0.3em] text-[#D4AF37]">{stat.toUpperCase()}</p>
                <p className="text-sm leading-[1.8] text-zinc-500">{body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── MINISTRY AREAS ───────────────────────────────────────── */}
      <section id="ministries" className="relative overflow-hidden py-28 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(109,40,217,0.07)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-20 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

          <FadeUp>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
              Open Positions
            </p>
            <h2 className="mb-16 text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
              FIND YOUR<br />
              <span className="text-[#D4AF37]">CALLING.</span>
            </h2>
          </FadeUp>

          {apiOpenings === null ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-zinc-700" />
            </div>
          ) : Object.keys(apiOpenings).length === 0 ? (
            <p className="text-center text-sm text-zinc-600 py-16">No openings at this time. Check back soon.</p>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MINISTRIES.filter(({ title }) => apiOpenings[title]?.length > 0).map(({ icon: Icon, title, description }, i) => {
              const liveList = apiOpenings[title]
              return (
                <FadeUp key={title} delay={i * 0.07}>
                  <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#D4AF37]/20 hover:bg-white/[0.04]">
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.04)_0%,transparent_70%)]" />

                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07]">
                      <Icon size={18} className="text-[#D4AF37]" />
                    </div>

                    <h3 className="mb-3 text-sm font-bold tracking-wide text-white">{title}</h3>
                    <p className="mb-6 text-sm leading-[1.8] text-zinc-600">{description}</p>

                    <div className="mt-auto space-y-2">
                      {liveList.map((opening) => (
                        <button
                          key={opening.id}
                          onClick={() => setApplyTarget({ id: opening.id, title: opening.title, department: title })}
                          className="group/role flex w-full items-center justify-between rounded-xl border border-white/[0.04] px-3 py-2 text-left transition hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.04]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-px w-3 bg-[#D4AF37]/40" />
                            <span className="text-[11px] tracking-[0.1em] text-zinc-500 group-hover/role:text-zinc-300 transition">{opening.title}</span>
                          </div>
                          <span className="text-[10px] font-bold tracking-[0.15em] text-[#D4AF37]/60 opacity-0 group-hover/role:opacity-100 transition">
                            APPLY →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              )
            })}
          </div>
          )}
        </div>
      </section>

      {/* ─── HOW TO APPLY ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-28 sm:px-8">
        <div className="mb-20 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        <FadeUp>
          <p className="mb-4 text-[10px] font-semibold tracking-[0.4em] text-zinc-600 uppercase">
            The Process
          </p>
          <h2 className="mb-16 text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
            HOW IT<br />
            <span className="text-zinc-600">WORKS.</span>
          </h2>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ num, title, body }, i) => (
            <FadeUp key={num} delay={i * 0.08}>
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8">
                <p className="mb-5 text-3xl font-black tracking-tighter text-white/[0.06]">{num}</p>
                <p className="mb-3 text-[10px] font-bold tracking-[0.25em] text-[#D4AF37]">{title.toUpperCase()}</p>
                <p className="text-sm leading-[1.8] text-zinc-500">{body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── SCRIPTURE ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(109,40,217,0.1)_0%,transparent_70%)]" />
        <FadeUp className="relative max-w-4xl mx-auto text-center">
          <p className="mb-8 text-[10px] tracking-[0.4em] text-zinc-700 uppercase">1 Peter 4:10</p>
          <blockquote className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight text-white">
            "Each of you should use whatever gift you have<br className="hidden sm:block" />
            <span className="text-[#D4AF37]"> received to serve others."</span>
          </blockquote>
        </FadeUp>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-32 sm:px-8">
        <div className="mb-20 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        <FadeUp className="text-center">
          <p className="mb-6 text-[10px] font-semibold tracking-[0.4em] text-zinc-600">READY TO SERVE?</p>
          <h2 className="mb-10 text-4xl font-black tracking-tighter text-white sm:text-5xl leading-[0.95]">
            YOUR PLACE<br />
            <span className="text-[#D4AF37]">IS WAITING.</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setApplyTarget({ id: null, title: 'General Enquiry', department: 'General' })}
              className="inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-10 py-4 text-[11px] font-bold tracking-[0.2em] text-[#050505] transition hover:bg-[#c09b28]"
            >
              APPLY NOW
              <ArrowRight size={13} />
            </button>
            <Link
              to="/contact"
              className="inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/40 px-10 py-4 text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.2)]"
            >
              ASK A QUESTION
            </Link>
          </div>
        </FadeUp>
      </section>

      <PublicFooter />
    </div>
  )
}
