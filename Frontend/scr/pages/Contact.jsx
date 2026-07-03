import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { toast } from 'react-toastify'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { contactAPI, settingsAPI } from '../utils/api'

const CHURCH_FALLBACK = {
  address: 'A3313 Rd 3935, Nkodibe, Mtubatuba, 3935, South Africa',
  phone: '0727641137',
  email: 'info@elchurch.site',
  social_facebook: 'https://web.facebook.com/people/Eternal-Love-Church/100066667994061/?_rdc=1&_rdr#',
  social_instagram: 'https://www.instagram.com/eternal_love_church',
  social_youtube: '',
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

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-700 transition focus:border-[#D4AF37]/30 focus:outline-none'

const labelClass =
  'mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [settings, setSettings] = useState(CHURCH_FALLBACK)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.getPublicSettings()
        const data = response?.data || {}
        setSettings({
          address: data.address || CHURCH_FALLBACK.address,
          phone: data.phone || CHURCH_FALLBACK.phone,
          email: data.email || CHURCH_FALLBACK.email,
          social_facebook: data.social_facebook || data.social?.facebook || CHURCH_FALLBACK.social_facebook,
          social_instagram: data.social_instagram || data.social?.instagram || CHURCH_FALLBACK.social_instagram,
          social_youtube: data.social_youtube || data.social?.youtube || CHURCH_FALLBACK.social_youtube,
        })
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await contactAPI.submitContact({ ...formData, contactMethod: 'email' })
      toast.success("Message sent. We'll be in touch soon.")
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      console.error('Contact error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <PublicNavigation variant="dark" />

      <main>

        {/* ─── 1. HERO ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(109,40,217,0.2)_0%,transparent_70%)]" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="text-xs font-semibold tracking-[0.4em] text-[#D4AF37]"
          >
            CONTACT &middot; VISIT &middot; CONNECT
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease }}
            className="mt-8 text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block">WE'D LOVE</span>
            <span className="block text-[#D4AF37]">TO HEAR</span>
            <span className="block">FROM YOU</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mt-8 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg"
          >
            Whether you need prayer, guidance, directions, or simply want to connect — our doors
            and hearts are open to you.
          </motion.p>
        </section>

        {/* ─── 2. CONTACT DETAILS ──────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Phone,
                  label: 'PHONE',
                  value: settings.phone,
                  sub: 'Call or WhatsApp',
                  href: `tel:${settings.phone}`,
                },
                {
                  icon: Mail,
                  label: 'EMAIL',
                  value: settings.email,
                  sub: null,
                  href: `mailto:${settings.email}`,
                },
                {
                  icon: MapPin,
                  label: 'LOCATION',
                  value: 'Mtubatuba, KwaZulu-Natal',
                  sub: 'South Africa',
                  href: 'https://maps.google.com/maps?q=-28.383120,32.173590',
                },
              ].map((item, i) => (
                <FadeUp key={item.label} delay={i * 0.08}>
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="group flex h-full flex-col gap-5 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 transition hover:border-[#D4AF37]/15 hover:bg-[#D4AF37]/[0.02]"
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] text-[#D4AF37]">
                      <item.icon size={19} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-[0.25em] text-zinc-600">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-base font-bold text-white">{item.value}</p>
                      {item.sub && (
                        <p className="mt-0.5 text-xs text-zinc-600">{item.sub}</p>
                      )}
                    </div>
                  </a>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. SEND A MESSAGE ───────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <FadeUp>
                <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                  GET IN TOUCH
                </p>
                <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                  <span className="block">SEND</span>
                  <span className="block">A MESSAGE</span>
                </h2>
              </FadeUp>

              <FadeUp delay={0.1} className="mt-10">
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm sm:p-10">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.08)_0%,transparent_65%)]" />
                  <form onSubmit={handleSubmit} className="relative space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Your name"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="your@email.com"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="How can we help?"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Message</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Share what's on your heart..."
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-[#D4AF37] py-4 font-semibold text-[#050505] transition hover:bg-[#c09b28] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? 'Sending…' : 'Send Message'}
                    </button>
                  </form>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── 4. COME WORSHIP WITH US ─────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">VISIT US</p>
              <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                <span className="block">COME</span>
                <span className="block">WORSHIP</span>
                <span className="block">WITH US</span>
              </h2>
              <p className="mt-7 max-w-md text-base leading-7 text-zinc-400">
                Join us for Spirit-filled worship, prayer, and encounters with the love and
                presence of God.
              </p>
            </FadeUp>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <FadeUp>
                <div className="flex h-full flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Service Times
                  </p>
                  <div className="mt-7 flex-1 space-y-6">
                    {[
                      { day: 'SUNDAY', time: '09:30 AM', label: 'Main Worship Service' },
                      { day: 'WEDNESDAY', time: '6:00 PM', label: 'Holy Ghost Service' },
                      { day: 'FRIDAY', time: '6:00 PM', label: 'Prayer Night' },
                    ].map(({ day, time, label }) => (
                      <div
                        key={day}
                        className="flex items-center justify-between border-b border-white/[0.05] pb-6 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-600">
                            {day}
                          </p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-white">
                            {time}
                          </p>
                        </div>
                        <p className="text-sm text-zinc-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-7 flex items-start gap-3 border-t border-white/[0.05] pt-6">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-zinc-600" />
                    <p className="text-xs leading-5 text-zinc-500">{settings.address}</p>
                  </div>
                  <a
                    href="https://maps.google.com/maps?q=-28.383120,32.173590"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
                  >
                    Get Directions
                  </a>
                </div>
              </FadeUp>

              <FadeUp delay={0.1}>
                <div className="h-full overflow-hidden rounded-3xl border border-white/[0.07] lg:min-h-[440px]">
                  <iframe
                    title="Eternal Love Church Location"
                    src="https://maps.google.com/maps?q=-28.383120,32.173590&z=15&output=embed"
                    className="h-full min-h-[340px] w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── 5. STAY CONNECTED ───────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-[#050505]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.02] px-8 py-20 text-center lg:px-20">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.07)_0%,transparent_65%)]" />
              <FadeUp className="relative">
                <p className="text-xs font-semibold tracking-[0.35em] text-[#D4AF37]">
                  SOCIAL MEDIA
                </p>
                <h2 className="mt-6 text-5xl font-black leading-[0.92] tracking-tighter text-white lg:text-6xl">
                  <span className="block">STAY</span>
                  <span className="block">CONNECTED</span>
                </h2>
                <p className="mx-auto mt-6 max-w-sm text-base leading-7 text-zinc-400">
                  Follow Eternal Love Church for ministry updates, teachings, and encouragement.
                </p>
                <div className="mt-10 flex items-center justify-center gap-4">
                  {settings.social_facebook && (
                    <a
                      href={settings.social_facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] text-zinc-500 transition hover:border-[#D4AF37]/25 hover:text-[#D4AF37]"
                    >
                      <Facebook size={22} />
                    </a>
                  )}
                  {settings.social_instagram && (
                    <a
                      href={settings.social_instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] text-zinc-500 transition hover:border-[#D4AF37]/25 hover:text-[#D4AF37]"
                    >
                      <Instagram size={22} />
                    </a>
                  )}
                  {settings.social_youtube && (
                    <a
                      href={settings.social_youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] text-zinc-500 transition hover:border-[#D4AF37]/25 hover:text-[#D4AF37]"
                    >
                      <Youtube size={22} />
                    </a>
                  )}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        <PublicFooter />

      </main>
    </div>
  )
}
