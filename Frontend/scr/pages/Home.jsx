import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Heart,
  MapPin,
  Music2,
  Play,
  ShieldCheck,
  Users,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { eventsAPI, homeImagesAPI, sermonsAPI, settingsAPI } from '../utils/api'
import { getCachedChurchSettings, normalizeChurchSettings } from '../utils/churchSettings'

const FALLBACK = {
  name: 'Eternal Love Church',
  description:
    'A dynamic, vibrant Church of the Holy Ghost, built upon the foundation of Apostles & Prophets. A channel to experience the Love of God.',
  mission:
    'To share the transformative Love of God through the power of the Holy Ghost, building believers rooted in apostolic and prophetic truth.',
  vision: 'A vibrant, Spirit-filled community experiencing and extending the Love of God to all people.',
  pastorName: '',
  address: 'A3313 Rd 3935, Mtubatuba, South Africa',
  phone: '0727641137',
  email: 'info@elchurch.site',
  memberCount: 500,
  map_embed_url: '',
  latitude: -28.3865629,
  longitude: 32.1746065,
  social_facebook: 'https://web.facebook.com/people/Eternal-Love-Church/100066667994061/?_rdc=1&_rdr#',
  social_instagram: 'https://www.instagram.com/eternal_love_church',
  social_youtube: '',
  home_gospel_verse: '"We love because He first loved us." — 1 John 4:19',
  home_footer_cta_title: 'We Love God. We Love People. We Love You.',
  serviceTimes: {
    sunday: 'Sunday 09:30 AM',
    wednesday: 'Wednesday 6:00 PM',
    friday: 'Friday 6:00 PM',
  },
}

const heroFallback = '/images/hero.jpg'
const COOKIE_STORAGE_KEY = 'elc_cookie_consent_v1'
const COOKIE_MAX_AGE_DAYS = 180

