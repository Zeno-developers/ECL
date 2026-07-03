// pages/Login.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import PasswordChangeModal from '../components/PasswordChangeModal'
import { getRoleDashboardPath } from '../utils/roleRouting'

const ease = [0.22, 1, 0.36, 1]

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-700 transition duration-200 focus:border-[#D4AF37]/40 focus:outline-none focus:bg-white/[0.06]'

const labelClass =
  'mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600'

const REMEMBER_LOGIN_KEY = 'elchurch_remember_login'

export default function Login() {
  const { login, user, requiresPasswordChange } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userId = user?.id ?? user?._id ?? null

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)

  useEffect(() => {
    try {
      const rememberedIdentifier = localStorage.getItem(REMEMBER_LOGIN_KEY)
      if (rememberedIdentifier) {
        setRememberMe(true)
        setFormData(prev => ({ ...prev, identifier: rememberedIdentifier }))
      }
    } catch {
      // Storage can be unavailable in private browsing or locked-down browsers.
    }
  }, [])

  useEffect(() => {
    if (userId && !requiresPasswordChange) {
      const targetPath = getRoleDashboardPath(user.role)
      if (location.pathname !== targetPath) navigate(targetPath, { replace: true })
    }
  }, [userId, user?.role, requiresPasswordChange, navigate, location.pathname])

  useEffect(() => {
    if (requiresPasswordChange && userId) {
      setPendingUser(user)
      setShowPasswordModal(true)
    }
  }, [requiresPasswordChange, userId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.identifier || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const result = await login(formData.identifier, formData.password)
      if (result.success) {
        try {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_LOGIN_KEY, formData.identifier.trim())
          } else {
            localStorage.removeItem(REMEMBER_LOGIN_KEY)
          }
        } catch {}

        if (result.requiresPasswordChange) {
          setPendingUser(result.user)
          setShowPasswordModal(true)
          toast.info('Please set a new password to continue')
        } else if (result.offline) {
          toast.info('Signed in offline. Some features will sync when the connection returns.')
        } else {
          toast.success(`Welcome back, ${result.user.name || 'Friend'}!`)
        }
      } else {
        toast.error(result.error || 'Login failed. Please check your credentials.')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false)
    setPendingUser(null)
    setFormData(prev => ({ ...prev, password: '' }))
  }

  return (
    <>
      <div className="flex min-h-screen bg-[#050505]">

        {/* ─── LEFT PANEL — cinematic brand ─────────────────────────────────── */}
        <div className="relative hidden flex-col overflow-hidden md:flex md:w-[52%] lg:w-[55%]">
          {/* Atmospheric glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_65%,rgba(109,40,217,0.3)_0%,transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(109,40,217,0.08)_0%,transparent_50%)]" />

          {/* Logo — top */}
          <div className="relative z-10 p-10 lg:p-12">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/images/logo.png" alt="Eternal Love Church" className="h-8 w-8 object-contain" />
              <p className="text-[10px] font-bold tracking-[0.22em] text-zinc-600">ETERNAL LOVE CHURCH</p>
            </Link>
          </div>

          {/* Content — pinned to bottom */}
          <div className="relative z-10 flex flex-1 flex-col justify-end px-10 pb-16 lg:px-12 lg:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
            >
              <p className="mb-8 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">
                COMMUNITY PORTAL
              </p>
              <h1 className="text-6xl font-black leading-[0.88] tracking-tighter text-white lg:text-7xl xl:text-8xl">
                <span className="block">WE LOVE</span>
                <span className="block text-[#D4AF37]">GOD</span>
                <span className="block">AND PEOPLE</span>
              </h1>
              <p className="mt-8 max-w-xs text-sm leading-relaxed text-zinc-500">
                A Spirit-filled church rooted in the love and power of God.
              </p>
              <p className="mt-6 text-xs italic tracking-wide text-zinc-700">
                "Love is the foundation of all spiritual gifts."
              </p>
            </motion.div>
          </div>
        </div>

        {/* ─── RIGHT PANEL — form ───────────────────────────────────────────── */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 md:border-l md:border-white/[0.04]">
          {/* Subtle top glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.09)_0%,transparent_55%)]" />

          <div className="relative w-full max-w-[360px]">

            {/* Mobile-only logo */}
            <div className="mb-14 flex flex-col items-center md:hidden">
              <Link to="/">
                <img src="/images/logo.png" alt="Eternal Love Church" className="h-12 w-12 object-contain" />
              </Link>
              <p className="mt-3 text-[10px] font-bold tracking-[0.22em] text-zinc-600">
                ETERNAL LOVE CHURCH
              </p>
            </div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease }}
            >
              <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                WELCOME BACK
              </h2>
              <p className="mt-3 text-sm text-zinc-600">Sign in to continue.</p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease }}
              className="mt-10 space-y-5"
            >
              {/* Email or Phone */}
              <div>
                <label className={labelClass}>Email or Phone Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.identifier}
                    onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                    placeholder="your@email.com or 0760803332"
                    className={`${inputClass} pl-11`}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className={`${inputClass} pl-11 pr-11`}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 transition hover:text-zinc-400"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label htmlFor="remember-me" className="flex cursor-pointer select-none items-center gap-2.5">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border border-white/10 bg-white/[0.04] accent-[#D4AF37]"
                    disabled={loading}
                  />
                  <span className="text-xs tracking-[0.1em] text-zinc-600">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs tracking-[0.1em] text-zinc-600 transition hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#D4AF37] py-4 text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-[#050505]/25 border-t-[#050505]" />
                  ) : (
                    'SIGN IN'
                  )}
                </button>
              </div>
            </motion.form>

            {/* Register link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 text-center text-xs tracking-[0.08em] text-zinc-700"
            >
              Don't have an account?{' '}
              <Link to="/register" className="text-[#D4AF37] transition hover:opacity-70">
                Register
              </Link>
            </motion.p>

            {/* Bottom credit */}
            <p className="mt-16 text-center text-[10px] tracking-[0.08em] text-zinc-800">
              © {new Date().getFullYear()} Eternal Love Church
            </p>
          </div>
        </div>

      </div>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        email={pendingUser?.email}
      />
    </>
  )
}
