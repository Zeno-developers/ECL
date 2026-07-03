// components/layout/PublicFooter.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube } from 'lucide-react'
import { getCachedChurchSettings, normalizeChurchSettings } from '../../utils/churchSettings'

const FALLBACK = {
  name: 'Eternal Love Church',
  social_facebook: 'https://web.facebook.com/people/Eternal-Love-Church/100066667994061/',
  social_instagram: 'https://www.instagram.com/eternal_love_church',
  social_youtube: '',
}

const EXPLORE = [
  { label: 'About', href: '/about' },
  { label: 'Sermons', href: '/sermons' },
  { label: 'Events', href: '/events' },
  { label: 'Contact', href: '/contact' },
  { label: 'Careers', href: '/careers' },
]

const RESOURCES = [
  { label: 'Daily Bible', href: '/bible' },
  { label: 'Blog', href: '/blog' },
  { label: 'Gallery', href: '/resources/gallery' },
  { label: 'Online Giving', href: '/give' },
  { label: 'Support', href: '/support' },
  { label: 'Portal', href: '/login' },
]

const LEGAL = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

export default function PublicFooter() {
  const [settings, setSettings] = useState(() => ({
    ...FALLBACK,
    ...getCachedChurchSettings(),
  }))

  useEffect(() => {
    const handler = (e) => {
      setSettings(prev => ({ ...FALLBACK, ...prev, ...normalizeChurchSettings(e.detail || {}) }))
    }
    window.addEventListener('church-settings-updated', handler)
    return () => window.removeEventListener('church-settings-updated', handler)
  }, [])

  const fb = settings.social_facebook
  const ig = settings.social_instagram
  const yt = settings.social_youtube

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.04] bg-[#050505]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.09)_0%,transparent_55%)]" />

      {/* Columns */}
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 xl:gap-16">

          {/* Column 1 — Identity */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="mb-6 inline-flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="Eternal Love Church"
                className="h-9 w-9 object-contain"
              />
              <p className="text-[11px] font-bold tracking-[0.22em] text-white">
                ETERNAL LOVE CHURCH
              </p>
            </Link>
            <p className="mt-6 max-w-[260px] text-sm leading-[1.85] text-zinc-600">
              A Spirit-filled church rooted in the love and power of God. Encounter God. Walk in purpose.
            </p>

            {/* Social icons */}
            {(fb || ig || yt) && (
              <div className="mt-8 flex items-center gap-3">
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-600 transition duration-200 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                  >
                    <Facebook size={13} />
                  </a>
                )}
                {ig && (
                  <a
                    href={ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-600 transition duration-200 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                  >
                    <Instagram size={13} />
                  </a>
                )}
                {yt && (
                  <a
                    href={yt}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-600 transition duration-200 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                  >
                    <Youtube size={13} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Column 2 — Explore */}
          <div>
            <p className="mb-7 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">
              EXPLORE
            </p>
            <ul className="space-y-4">
              {EXPLORE.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-500 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Resources */}
          <div>
            <p className="mb-7 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">
              RESOURCES
            </p>
            <ul className="space-y-4">
              {RESOURCES.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-500 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <p className="mb-7 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">
              LEGAL
            </p>
            <ul className="space-y-4">
              {LEGAL.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-500 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-[11px] tracking-[0.08em] text-zinc-700">
              © {new Date().getFullYear()} Eternal Love Church. All rights reserved.
            </p>
            <p className="text-[11px] tracking-[0.08em] text-zinc-700">
              Systems developed by Yamukelani Ntimbane at <a href="https://zenolaunch.co.za" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Zenolaunch
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