function formatDate(input) {
  if (!input) return 'Upcoming'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return 'Upcoming'
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateParts(input) {
  if (!input) return { day: '—', month: '', year: '' }
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return { day: '—', month: '', year: '' }
  return {
    day: date.toLocaleDateString('en-ZA', { day: '2-digit' }),
    month: date.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase(),
    year: date.toLocaleDateString('en-ZA', { year: 'numeric' }),
  }
}

const ease = [0.22, 1, 0.36, 1]

function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Grain overlay — adds analogue depth to any section */
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

/* Glowing gold button */
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

/* Ghost button */
function GhostButton({ children, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.05] px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.09]"
    >
      {children}
    </motion.button>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const [church, setChurch] = useState(() => ({ ...FALLBACK, ...getCachedChurchSettings() }))
  const [events, setEvents] = useState([])
  const [sermons, setSermons] = useState([])
  const [heroImage, setHeroImage] = useState(heroFallback)
  const [showCookieBanner, setShowCookieBanner] = useState(false)

  useEffect(() => {
    let ignore = false

    const handleSettingsUpdated = (event) => {
      const nextSettings = normalizeChurchSettings(event.detail || {})
      setChurch((prev) => ({
        ...prev,
        ...nextSettings,
        serviceTimes: { ...(prev.serviceTimes || {}), ...(nextSettings.serviceTimes || {}) },
      }))
    }

    window.addEventListener('church-settings-updated', handleSettingsUpdated)

    const load = async () => {
      const [settingsRes, eventsRes, sermonsRes] = await Promise.allSettled([
        settingsAPI.getPublicSettings(),
        eventsAPI.getPublicEvents(),
        sermonsAPI.getPublicSermons(),
      ])

      if (!ignore && settingsRes.status === 'fulfilled') {
        const data = settingsRes.value?.data || {}
        setChurch((prev) => ({
          ...prev,
          name: data.name || data.churchName || prev.name,
          description: data.description || prev.description,
          mission: data.mission || prev.mission,
          vision: data.vision || prev.vision,
          pastorName: data.pastorName || prev.pastorName,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          memberCount: data.memberCount || prev.memberCount,
          map_embed_url: data.map_embed_url || prev.map_embed_url,
          latitude: data.latitude ?? data.lat ?? data.location?.latitude ?? prev.latitude,
          longitude: data.longitude ?? data.lng ?? data.location?.longitude ?? prev.longitude,
          social_facebook: data.social_facebook || data.social?.facebook || prev.social_facebook,
          social_instagram: data.social_instagram || data.social?.instagram || prev.social_instagram,
          social_youtube: data.social_youtube || data.social?.youtube || prev.social_youtube,
          home_gospel_verse: data.home_gospel_verse || prev.home_gospel_verse,
          home_footer_cta_title: data.home_footer_cta_title || prev.home_footer_cta_title,
          serviceTimes: {
            sunday: data.serviceTimes?.sunday || prev.serviceTimes.sunday,
            wednesday: data.serviceTimes?.wednesday || prev.serviceTimes.wednesday,
            friday: data.serviceTimes?.friday || prev.serviceTimes.friday,
          },
        }))
      }

      if (!ignore && eventsRes.status === 'fulfilled') {
        const raw = Array.isArray(eventsRes.value)
          ? eventsRes.value
          : Array.isArray(eventsRes.value?.data) ? eventsRes.value.data : []
        const upcoming = raw
          .filter((e) => { const d = e.date || e.startDate || e.eventDate; return d && new Date(d) >= new Date(new Date().toDateString()) })
          .sort((a, b) => new Date(a.date || a.startDate || a.eventDate) - new Date(b.date || b.startDate || b.eventDate))
          .slice(0, 3)
        setEvents(upcoming)
      }

      if (!ignore && sermonsRes.status === 'fulfilled') {
        const raw = Array.isArray(sermonsRes.value) ? sermonsRes.value
          : Array.isArray(sermonsRes.value?.data) ? sermonsRes.value.data : []
        setSermons(raw.slice(0, 3))
      }

      try {
        const heroRes = await homeImagesAPI.getFeaturedBySection?.('hero')
        const images = Array.isArray(heroRes?.data) ? heroRes.data : []
        const first = images.find((x) => x.image_url || x.url || x.path)
        if (!ignore && first) setHeroImage(first.image_url || first.url || first.path)
      } catch {}
    }

    load().catch(() => {})

    return () => { ignore = true; window.removeEventListener('church-settings-updated', handleSettingsUpdated) }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_STORAGE_KEY)
      if (!raw) { setShowCookieBanner(true); return }
      const parsed = JSON.parse(raw)
      const savedAt = parsed?.timestamp ? new Date(parsed.timestamp).getTime() : 0
      if (!parsed?.status || Date.now() - savedAt > COOKIE_MAX_AGE_DAYS * 86400000) setShowCookieBanner(true)
    } catch { setShowCookieBanner(true) }
  }, [])

  const handleCookieChoice = (status) => {
    try { localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({ status, timestamp: new Date().toISOString() })) }
    catch {} finally { setShowCookieBanner(false) }
  }

  const mapUrl = useMemo(() => {
    if (church.map_embed_url) {
      const m = church.map_embed_url.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
      if (m) {
        const lat = parseFloat(m[1]); const lng = parseFloat(m[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
          return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
      }
      return church.map_embed_url
    }
    const lat = church.latitude ? parseFloat(church.latitude) : null
    const lng = church.longitude ? parseFloat(church.longitude) : null
    if (lat && lng && !isNaN(lat) && !isNaN(lng))
      return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    return `https://maps.google.com/maps?q=-28.3865629,32.1746065&z=15&output=embed`
  }, [church.map_embed_url, church.latitude, church.longitude])

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 overflow-x-hidden">
      <PublicNavigation variant="dark" />

      <main id="main-content">

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-screen overflow-hidden bg-[#050505]">
          {/* Parallax background */}
          <motion.div style={{ y: heroY }} className="absolute inset-0 scale-110">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url('${heroImage || heroFallback}')` }}
            />
          </motion.div>

          {/* Layered atmospheric overlays */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,5,0.45)_0%,rgba(5,5,5,0.6)_45%,#050505_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(109,40,217,0.32)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_70%,rgba(212,175,55,0.06)_0%,transparent_50%)]" />

          {/* Animated light leak from top-right */}
          <motion.div
            className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Grain */}
          <Grain opacity={0.04} />

          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8"
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.5em] text-[#D4AF37]"
            >
              <span className="h-px w-8 bg-[#D4AF37]/50" />
              ETERNAL LOVE CHURCH
              <span className="h-px w-8 bg-[#D4AF37]/50" />
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.12, ease }}
              className="mt-10 text-[clamp(64px,12vw,140px)] font-black leading-[0.85] tracking-tighter text-white"
            >
              <span className="block">ENCOUNTER</span>
              <span className="block" style={{ WebkitTextStroke: '1px rgba(212,175,55,0.6)', color: 'transparent' }}>
                HIS
              </span>
              <span className="block text-[#D4AF37]">PRESENCE</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28, ease }}
              className="mt-8 max-w-sm text-sm leading-7 text-zinc-400 sm:text-base"
            >
              A house where hearts are healed, faith is awakened,<br className="hidden sm:block" />
              and lives are transformed by the love of Jesus.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease }}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <GoldButton onClick={() => navigate(user ? '/dashboard' : '/register')}>
                Join The Family <ArrowRight size={16} />
              </GoldButton>
              <GhostButton onClick={() => navigate('/sermons')}>
                <Play size={16} /> Watch Sermons
              </GhostButton>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[9px] font-bold tracking-[0.4em] text-zinc-600">SCROLL</span>
                <ChevronDown size={14} className="text-zinc-600" />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── 2. SCRIPTURE BREAK ──────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#050505] px-4 py-32 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_70%)]" />
          <Grain opacity={0.025} />
          <div className="mx-auto max-w-5xl text-center">
            <FadeUp>
              <div className="flex items-center justify-center gap-6 mb-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
                <span className="text-[#D4AF37]/40 text-lg">✦</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
              </div>
              <blockquote>
                <p className="text-[clamp(36px,7vw,80px)] font-black leading-[1.0] tracking-tight text-white">
                  "WE LOVE BECAUSE<br className="hidden sm:block" /> HE FIRST<br className="hidden sm:block" /> LOVED US."
                </p>
                <cite className="mt-8 block text-[10px] font-bold not-italic tracking-[0.45em] text-[#D4AF37]">
                  — 1 JOHN 4:19
                </cite>
              </blockquote>
              <div className="flex items-center justify-center gap-6 mt-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
                <span className="text-[#D4AF37]/40 text-lg">✦</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/20 to-[#D4AF37]/40" />
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 3. ABOUT ────────────────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
            <FadeUp>
              <div className="relative h-[500px] overflow-hidden rounded-3xl bg-[#080808] lg:h-full lg:min-h-[560px]">
                {/* Atmospheric depth layers */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_35%,rgba(109,40,217,0.4)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_75%,rgba(212,175,55,0.08)_0%,transparent_50%)]" />
                <Grain opacity={0.06} />

                {/* Large watermark text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="select-none text-[9rem] font-black leading-none tracking-tighter text-white/[0.025]">
                    ELC
                  </span>
                </div>

                {/* Decorative cross lines */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="h-[1px] w-16 bg-[#D4AF37]/10" />
                  <div className="absolute left-1/2 top-1/2 h-16 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-[#D4AF37]/10" />
                </div>

                {/* Corner accent */}
                <div className="absolute top-8 right-8 h-12 w-12 rounded-full border border-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37]/30 text-xs font-black">✦</span>
                </div>

                <div className="absolute bottom-8 left-8 right-8">
                  <div className="h-px bg-gradient-to-r from-[#D4AF37]/20 to-transparent mb-5" />
                  <p className="text-[10px] font-bold tracking-[0.35em] text-[#D4AF37]/50">
                    ETERNAL LOVE CHURCH
                  </p>
                  <p className="mt-1 text-xs text-zinc-700">Mtubatuba, South Africa · Est. 2019</p>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.12} className="flex flex-col justify-center">
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">OUR STORY</p>
              <h2 className="mt-6 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">A HOUSE</span>
                <span className="block">OF LOVE</span>
                <span className="block">AND POWER</span>
              </h2>
              <div className="mt-3 h-px w-16 bg-[#D4AF37]/30" />
              <p className="mt-8 text-base leading-8 text-zinc-400">
                We exist to lead people into a transforming encounter with the presence and love of God —
                a vibrant family built on the apostolic and prophetic foundation of Scripture,
                where every soul finds belonging.
              </p>
              <div className="mt-10 flex gap-10">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-600">FOUNDED</p>
                  <p className="mt-2 text-3xl font-black text-white">2019</p>
                </div>
                <div className="border-l border-white/[0.06] pl-10">
                  <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-600">HOME</p>
                  <p className="mt-2 text-3xl font-black text-white">Mtubatuba</p>
                </div>
                <div className="border-l border-white/[0.06] pl-10">
                  <p className="text-[10px] font-bold tracking-[0.25em] text-zinc-600">HEARTS</p>
                  <p className="mt-2 text-3xl font-black text-white">500+</p>
                </div>
              </div>
              <div className="mt-10">
                <GoldButton onClick={() => navigate('/about')}>
                  Our Story <ArrowRight size={15} />
                </GoldButton>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 4. THE EXPERIENCE ───────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          {/* Full-bleed atmospheric gradient bridging sections */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.1)_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">WHAT TO EXPECT</p>
              <h2 className="mt-5 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">THE</span>
                <span className="block">EXPERIENCE</span>
              </h2>
            </FadeUp>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Music2,
                  number: '01',
                  title: 'Worship',
                  text: 'Spirit-filled encounters that usher you into the presence of God.',
                },
                {
                  icon: Heart,
                  number: '02',
                  title: 'Prayer',
                  text: 'Moments of healing, breakthrough, and divine intervention.',
                },
                {
                  icon: BookOpen,
                  number: '03',
                  title: 'Teaching',
                  text: 'Biblical truth with apostolic depth that transforms how you live.',
                },
                {
                  icon: Users,
                  number: '04',
                  title: 'Community',
                  text: 'A family where every person is known, loved, and belongs.',
                },
              ].map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.09}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3, ease }}
                    className="group relative flex h-full flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.03]"
                    style={{ '--tw-shadow': 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 60px -10px rgba(212,175,55,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <p className="text-[10px] font-black tracking-[0.3em] text-white/10 group-hover:text-[#D4AF37]/20 transition-colors">
                      {item.number}
                    </p>
                    <div className="mt-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] text-[#D4AF37] transition-all group-hover:border-[#D4AF37]/30 group-hover:bg-[#D4AF37]/[0.12]">
                      <item.icon size={19} />
                    </div>
                    <div className="mt-8 flex-1">
                      <h3 className="text-xl font-black tracking-tight text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                        {item.text}
                      </p>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. UPCOMING GATHERINGS ──────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(109,40,217,0.07)_0%,transparent_55%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp className="flex flex-wrap items-end justify-between gap-4 mb-14">
              <div>
                <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">UPCOMING</p>
                <h2 className="mt-5 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                  <span className="block">GATHERINGS</span>
                </h2>
              </div>
              <motion.button
                onClick={() => navigate('/events')}
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-[#D4AF37]"
              >
                View All <ArrowRight size={15} />
              </motion.button>
            </FadeUp>

            {events.length > 0 ? (
              <div className="space-y-5">
                {events.map((event, i) => {
                  const parts = formatDateParts(event.date || event.startDate || event.eventDate)
                  return (
                    <FadeUp key={event.id || event._id || `${event.title}-${i}`} delay={i * 0.08}>
                      <motion.div
                        whileHover={{ x: 6 }}
                        transition={{ duration: 0.3, ease }}
                        className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.015] transition-all duration-300 hover:border-[#D4AF37]/15 hover:bg-[#D4AF37]/[0.02]"
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px -10px rgba(212,175,55,0.06)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_50%,rgba(109,40,217,0.08)_0%,transparent_60%)]" />
                        <div className="relative flex flex-wrap items-center gap-6 p-6 sm:p-8 lg:gap-10">
                          {/* Dramatic date block */}
                          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-center min-w-[72px] group-hover:border-[#D4AF37]/15 transition-colors">
                            <span className="text-3xl font-black leading-none text-white">{parts.day}</span>
                            <span className="mt-1 text-[9px] font-bold tracking-[0.3em] text-[#D4AF37]">{parts.month}</span>
                            <span className="text-[9px] text-zinc-600">{parts.year}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl group-hover:text-[#D4AF37] transition-colors">
                              {event.title}
                            </h3>
                            {event.description && (
                              <p className="mt-1.5 text-sm text-zinc-500 line-clamp-1">{event.description}</p>
                            )}
                            {event.location && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
                                <MapPin size={11} /> {event.location}
                              </p>
                            )}
                          </div>

                          {/* Tag + arrow */}
                          <div className="flex items-center gap-4 ml-auto">
                            <span className="hidden rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37] sm:block">
                              {event.type || 'Gathering'}
                            </span>
                            <ArrowRight size={18} className="text-zinc-700 group-hover:text-[#D4AF37] transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    </FadeUp>
                  )
                })}
              </div>
            ) : (
              <FadeUp>
                <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.02] p-16 text-center">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(109,40,217,0.1)_0%,transparent_65%)]" />
                  <p className="relative text-[10px] font-bold tracking-[0.35em] text-zinc-600">COMING SOON</p>
                  <h3 className="relative mt-4 text-4xl font-black tracking-tight text-white">
                    NEW GATHERINGS<br />BEING PLANNED
                  </h3>
                  <p className="relative mt-3 text-sm text-zinc-600">
                    Join us — announcements will be made soon.
                  </p>
                </div>
              </FadeUp>
            )}
          </div>
        </section>

        {/* ─── 6. RECENT MESSAGES ──────────────────────────────────── */}
        <section className="relative bg-[#050505]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(109,40,217,0.09)_0%,transparent_55%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
            <FadeUp className="flex flex-wrap items-end justify-between gap-4 mb-14">
              <div>
                <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">MESSAGES</p>
                <h2 className="mt-5 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                  <span className="block">RECENT</span>
                  <span className="block">MESSAGES</span>
                </h2>
              </div>
              <motion.button
                onClick={() => navigate('/sermons')}
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-[#D4AF37]"
              >
                Full Library <ArrowRight size={15} />
              </motion.button>
            </FadeUp>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sermons.length > 0 ? (
                sermons.map((sermon, i) => (
                  <FadeUp key={sermon.id || sermon._id || `${sermon.title}-${i}`} delay={i * 0.09}>
                    <motion.button
                      onClick={() => navigate('/sermons')}
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.3, ease }}
                      className="group relative w-full overflow-hidden rounded-3xl border border-[#6D28D9]/15 bg-[#6D28D9]/[0.04] p-7 text-left transition-all duration-300 hover:border-[#6D28D9]/30"
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 60px -10px rgba(109,40,217,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(109,40,217,0.2)_0%,transparent_55%)]" />
                      <div className="relative">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#6D28D9]/25 bg-[#6D28D9]/[0.1] text-[#6D28D9] transition-all group-hover:bg-[#6D28D9]/[0.22] group-hover:scale-110">
                          <Play size={15} />
                        </div>
                        <h3 className="mt-6 text-lg font-black leading-snug tracking-tight text-white group-hover:text-[#c4b5fd] transition-colors">
                          {sermon.title || 'Latest Message'}
                        </h3>
                        <p className="mt-2 text-xs text-zinc-600">
                          {sermon.speaker || sermon.preacher || 'Pastor'} &middot; {formatDate(sermon.date)}
                        </p>
                        <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#6D28D9]/60 group-hover:text-[#6D28D9] transition-colors">
                          Listen now <ArrowRight size={12} />
                        </div>
                      </div>
                    </motion.button>
                  </FadeUp>
                ))
              ) : (
                <FadeUp className="col-span-full">
                  <div className="rounded-3xl border border-[#6D28D9]/10 bg-[#6D28D9]/[0.03] p-12 text-center">
                    <p className="text-sm text-zinc-600">Recent messages will appear here.</p>
                  </div>
                </FadeUp>
              )}
            </div>
          </div>
        </section>

        {/* ─── 7. SUPPORT THE VISION ───────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/12 px-8 py-24 text-center lg:px-20">
                {/* Background */}
                <div className="absolute inset-0 bg-[#D4AF37]/[0.015]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(109,40,217,0.1)_0%,transparent_60%)]" />
                <Grain opacity={0.03} />

                {/* Decorative top line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-[#D4AF37]/30" />

                <div className="relative">
                  <p className="text-[10px] font-bold tracking-[0.45em] text-[#D4AF37]">GENEROSITY</p>
                  <h2 className="mt-6 text-[clamp(48px,7vw,90px)] font-black leading-[0.88] tracking-tighter text-white">
                    <span className="block">SUPPORT</span>
                    <span className="block">THE VISION</span>
                  </h2>
                  <p className="mx-auto mt-6 max-w-xs text-sm leading-7 text-zinc-400">
                    Every gift reaches lives with the Gospel and extends the Kingdom of God.
                  </p>
                  <div className="mt-10">
                    <GoldButton large onClick={() => navigate('/give')}>
                      Give Online <ArrowRight size={17} />
                    </GoldButton>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 8. VISIT US ─────────────────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
            <FadeUp className="mb-14">
              <p className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37]">VISIT US</p>
              <h2 className="mt-5 text-[clamp(48px,7vw,80px)] font-black leading-[0.88] tracking-tighter text-white">
                <span className="block">THERE'S</span>
                <span className="block">A PLACE</span>
                <span className="block">FOR YOU</span>
              </h2>
            </FadeUp>

            <div className="grid gap-6 lg:grid-cols-2">
              <FadeUp>
                <div className="flex h-full flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                    Service Times
                  </p>
                  <div className="mt-7 flex-1 space-y-5">
                    {[
                      { label: 'Sunday Worship', value: church.serviceTimes?.sunday },
                      { label: 'Midweek Service', value: church.serviceTimes?.wednesday },
                      { label: 'Prayer Night', value: church.serviceTimes?.friday },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="group flex items-center justify-between border-b border-white/[0.05] pb-5 last:border-0 last:pb-0 hover:border-[#D4AF37]/10 transition-colors"
                      >
                        <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
                        <strong className="text-sm font-black text-white">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex items-start gap-3 border-t border-white/[0.05] pt-6">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-zinc-600" />
                    <p className="text-xs leading-5 text-zinc-500">{church.address}</p>
                  </div>
                  <div className="mt-5">
                    <GoldButton onClick={() => navigate('/contact')}>
                      Plan Your Visit <ArrowRight size={14} />
                    </GoldButton>
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.1}>
                <div className="h-full overflow-hidden rounded-3xl border border-white/[0.07] lg:min-h-[420px]">
                  {mapUrl ? (
                    <iframe
                      title="Eternal Love Church Map"
                      src={mapUrl}
                      className="h-full min-h-[340px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex min-h-[340px] h-full items-center justify-center p-6 text-center text-zinc-600">
                      <p className="text-sm">Map unavailable</p>
                    </div>
                  )}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── 9. FINAL CTA — YOU BELONG HERE ─────────────────────── */}
        <section className="relative overflow-hidden bg-[#050505]">
          {/* Deep atmospheric backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(109,40,217,0.28)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_65%)]" />
          <Grain opacity={0.04} />

          {/* Decorative bottom arc */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 py-40 text-center sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-[10px] font-bold tracking-[0.5em] text-zinc-600">COME AS YOU ARE</p>
              <h2 className="mt-8 text-[clamp(56px,12vw,120px)] font-black leading-[0.82] tracking-tighter text-white">
                <span className="block">YOU</span>
                <span className="block" style={{ WebkitTextStroke: '1.5px rgba(212,175,55,0.5)', color: 'transparent' }}>
                  BELONG
                </span>
                <span className="block text-[#D4AF37]">HERE</span>
              </h2>
              <p className="mx-auto mt-8 max-w-xs text-sm leading-7 text-zinc-500">
                No matter where you've been or what you've been through —<br />
                there is a seat, a family, and a purpose waiting for you.
              </p>
              <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <GoldButton large onClick={() => navigate(user ? '/dashboard' : '/register')}>
                  Join The Family <ArrowRight size={18} />
                </GoldButton>
                <motion.button
                  onClick={() => navigate('/contact')}
                  whileHover={{ scale: 1.03 }}
                  className="text-sm font-semibold text-zinc-500 transition hover:text-[#D4AF37] underline underline-offset-4"
                >
                  Plan a visit first
                </motion.button>
              </div>

              {/* Service times footer note */}
              <div className="mt-16 flex flex-wrap justify-center gap-8">
                {[
                  { label: 'Sunday', value: church.serviceTimes?.sunday?.replace('Sunday ', '') || '09:30 AM' },
                  { label: 'Wednesday', value: church.serviceTimes?.wednesday?.replace('Wednesday ', '') || '6:00 PM' },
                  { label: 'Friday', value: church.serviceTimes?.friday?.replace('Friday ', '') || '6:00 PM' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[9px] font-bold tracking-[0.35em] text-zinc-600">{label.toUpperCase()}</p>
                    <p className="mt-1 text-sm font-black text-zinc-400">{value}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        <PublicFooter />

        {/* ─── COOKIE BANNER ───────────────────────────────────────── */}
        {showCookieBanner && (
          <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-4xl -translate-x-1/2 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0f0f0f]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <ShieldCheck size={17} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Cookie Notice</p>
                  <h4 className="text-base font-bold text-white">We use cookies to serve you better</h4>
                  <p className="mt-1 text-sm text-zinc-400">
                    Essential cookies keep the site secure. We also use analytics to improve ministry resources. See our{' '}
                    <Link to="/privacy" className="font-semibold text-[#D4AF37] hover:opacity-75">Privacy Policy</Link>{' '}
                    and{' '}
                    <Link to="/terms" className="font-semibold text-[#D4AF37] hover:opacity-75">Terms</Link>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={() => handleCookieChoice('declined')}
                  className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 sm:w-auto"
                >
                  Decline non-essential
                </button>
                <button
                  onClick={() => handleCookieChoice('accepted')}
                  className="w-full rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#050505] transition hover:bg-[#c09b28] sm:w-auto"
                >
                  Accept &amp; continue
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </main>
    </div>
  )
}
