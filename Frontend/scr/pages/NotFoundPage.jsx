import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PublicNavigation from '../components/layout/PublicNavigation'
import PublicFooter from '../components/layout/PublicFooter'

const ease = [0.22, 1, 0.36, 1]

const LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'ABOUT', href: '/about' },
  { label: 'SERMONS', href: '/sermons' },
  { label: 'EVENTS', href: '/events' },
  { label: 'GIVE', href: '/give' },
  { label: 'CONTACT', href: '/contact' },
]

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 overflow-x-hidden">
      <PublicNavigation variant="dark" />

      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-32 pb-24 text-center sm:px-6 lg:px-8">
        {/* Atmospheric overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(109,40,217,0.18)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(212,175,55,0.03)_0%,transparent_55%)]" />

        {/* Grain */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '180px',
            mixBlendMode: 'overlay',
          }}
        />

        <div className="relative z-20 w-full max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.5em] text-[#D4AF37]"
          >
            <span className="h-px w-8 bg-[#D4AF37]/50" />
            404
            <span className="h-px w-8 bg-[#D4AF37]/50" />
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="mt-8 text-[clamp(72px,14vw,160px)] font-black leading-[0.85] tracking-tighter text-white"
          >
            <span className="block">PAGE</span>
            <span className="block" style={{ WebkitTextStroke: '1.5px rgba(212,175,55,0.45)', color: 'transparent' }}>
              NOT
            </span>
            <span className="block text-[#D4AF37]">FOUND</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24, ease }}
            className="mx-auto mt-8 max-w-xs text-sm leading-7 text-zinc-500"
          >
            The page you're looking for doesn't exist or may have moved.
            Let us help you find your way back.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.34, ease }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.05] px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.09]"
            >
              <ArrowLeft size={15} /> Go Back
            </motion.button>

            <motion.button
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#D4AF37] px-8 py-4 text-sm font-semibold text-[#050505] transition-all"
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px 4px rgba(212,175,55,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full skew-x-12" />
              Go Home <ArrowRight size={15} />
            </motion.button>
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            className="mt-20"
          >
            <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-700">EXPLORE</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {LINKS.map(({ label, href }) => (
                <motion.button
                  key={href}
                  onClick={() => navigate(href)}
                  whileHover={{ scale: 1.04 }}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-5 py-2 text-[10px] font-bold tracking-[0.2em] text-zinc-500 transition hover:border-[#D4AF37]/20 hover:text-zinc-300"
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
