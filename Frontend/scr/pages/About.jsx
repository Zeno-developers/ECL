import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Globe, Heart, Shield, Sparkles, Target, Users } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { settingsAPI } from '../utils/api'
import { getCachedChurchSettings, normalizeChurchSettings } from '../utils/churchSettings'

const FALLBACK = {
  name: 'Eternal Love Church',
  foundingDate: '7 JULY 2019',
  conferenceDescription:
    'An annual gathering focused on awakening purpose, strengthening faith, and equipping believers through apostolic truth and prophetic revelation.',
  coreQuoteSub: "A believer's identity is not shaped by talent, title, or ability — but by love.",
  serviceTimes: {
    sunday: 'Sunday 09:30 AM',
    wednesday: 'Wednesday 6:00 PM',
    friday: 'Friday 6:00 PM',
  },
}

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

function Grain({ opacity = 0.035 }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '180px',
        mixBlendMode: 'overlay',
      }}
    />
  )
}

function GoldButton({ children, onClick, large = false }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#D4AF37] font-semibold text-[#050505] transition-all ${large ? 'px-10 py-5 text-base' : 'px-8 py-4 text-sm'}`}
      style={{ boxShadow: '0 0 0 0 rgba(212,175,55,0)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px 4px rgba(212,175,55,0.28)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(212,175,55,0)' }}
    >
      <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full skew-x-12" />
      {children}
    </motion.button>
  )
}

const standFor = [
  {
    icon: Heart,
    title: 'Love',
    body: 'Love is the foundation of everything we do — loving God wholeheartedly and loving people unconditionally.',
  },
  {
    icon: Sparkles,
    title: 'The Holy Spirit',
    body: 'We believe in a daily, transforming relationship with the Holy Spirit marked by power, intimacy, and spiritual growth.',
  },
  {
    icon: Shield,
    title: 'Apostolic Foundation',
    body: 'We are built upon the foundation of apostles and prophets, with Jesus Christ as the chief cornerstone.',
  },
  {
    icon: Users,
    title: 'Community',
    body: 'Church is family — a place where people are embraced, supported, healed, and strengthened together.',
  },
  {
    icon: Target,
    title: 'Purpose',
    body: 'We equip believers to discover, develop, and walk boldly in their God-given calling.',
  },
  {
    icon: Globe,
    title: 'Mission',
    body: 'Our mission is to reach souls, transform lives, and reveal Jesus Christ through the Gospel and the power of the Spirit.',
  },
]

function extractTime(str) {
  if (!str) return ''
  return str.replace(/^\w+\s*/, '')
}

