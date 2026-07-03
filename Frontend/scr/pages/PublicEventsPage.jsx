import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { eventsAPI, settingsAPI } from '../utils/api'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'

function formatDate(value) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getEventDate(event) {
  return event.date || event.startDate || event.eventDate || null
}

function formatTimeTo12Hour(time24) {
  if (!time24) return ''
  try {
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  } catch {
    return time24
  }
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

export default function PublicEventsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(null)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        const [eventsRes] = await Promise.allSettled([eventsAPI.getPublicEvents()])

        if (!ignore && eventsRes.status === 'fulfilled') {
          const raw = Array.isArray(eventsRes.value)
            ? eventsRes.value
            : Array.isArray(eventsRes.value?.data)
              ? eventsRes.value.data
              : []
          setEvents(raw)
        }
      } catch (error) {
        console.error('Failed to load public events:', error)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = []
    const past = []

    events.forEach((event) => {
      const date = getEventDate(event)
      if (!date) {
        upcoming.push(event)
        return
      }
      const eventDate = new Date(date)
      eventDate.setHours(0, 0, 0, 0)
      if (eventDate >= today) upcoming.push(event)
      else past.push(event)
    })

    upcoming.sort((a, b) => new Date(getEventDate(a) || 0) - new Date(getEventDate(b) || 0))
    past.sort((a, b) => new Date(getEventDate(b) || 0) - new Date(getEventDate(a) || 0))

    return { upcomingEvents: upcoming, pastEvents: past }
  }, [events])

  const isUserRegistered = (event) => {
    if (!event.registeredUsers || !Array.isArray(event.registeredUsers)) return false
    const userData = localStorage.getItem('user')
    if (!userData) return false
    try {
      const userObj = JSON.parse(userData)
      const userIdentifier = userObj.memberId || userObj._id || userObj.id
      return event.registeredUsers.includes(userIdentifier)
    } catch {
      return false
    }
  }

  const handleRegister = async (eventId) => {
    if (!user) {
      toast.error('Please sign in to register for events')
      navigate('/login')
      return
    }
    setRegistering(eventId)
    try {
      await eventsAPI.registerForEvent(eventId)
      toast.success('Successfully registered for event!')
      const updated = await eventsAPI.getPublicEvents()
      const raw = Array.isArray(updated)
        ? updated
        : Array.isArray(updated?.data)
          ? updated.data
          : []
      setEvents(raw)
    } catch (error) {
      console.error('Registration failed:', error)
      toast.error('Failed to register for event')
    } finally {
      setRegistering(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <PublicNavigation variant="dark" />

      <main>

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(109,40,217,0.22)_0%,transparent_70%)]" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="text-xs font-semibold tracking-[0.4em] text-[#D4AF37]"
          >
            GATHERINGS &middot; WORSHIP &middot; COMMUNITY
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease }}
            className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block">COME</span>
            <span className="block text-[#D4AF37]">GATHER</span>
            <span className="block">WITH US</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mt-8 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg"
          >
            Join us for worship encounters, prayer gatherings, conferences, and Spirit-filled moments
            at Eternal Love Church.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.38, ease }}
            className="mt-6 text-xs font-semibold tracking-[0.3em] text-zinc-600"
          >
            MTUBATUBA, SOUTH AFRICA &middot; ALL ARE WELCOME
          </motion.p>

          {user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-8"
            >
              <button
                onClick={() => navigate('/events/manage')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
              >
                <ShieldCheck size={13} />
                Manage Events
              </button>
            </motion.div>
          )}
        </section>

        {/* ─── 2. FEATURED GATHERING ───────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                FEATURED GATHERING
              </p>
            </FadeUp>

            <FadeUp delay={0.1} className="mt-8">
              <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.02] p-10 sm:p-16">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(109,40,217,0.15)_0%,transparent_65%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(212,175,55,0.07)_0%,transparent_60%)]" />
                <div className="relative">
                  <h2 className="text-7xl font-black leading-[0.85] tracking-tighter text-white sm:text-8xl lg:text-9xl">
                    EMERGE
                  </h2>
                  <h3 className="mt-4 text-xl font-bold tracking-[0.1em] text-[#D4AF37] sm:text-2xl">
                    APOSTOLIC CONFERENCE
                  </h3>
                  <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
                    An annual gathering focused on divine purpose, apostolic truth, and prophetic
                    revelation.
                  </p>
                  <button
                    onClick={() => navigate('/contact')}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                  >
                    Learn More
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 3. UPCOMING GATHERINGS ──────────────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">UPCOMING</p>
              <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                <span className="block">UPCOMING</span>
                <span className="block">GATHERINGS</span>
              </h2>
            </FadeUp>

            <div className="mt-14">
              {loading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-64 animate-pulse rounded-3xl border border-white/[0.05] bg-white/[0.02]"
                    />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingEvents.map((event, i) => {
                    const isRegistered = isUserRegistered(event)
                    const attendeesCount = event.registeredUsers?.length || 0
                    const eventId = event._id || event.id

                    return (
                      <FadeUp
                        key={eventId || `${event.title}-${getEventDate(event)}`}
                        delay={i * 0.07}
                      >
                        <article className="group flex h-full flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 transition hover:border-[#6D28D9]/20 hover:bg-[#6D28D9]/[0.03]">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              {formatDate(getEventDate(event))}
                            </p>
                            <span className="shrink-0 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07] px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                              {event.type || 'Gathering'}
                            </span>
                          </div>

                          <h2 className="mt-4 text-2xl font-black leading-snug tracking-tight text-white">
                            {event.title || 'Church Gathering'}
                          </h2>

                          {event.description && (
                            <p className="mt-3 flex-1 text-sm leading-7 text-zinc-400">
                              {event.description}
                            </p>
                          )}

                          <div className="mt-5 space-y-2 text-sm text-zinc-600">
                            {event.time && (
                              <p className="inline-flex items-center gap-2">
                                <Clock size={13} />
                                {formatTimeTo12Hour(event.time)}
                              </p>
                            )}
                            {event.location && (
                              <p className="inline-flex items-center gap-2">
                                <MapPin size={13} />
                                {event.location}
                              </p>
                            )}
                            {attendeesCount > 0 && (
                              <p className="inline-flex items-center gap-2 text-[#D4AF37]">
                                <Users size={13} />
                                {attendeesCount}{' '}
                                {attendeesCount === 1 ? 'person' : 'people'} coming
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleRegister(eventId)}
                            disabled={registering === eventId || isRegistered}
                            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                              isRegistered
                                ? 'border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400'
                                : registering === eventId
                                  ? 'cursor-not-allowed border border-white/[0.05] bg-white/[0.03] text-zinc-600'
                                  : 'bg-[#D4AF37] text-[#050505] hover:bg-[#c09b28] active:scale-95'
                            }`}
                          >
                            {isRegistered ? (
                              <>
                                <CheckCircle size={15} />
                                You&rsquo;re Coming
                              </>
                            ) : registering === eventId ? (
                              <span>Registering…</span>
                            ) : (
                              <>
                                <Calendar size={15} />
                                I&rsquo;m Coming
                              </>
                            )}
                          </button>
                        </article>
                      </FadeUp>
                    )
                  })}
                </div>
              ) : (
                <FadeUp>
                  <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] px-10 py-20 text-center">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,rgba(109,40,217,0.14)_0%,transparent_65%)]" />
                    <p className="relative text-xs font-semibold tracking-[0.35em] text-zinc-600">
                      COMING SOON
                    </p>
                    <h3 className="relative mt-6 text-4xl font-black leading-[0.95] tracking-tighter text-white sm:text-5xl">
                      <span className="block">NEW</span>
                      <span className="block">GATHERINGS</span>
                      <span className="block">ARE COMING SOON</span>
                    </h3>
                    <p className="relative mx-auto mt-5 max-w-sm text-sm leading-7 text-zinc-500">
                      Upcoming worship encounters, conferences, and ministry gatherings will be
                      announced soon.
                    </p>
                    <button
                      onClick={() => navigate('/contact')}
                      className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                    >
                      Contact The Church
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </FadeUp>
              )}
            </div>
          </div>
        </section>

        {/* ─── 4. PAST GATHERINGS (only if data exists) ────────────── */}
        {!loading && pastEvents.length > 0 && (
          <section className="bg-[#050505]">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
              <FadeUp>
                <p className="text-xs font-semibold tracking-[0.35em] text-zinc-600">PAST</p>
                <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                  <span className="block">PAST</span>
                  <span className="block">GATHERINGS</span>
                </h2>
              </FadeUp>

              <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {pastEvents.map((event, i) => {
                  const eventId = event._id || event.id
                  return (
                    <FadeUp
                      key={eventId || `${event.title}-${getEventDate(event)}`}
                      delay={i * 0.07}
                    >
                      <article className="flex h-full flex-col rounded-3xl border border-white/[0.04] bg-white/[0.01] p-7 opacity-60">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                            {formatDate(getEventDate(event))}
                          </p>
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-500">
                            {event.type || 'Gathering'}
                          </span>
                        </div>
                        <h2 className="mt-4 text-xl font-black leading-snug tracking-tight text-zinc-300">
                          {event.title || 'Church Gathering'}
                        </h2>
                        {event.description && (
                          <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600">
                            {event.description}
                          </p>
                        )}
                      </article>
                    </FadeUp>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── 5. VISITING FOR THE FIRST TIME ──────────────────────── */}
        <section className="bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="relative overflow-hidden rounded-3xl border border-[#6D28D9]/15 p-10 sm:p-14">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(109,40,217,0.1)_0%,rgba(5,5,5,0)_60%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(109,40,217,0.2)_0%,transparent_60%)]" />
                <div className="relative">
                  <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                    FIRST VISIT
                  </p>
                  <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                    <span className="block">VISITING</span>
                    <span className="block">FOR THE</span>
                    <span className="block">FIRST TIME?</span>
                  </h2>
                  <p className="mt-8 max-w-md text-base leading-7 text-zinc-400">
                    We would love to welcome you and help you feel at home at Eternal Love Church.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => navigate('/contact')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-7 py-3.5 font-semibold text-[#050505] transition hover:bg-[#c09b28]"
                    >
                      Plan Your Visit
                      <ArrowRight size={17} />
                    </button>
                    <a
                      href="https://maps.google.com/maps?q=-28.3865629,32.1746065"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
                    >
                      <MapPin size={17} />
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <PublicFooter />
      </main>
    </div>
  )
}
