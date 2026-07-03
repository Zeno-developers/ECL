import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Shield, Mail, Phone, MapPin, Heart, Calendar, Users } from 'lucide-react'
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

export default function TermsOfService() {
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
              <FileText size={24} className="text-[#D4AF37]" />
            </div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.3em] text-[#D4AF37]/70">LEGAL</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">TERMS OF<br />SERVICE</h1>
            <p className="mt-4 text-sm text-zinc-500 max-w-md mx-auto">
              Governing your use of {church.name}'s website and services.
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
              EFFECTIVE IMMEDIATELY
            </span>
          </motion.div>

          {/* Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 sm:px-8 py-8 space-y-8"
          >
            <Section n="1" title="Acceptance of Terms">
              <p>
                By accessing or using the website of <span className="text-zinc-200 font-medium">{church.name}</span>, you agree to be bound by these Terms of Service. {church.name} is a dynamic, vibrant church of the Holy Ghost, built upon the foundation of apostles and prophets, and we ask that all users respect our community values.
              </p>
              <p>
                If you do not agree to these terms, please do not use our website or services. We reserve the right to update these terms at any time without prior notice.
              </p>
            </Section>

            <Section n="2" title="Our Church Community">
              <p>
                <span className="text-zinc-200 font-medium">{church.name}</span> was founded on {church.foundingDate} and is led by {church.pastor}. As a Spirit-filled, prophetic ministry, we are committed to:
              </p>
              <ul className="ml-4 space-y-1.5 list-disc list-inside marker:text-[#D4AF37]/40">
                <li>Experiencing and sharing the love of God</li>
                <li>Building lives on the foundation of apostles and prophets</li>
                <li>Teaching that love is the foundation for all spiritual gifts</li>
                <li>Shaping Christian identity by love — not by talents or abilities</li>
              </ul>
              <p className="italic text-[#D4AF37]/70">"{church.tagline}"</p>
            </Section>

            <Section n="3" title="Use of Website">
              <p>You agree to use our website only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the website.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-red-400/70 mb-2">PROHIBITED</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    {['Harassing or abusive behaviour', 'Posting false or misleading information', 'Attempting to hack or disrupt services', 'Impersonating church leadership'].map(i => <li key={i}>• {i}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/70 mb-2">PERMITTED</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    {['Accessing sermon content and resources', `Registering for ${church.conference}`, 'Submitting prayer requests', 'Contacting church leadership'].map(i => <li key={i}>• {i}</li>)}
                  </ul>
                </div>
              </div>
            </Section>

            <Section n="4" title="Intellectual Property">
              <p>
                All content on this website — including sermons, logos, graphics, and written materials — is the property of {church.name} unless otherwise stated. You may not reproduce, distribute, or modify any content without our explicit written consent.
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-300 font-medium">Note: </span>{church.name} respects the intellectual property rights of others and expects users to do the same.
                </p>
              </div>
            </Section>

            <Section n="5" title="Donations and Offerings">
              <p>
                All donations and offerings made to {church.name} are voluntary and non-refundable. We use these funds to support our ministry, community outreach, and annual events such as the <span className="text-zinc-200 font-medium">{church.conference}</span>.
              </p>
              <p>
                If you believe an error has been made regarding your donation, please contact us at <span className="text-[#D4AF37]/80">{church.email}</span>.
              </p>
            </Section>

            <Section n="6" title="Event Registration">
              <p>
                When you register for church events, including the annual <span className="text-zinc-200 font-medium">{church.conference}</span>, you agree to provide accurate and complete information. We reserve the right to cancel registrations that violate our community standards.
              </p>
              <div className="rounded-xl border border-[#D4AF37]/10 bg-[#D4AF37]/[0.03] p-4">
                <p className="text-[9px] font-bold tracking-[0.2em] text-[#D4AF37]/60 mb-1.5">ANNUAL CONFERENCE</p>
                <p className="text-xs text-zinc-500">Annual conference focusing on emerging and manifesting one's divine purpose through faith and prophetic revelation. Contact <span className="text-zinc-400">{church.email}</span> for details.</p>
              </div>
            </Section>

            <Section n="7" title="User-Generated Content">
              <p>
                By submitting prayer requests, comments, or other content to our website, you grant {church.name} a non-exclusive, royalty-free licence to use, reproduce, and share that content for ministry purposes. You retain ownership of your content.
              </p>
              <p>
                We reserve the right to remove any content that violates these terms or our core belief that <span className="text-zinc-300 font-medium">love is the foundation for all spiritual gifts</span>.
              </p>
            </Section>

            <Section n="8" title="Third-Party Links">
              <p>
                Our website may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of these external sites. Access them at your own risk.
              </p>
            </Section>

            <Section n="9" title="Limitation of Liability">
              <p>
                To the fullest extent permitted by law, {church.name} shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or services. Our total liability shall not exceed the amount you have paid us, if any.
              </p>
            </Section>

            <Section n="10" title="Indemnification">
              <p>
                You agree to indemnify and hold harmless {church.name}, its leadership ({church.pastor}), staff, and volunteers from any claims, damages, or expenses arising from your violation of these Terms of Service.
              </p>
            </Section>

            <Section n="11" title="Governing Law">
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of KwaZulu-Natal.
              </p>
            </Section>

            <Section n="12" title="Contact Us">
              <p>If you have any questions or concerns regarding these Terms of Service, please contact our leadership team:</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Mail, label: 'Email', value: church.email },
                  { icon: Phone, label: 'Phone', value: church.phone },
                  { icon: MapPin, label: 'Address', value: church.address },
                  { icon: Users, label: 'Leadership', value: church.pastor },
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
              to="/privacy"
              className="w-full sm:w-auto rounded-full border border-white/[0.08] px-7 py-3.5 text-center text-xs font-semibold tracking-[0.18em] text-zinc-400 transition hover:border-white/[0.14] hover:text-zinc-200"
            >
              <Shield size={12} className="inline mr-2 -mt-0.5" />
              VIEW PRIVACY POLICY
            </Link>
          </motion.div>

        </main>

        <PublicFooter />
      </div>
    </div>
  )
}