export default function About() {
  const navigate = useNavigate()
  const [church, setChurch] = useState(() => ({
    ...FALLBACK,
    ...getCachedChurchSettings(),
  }))

  useEffect(() => {
    const handleUpdate = (e) => {
      const s = normalizeChurchSettings(e.detail || {})
      setChurch((prev) => ({
        ...prev,
        ...s,
        serviceTimes: { ...(prev.serviceTimes || {}), ...(s.serviceTimes || {}) },
      }))
    }
    window.addEventListener('church-settings-updated', handleUpdate)

    settingsAPI.getPublicSettings().then((res) => {
      const data = res?.data || {}
      if (!data.name && !data.description) return
      const s = normalizeChurchSettings(data)
      setChurch((prev) => ({
        ...prev,
        name: s.name || prev.name,
        description: s.description || prev.description,
        mission: s.mission || prev.mission,
        serviceTimes: {
          ...(prev.serviceTimes || {}),
          ...(s.serviceTimes || {}),
        },
      }))
    }).catch(() => {})

    return () => window.removeEventListener('church-settings-updated', handleUpdate)
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 overflow-x-hidden">
      <PublicNavigation variant="dark" />

      <main>

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pb-28 pt-36 text-center sm:px-6 lg:px-8">
          {/* Atmospheric overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.22)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(212,175,55,0.04)_0%,transparent_55%)]" />

          {/* Animated light leak */}
          <motion.div
            className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <Grain opacity={0.035} />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="relative z-20 inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.5em] text-[#D4AF37]"
          >
            <span className="h-px w-8 bg-[#D4AF37]/50" />
            ABOUT ETERNAL LOVE CHURCH
            <span className="h-px w-8 bg-[#D4AF37]/50" />
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease }}
            className="relative z-20 mt-10 text-[clamp(60px,11vw,130px)] font-black leading-[0.85] tracking-tighter text-white"
          >
            <span className="block">WE LOVE GOD.</span>
            <span className="block text-[#D4AF37]">WE LOVE PEOPLE.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24, ease }}
            className="relative z-20 mt-8 max-w-md text-sm leading-7 text-zinc-400 sm:text-base"
          >
            A Spirit-filled church rooted in worship, truth, prayer, and the transforming
            power of the Holy Ghost.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.42, ease }}
            className="relative z-20 mt-6 text-[10px] font-bold tracking-[0.35em] text-zinc-600"
          >
            FOUNDED {church.foundingDate} &middot; MTUBATUBA, SOUTH AFRICA
          </motion.p>

          {/* Bottom fade to next section */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050505]" />
        </section>

        {/* ─── 2. OUR STORY ────────────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:px-8">
            {/* Left — headline */}
            <FadeUp className="flex flex-col justify-center">
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">OUR STORY</p>
              <h2 className="mt-6 text-[clamp(52px,8vw,90px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">A HOUSE</span>
                <span className="block">BUILT ON</span>
                <span className="block" style={{ WebkitTextStroke: '1px rgba(212,175,55,0.5)', color: 'transparent' }}>
                  LOVE
                </span>
              </h2>
              <div className="mt-4 h-px w-16 bg-[#D4AF37]/30" />
            </FadeUp>

            {/* Right — body */}
            <FadeUp delay={0.12} className="flex flex-col justify-center space-y-6">
              <p className="text-base leading-8 text-zinc-300">
                Eternal Love Church exists to lead people into a life-changing encounter with
                the presence, love, and power of God.
              </p>
              <p className="text-base leading-8 text-zinc-400">
                We are a Spirit-filled community built upon the apostolic and prophetic foundation
                of Scripture — a house where the Holy Ghost moves freely, lives are transformed,
                and people discover their divine purpose in Christ.
              </p>
              <p className="text-base leading-8 text-zinc-500">
                Our heart is simple:{' '}
                <span className="text-zinc-300 font-semibold">
                  to love God wholeheartedly and to love people genuinely.
                </span>
              </p>
            </FadeUp>
          </div>
        </section>

        {/* ─── 3. CORE CONVICTION ──────────────────────────────────── */}
        <section className="relative bg-[#050505] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(109,40,217,0.16)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(212,175,55,0.04)_0%,transparent_55%)]" />
          <Grain opacity={0.025} />

          <div className="relative mx-auto max-w-5xl px-4 py-32 text-center sm:px-6 lg:px-8">
            <FadeUp>
              <div className="flex items-center justify-center gap-6 mb-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
                <span className="text-[#D4AF37]/40 text-lg">✦</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
              </div>

              <p className="text-[10px] font-bold tracking-[0.45em] text-[#D4AF37]">CORE CONVICTION</p>

              <blockquote className="mt-8">
                <p className="text-[clamp(36px,7vw,76px)] font-black leading-[1.0] tracking-tight text-white">
                  &ldquo;LOVE IS THE FOUNDATION
                  <br className="hidden sm:block" />
                  OF ALL SPIRITUAL GIFTS.&rdquo;
                </p>
                <p className="mx-auto mt-8 max-w-sm text-sm leading-7 text-zinc-500">
                  {church.coreQuoteSub}
                </p>
              </blockquote>

              <div className="flex items-center justify-center gap-6 mt-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
                <span className="text-[#D4AF37]/40 text-lg">✦</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 4. LEADERSHIP ───────────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">LEADERSHIP</p>
              <h2 className="mt-6 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">OUR</span>
                <span className="block">SPIRITUAL</span>
                <span className="block">LEADERSHIP</span>
              </h2>
            </FadeUp>

            <FadeUp delay={0.12} className="mt-10">
              <div className="relative overflow-hidden rounded-3xl border border-[#6D28D9]/15 p-10 sm:p-14">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(109,40,217,0.1)_0%,rgba(5,5,5,0)_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(109,40,217,0.22)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_90%,rgba(212,175,55,0.04)_0%,transparent_55%)]" />
                <Grain opacity={0.04} />

                <div className="relative">
                  <div className="mb-8 inline-flex items-center gap-3">
                    <div className="h-px w-8 bg-[#D4AF37]/40" />
                    <span className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]/60">
                      SPIRITUAL COVERING
                    </span>
                  </div>

                  <h3 className="text-[clamp(36px,6vw,64px)] font-black leading-[0.9] tracking-tighter text-white">
                    Apostle Vangeli Sibisi
                  </h3>
                  <h3 className="mt-2 text-[clamp(36px,6vw,64px)] font-black leading-[0.9] tracking-tighter text-[#D4AF37]">
                    &amp; Prophetess Nokwanda Sibisi
                  </h3>

                  <div className="mt-3 h-px w-16 bg-[#D4AF37]/25" />

                  <p className="mt-8 max-w-2xl text-base leading-8 text-zinc-400">
                    Visionary leaders and spiritual covering of Eternal Love Church.
                  </p>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-500">
                    Their ministry is centered on equipping believers, strengthening families,
                    advancing the Kingdom of God, and building a church firmly rooted in apostolic
                    and prophetic order. Through prayer, teaching, and the power of the Holy Spirit,
                    they continue to raise a generation fully surrendered to God's purpose.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 5. WHAT WE STAND FOR ────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(109,40,217,0.07)_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">BELIEFS &amp; VALUES</p>
              <h2 className="mt-6 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">WHAT WE</span>
                <span className="block">STAND FOR</span>
              </h2>
            </FadeUp>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {standFor.map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.07}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3, ease }}
                    className="group flex h-full flex-col gap-7 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.03]"
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 60px -10px rgba(212,175,55,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] text-[#D4AF37] transition-all group-hover:border-[#D4AF37]/30 group-hover:bg-[#D4AF37]/[0.12]">
                      <item.icon size={19} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wide text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                        {item.body}
                      </p>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. EMERGE CONFERENCE ────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/12 p-10 sm:p-16">
                <div className="absolute inset-0 bg-[#D4AF37]/[0.015]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(109,40,217,0.16)_0%,transparent_65%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(212,175,55,0.06)_0%,transparent_60%)]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-[#D4AF37]/30" />
                <Grain opacity={0.03} />

                <div className="relative">
                  <p className="text-[10px] font-bold tracking-[0.45em] text-[#D4AF37]">ANNUAL GATHERING</p>

                  <h2 className="mt-6 text-[clamp(60px,11vw,120px)] font-black leading-[0.85] tracking-tighter text-white">
                    EMERGE
                  </h2>
                  <h3 className="mt-1 text-xl font-bold tracking-[0.12em] text-[#D4AF37] sm:text-2xl">
                    APOSTOLIC CONFERENCE
                  </h3>

                  <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
                    {church.conferenceDescription}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <span className="inline-flex rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-5 py-2 text-[10px] font-bold tracking-[0.18em] text-[#D4AF37]">
                      ANNUAL GATHERING &middot; MTUBATUBA, SOUTH AFRICA
                    </span>
                    <GoldButton onClick={() => navigate('/events')}>
                      Join Us <ArrowRight size={15} />
                    </GoldButton>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 7. SERVICE TIMES ────────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(109,40,217,0.06)_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">JOIN US</p>
              <h2 className="mt-6 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">COME</span>
                <span className="block">WORSHIP</span>
                <span className="block">WITH US</span>
              </h2>
            </FadeUp>

            <FadeUp delay={0.1} className="mt-14">
              <div className="max-w-2xl rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10">
                <div className="space-y-0">
                  {[
                    { day: 'SUNDAY', time: extractTime(church.serviceTimes?.sunday) || '09:30 AM', label: 'Main Worship Experience' },
                    { day: 'WEDNESDAY', time: extractTime(church.serviceTimes?.wednesday) || '6:00 PM', label: 'Holy Ghost Service' },
                    { day: 'FRIDAY', time: extractTime(church.serviceTimes?.friday) || '6:00 PM', label: 'Prayer & Intercession' },
                  ].map(({ day, time, label }, i, arr) => (
                    <div
                      key={day}
                      className={`group flex items-center justify-between py-7 transition-colors ${i < arr.length - 1 ? 'border-b border-white/[0.05] hover:border-[#D4AF37]/10' : ''}`}
                    >
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-600">{day}</p>
                        <p className="mt-1.5 text-3xl font-black tracking-tight text-white">{time}</p>
                      </div>
                      <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors text-right">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 8. FINAL CTA ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#050505]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(109,40,217,0.28)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(212,175,55,0.03)_0%,transparent_65%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent" />
          <Grain opacity={0.04} />

          <div className="relative mx-auto max-w-4xl px-4 py-40 text-center sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.5em] text-zinc-600">COME AS YOU ARE</p>

              <h2 className="mt-8 text-[clamp(56px,12vw,120px)] font-black leading-[0.82] tracking-tighter text-white">
                <span className="block">THERE'S</span>
                <span className="block" style={{ WebkitTextStroke: '1.5px rgba(212,175,55,0.5)', color: 'transparent' }}>
                  A PLACE
                </span>
                <span className="block text-[#D4AF37]">FOR YOU</span>
              </h2>

              <p className="mx-auto mt-8 max-w-sm text-sm leading-7 text-zinc-500">
                Whether you are seeking healing, purpose, restoration, or a deeper encounter with God
                — you are welcome here.
              </p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-zinc-600">
                Come experience authentic worship, genuine community, and the life-changing
                presence of Jesus Christ.
              </p>

              <div className="mt-12">
                <GoldButton large onClick={() => navigate('/contact')}>
                  Plan Your Visit <ArrowRight size={18} />
                </GoldButton>
              </div>
            </FadeUp>
          </div>
        </section>

        <PublicFooter />

      </main>
    </div>
  )
}
