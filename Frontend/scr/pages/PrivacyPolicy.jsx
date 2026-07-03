import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Mail, Phone, MapPin, Heart, Calendar, Users, FileText } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'
import { settingsAPI } from '../utils/api'

const ease = [0.22, 1, 0.36, 1]

const FALLBACK = {
  name: 'Eternal Love Church',
  email: 'info@elchurch.site',
  phone: '0727641137',
  address: 'A3313 Rd 3935, Nkodibe, Mtubatuba, 3935, South Africa',
  pastor: 'Apostle Vangeli Sibisi & Prophetess Nokwanda Sibisi',
  foundingDate: '7 July 2019',
  tagline: 'We love God and love people',
  coreBeliefs: "Love is the foundation for all spiritual gifts. A Christian's identity is shaped by love — not by talents or abilities.",
  conference: 'Emerge Apostolic Conference',
}

function Section({ n, title, children }) {
  return (
    <div className="border-t border-white/[0.06] pt-8">
      <p className="mb-1 text-[9px] font-bold tracking-[0.26em] text-[#D4AF37]/60">SECTION {n}</p>
      <h2 className="text-xl font-black tracking-tighter text-white">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </div>
  )
}

export default function PrivacyPolicy() {
  const [church, setChurch] = useState(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsAPI.getPublicSettings()
      .then((res) => {
        const d = res?.data || res || {}
        setChurch({
          name: d.churchName || FALLBACK.name,
          email: d.email || FALLBACK.email,
          phone: d.phone || FALLBACK.phone,
          address: d.address || FALLBACK.address,
          pastor: d.pastorName || FALLBACK.pastor,
          foundingDate: d.foundingDate || FALLBACK.foundingDate,
          tagline: d.tagline || FALLBACK.tagline,
          coreBeliefs: d.coreBeliefs || FALLBACK.coreBeliefs,
          conference: d.annualConference || FALLBACK.conference,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#D4AF37]" />
      </div>
    )
  }

  const effectiveDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(109,40,217,0.12)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(109,40,217,0.07)_0%,transparent_50%)]" />
      </div>

      <div className="relative z-10">
        <PublicNavigation variant="dark" />

        <main className="mx-auto max-w-3xl px-5 sm:px-8 pt-28 pb-16 space-y-10">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06]">
              <Shield size={24} className="text-[#D4AF37]" />
            </div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.3em] text-[#D4AF37]/70">LEGAL</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">PRIVACY<br />POLICY</h1>
            <p className="mt-4 text-sm text-zinc-500 max-w-md mx-auto">
              How we protect and use your information at {church.name}.
            </p>
          </motion.div>

          {/* Church info card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="rounded-2xl border border-[#D4AF37]/[0.15] bg-[#D4AF37]/[0.03] p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold tracking-[0.26em] text-[#D4AF37]/60 mb-1">ORGANISATION</p>
                <h2 className="text-lg font-black tracking-tighter text-white">{church.name}</h2>
                <p className="text-xs text-zinc-500 mt-1 italic">"{church.tagline}"</p>
                <p className="text-[10px] text-zinc-600 mt-1">Founded {church.foundingDate}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">LEADERSHIP</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-[200px] sm:ml-auto">{church.pastor}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-start gap-2">
              <Heart size={12} className="shrink-0 text-[#D4AF37]/50 mt-0.5" />
              <p className="text-[11px] text-zinc-500 italic">{church.coreBeliefs}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Phone, label: 'Phone', value: church.phone },
                { icon: Mail, label: 'Email', value: church.email },
                { icon: MapPin, label: 'Location', value: 'Mtubatuba, KwaZulu-Natal' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={11} className="shrink-0 text-[#D4AF37]/50 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-600">{label.toUpperCase()}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Effective date */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5"
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={13} className="text-[#D4AF37]/60" />
              <span className="text-xs text-zinc-400">Effective {effectiveDate}</span>
            </div>
            <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3 py-1 text-[9px] font-bold tracking-[0.18em] text-[#D4AF37]/80">
              POPIA COMPLIANT
            </span>
          </motion.div>

          {/* Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 sm:px-8 py-8 space-y-8"
          >
            <Section n="1" title="Introduction">
              <p>
                <span className="text-zinc-200 font-medium">{church.name}</span> is a dynamic, vibrant church of the Holy Ghost, built upon the foundation of apostles and prophets. We are committed to protecting your privacy and ensuring the security of your personal information.
              </p>
              <p>
                As a church community that {church.tagline.toLowerCase()}, we value transparency and want you to feel confident about how we handle your personal data. This policy complies with the Protection of Personal Information Act (POPIA) of South Africa.
              </p>
            </Section>

            <Section n="2" title="Information We Collect">
              <p>We may collect the following categories of personal information:</p>
              <ul className="ml-4 space-y-1.5 list-disc list-inside marker:text-[#D4AF37]/40">
                <li><span className="text-zinc-300">Contact Information:</span> Name, email address, phone number</li>
                <li><span className="text-zinc-300">Demographic Information:</span> Location, age (if provided)</li>
                <li><span className="text-zinc-300">Spiritual Information:</span> Prayer requests, ministry interests</li>
                <li><span className="text-zinc-300">Communication Records:</span> Messages, feedback, and enquiries</li>
                <li><span className="text-zinc-300">Event Registration:</span> Information for {church.conference} and other church events</li>
              </ul>
            </Section>

            <Section n="3" title="How We Use Your Information">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.03] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-[#D4AF37]/60 mb-2">MINISTRY PURPOSES</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    {[
                      'Prayer support and follow-up',
                      `Event registration for ${church.conference}`,
                      `Pastoral care from ${church.pastor}`,
                      'Ministry opportunity matching',
                    ].map(i => <li key={i}>• {i}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-600 mb-2">OPERATIONAL PURPOSES</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    {[
                      'Website functionality and improvement',
                      'Communication and notifications',
                      'Analytics and service enhancement',
                      'Legal compliance and security',
                    ].map(i => <li key={i}>• {i}</li>)}
                  </ul>
                </div>
              </div>
            </Section>

            <Section n="4" title="Data Sharing and Disclosure">
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-600 mb-2">WHEN WE SHARE INFORMATION</p>
                <ul className="space-y-1.5 text-xs text-zinc-500">
                  <li>• With your explicit consent for specific purposes</li>
                  <li>• With church leaders, including {church.pastor}, for pastoral care</li>
                  <li>• With service providers who assist our operations (under strict confidentiality)</li>
                  <li>• When required by law or to protect our rights and safety</li>
                </ul>
              </div>
            </Section>

            <Section n="5" title="Your Rights (POPIA)">
              <p>Under South Africa's Protection of Personal Information Act (POPIA), you have the right to:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/70 mb-2">ACCESS &amp; CONTROL</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>• Access your personal information</li>
                    <li>• Correct inaccurate data</li>
                    <li>• Request deletion of your data</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/70 mb-2">OBJECTIONS &amp; COMPLAINTS</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>• Object to processing</li>
                    <li>• Withdraw consent</li>
                    <li>• Lodge complaints with the Information Regulator of South Africa</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section n="6" title="Contact Us">
              <p>If you have any questions or concerns regarding this Privacy Policy or how we handle your personal information, please contact our Information Officers:</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Mail, label: 'Email', value: church.email },
                  { icon: Phone, label: 'Phone', value: church.phone },
                  { icon: MapPin, label: 'Address', value: church.address },
                  { icon: Users, label: 'Information Officers', value: church.pastor },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <Icon size={13} className="shrink-0 text-[#D4AF37]/50 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-600">{label.toUpperCase()}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>

          {/* Footer nav */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/"
              className="w-full sm:w-auto rounded-full bg-[#D4AF37] px-7 py-3.5 text-center text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90"
            >
              BACK TO HOME
            </Link>
            <Link
              to="/terms"
              className="w-full sm:w-auto rounded-full border border-white/[0.08] px-7 py-3.5 text-center text-xs font-semibold tracking-[0.18em] text-zinc-400 transition hover:border-white/[0.14] hover:text-zinc-200"
            >
              <FileText size={12} className="inline mr-2 -mt-0.5" />
              VIEW TERMS OF SERVICE
            </Link>
          </motion.div>

        </main>

        <PublicFooter />
      </div>
    </div>
  )
}
