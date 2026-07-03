import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, LayoutDashboard, LogIn, LogOut, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getCachedChurchSettings, normalizeChurchSettings } from '../../utils/churchSettings'
import SearchModal from '../../components/SearchModal'

const ease = [0.22, 1, 0.36, 1]

// Primary desktop links — restrained, five only
const PRIMARY_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'ABOUT', href: '/about' },
  { label: 'SERMONS', href: '/sermons' },
  { label: 'EVENTS', href: '/events' },
  { label: 'CONTACT', href: '/contact' },
]

// Full overlay links — includes secondary pages
const OVERLAY_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'ABOUT', href: '/about' },
  { label: 'SERMONS', href: '/sermons' },
  { label: 'EVENTS', href: '/events' },
  { label: 'CONTACT', href: '/contact' },
  { label: 'BLOG', href: '/blog' },
  { label: 'SCRIPTURE', href: '/bible' },
  { label: 'SUPPORT', href: '/support' },
  { label: 'CAREERS', href: '/careers' },
]

const PublicNavigation = ({ variant = 'light' }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [churchSettings, setChurchSettings] = useState(() => getCachedChurchSettings())
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleSettingsUpdated = (e) => {
      setChurchSettings(normalizeChurchSettings(e.detail || {}))
    }
    window.addEventListener('church-settings-updated', handleSettingsUpdated)
    return () => window.removeEventListener('church-settings-updated', handleSettingsUpdated)
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close overlay on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Scroll visibility control
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Determine direction and visibility
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        // Scrolling down past threshold -> hide
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY.current || currentScrollY <= 10) {
        // Scrolling up OR near top -> show
        setIsVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try { await logout() } catch {}
    setOpen(false)
  }

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const isDark = variant === 'dark'

  // ── Styling tokens ─────────────────────────────────────────────────────────
  const navBg = isDark
    ? 'bg-black/30 border-white/[0.06]'
    : 'bg-white/[0.88] border-black/[0.06]'

  const logoName = isDark ? 'text-white' : 'text-zinc-900'
  const logoSub = isDark ? 'text-zinc-600' : 'text-zinc-500'

  const linkBase = 'text-[11px] font-semibold tracking-[0.18em] transition-colors duration-200'
  const linkActive = isDark ? 'text-[#D4AF37]' : 'text-zinc-900'
  const linkIdle = isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'

  const iconColor = isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'

  return (
    <>
      {/* ── NAV BAR ─────────────────────────────────────────────────────────── */}
      <motion.header
        animate={{ y: isVisible ? 0 : '-100%' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed left-0 right-0 top-0 z-50 w-full border-b backdrop-blur-[24px] ${navBg}`}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-5 sm:py-6">

            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 flex-shrink-0">
              <img
                src="/images/logo.png"
                alt="Eternal Love Church"
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              />
              <div>
                <p className={`text-[11px] font-bold tracking-[0.22em] ${logoName}`}>
                  {churchSettings.name || 'ETERNAL LOVE CHURCH'}
                </p>
              </div>
            </Link>

            {/* Desktop nav — 5 links, minimal */}
            <nav className="hidden items-center gap-8 md:flex">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`${linkBase} ${isActive(link.href) ? linkActive : linkIdle}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop right — search + portal icon + CTA */}
            <div className="hidden items-center gap-4 md:flex">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search (⌘K)"
                className={`transition-colors duration-200 ${iconColor}`}
              >
                <Search size={16} strokeWidth={1.75} />
              </button>

              {user ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    aria-label="Go to dashboard"
                    title="My Dashboard"
                    className={`transition-colors duration-200 ${iconColor}`}
                  >
                    <LayoutDashboard size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={handleLogout}
                    aria-label="Log out"
                    title="Log out"
                    className={`transition-colors duration-200 ${iconColor}`}
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    aria-label="Member portal"
                    title="Member portal"
                    className={`transition-colors duration-200 ${iconColor}`}
                  >
                    <LogIn size={16} strokeWidth={1.75} />
                  </Link>
                  <Link
                    to="/contact"
                    className="group relative rounded-full border border-[#D4AF37]/50 px-6 py-2.5 text-[10px] font-bold tracking-[0.2em] text-[#D4AF37] transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_18px_rgba(212,175,55,0.25)]"
                  >
                    VISIT US
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile — search + portal + menu */}
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className={`transition-colors ${iconColor}`}
              >
                <Search size={16} strokeWidth={1.75} />
              </button>
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  aria-label="Dashboard"
                  className={`transition-colors ${iconColor}`}
                >
                  <LayoutDashboard size={16} strokeWidth={1.75} />
                </button>
              ) : (
                <Link
                  to="/login"
                  aria-label="Member portal"
                  className={`transition-colors ${iconColor}`}
                >
                  <LogIn size={16} strokeWidth={1.75} />
                </Link>
              )}
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className={`transition-colors ${iconColor}`}
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
            </div>

          </div>
        </div>
      </motion.header>

      {/* ── FULLSCREEN OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#050505]"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-5 sm:px-8">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-3"
              >
                <img src="/images/logo.png" alt="Eternal Love Church" className="h-9 w-9 object-contain" />
                <p className="text-[11px] font-bold tracking-[0.22em] text-white">
                  {churchSettings.name || 'ETERNAL LOVE CHURCH'}
                </p>
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-zinc-500 transition-colors hover:text-white"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Links — editorial fullscreen */}
            <div className="flex flex-1 flex-col justify-center px-8 sm:px-12">
              {OVERLAY_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.055, duration: 0.5, ease }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className={`block py-3 text-5xl font-black leading-none tracking-tighter transition-colors duration-200 sm:text-6xl ${
                      isActive(link.href)
                        ? 'text-[#D4AF37]'
                        : 'text-white hover:text-zinc-500'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Bottom bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="border-t border-white/[0.06] px-8 py-8 sm:px-12"
            >
              {user ? (
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => { navigate('/dashboard'); setOpen(false) }}
                    className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-zinc-400 transition-colors hover:text-white"
                  >
                    <LayoutDashboard size={14} />
                    DASHBOARD
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-zinc-600 transition-colors hover:text-white"
                  >
                    <LogOut size={14} />
                    LOGOUT
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-[#D4AF37]/50 px-8 py-3 text-[10px] font-bold tracking-[0.2em] text-[#D4AF37] transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.3)]"
                  >
                    VISIT US
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold tracking-[0.18em] text-zinc-600 transition-colors hover:text-white"
                  >
                    SIGN IN
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

export default PublicNavigation