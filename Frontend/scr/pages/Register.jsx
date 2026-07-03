// pages/Register.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { getRoleDashboardPath } from '../utils/roleRouting'

const ease = [0.22, 1, 0.36, 1]

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-700 transition duration-200 focus:border-[#D4AF37]/40 focus:outline-none focus:bg-white/[0.06]'

const labelClass =
  'mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600'

export default function Register() {
  const { register, user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agree, setAgree] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })

  useEffect(() => {
    if (user) navigate(getRoleDashboardPath(user.role), { replace: true })
  }, [user, navigate])

  const passwordStrength = (() => {
    let s = 0
    if (formData.password.length >= 8) s += 25
    if (/[A-Z]/.test(formData.password)) s += 25
    if (/[a-z]/.test(formData.password)) s += 25
    if (/[0-9]/.test(formData.password)) s += 25
    return s
  })()

  const strengthLabel = passwordStrength < 50 ? 'WEAK' : passwordStrength < 100 ? 'MEDIUM' : 'STRONG'
  const strengthColor =
    passwordStrength < 50
      ? 'bg-red-500/60'
      : passwordStrength < 100
      ? 'bg-amber-400/60'
      : 'bg-emerald-400/60'

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone) {
      toast.error('Please complete all required fields')
      return
    }
    if (!agree) {
      toast.error('Please accept the Terms and Privacy Policy')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordStrength < 100) {
      toast.error('Use uppercase, lowercase, numbers, and at least 8 characters')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const nameParts = formData.name.trim().split(/\s+/)
      const first_name = nameParts[0]
      const last_name = nameParts.slice(1).join(' ') || nameParts[0]

      const result = await register({
        first_name,
        last_name,
        email: formData.email,
        password: formData.password,
        role: 'member',
        phone: formData.phone,
      })

      if (result.success && result.pendingVerification) {
        toast.success('Check your email and WhatsApp for your verification PIN!')
        navigate('/verify-pin', { state: { email: result.email, phone: result.phone }, replace: true })
      } else if (result.success) {
        toast.success('Welcome to the family!')
        navigate(getRoleDashboardPath(result.user?.role || 'member'), { replace: true })
      } else {
        toast.error(result.error || 'Registration failed. Please try again.')
      }
    } catch {
      toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#050505]">

      {/* ─── LEFT PANEL — cinematic invitation ────────────────────────────── */}
      <div className="relative hidden flex-col overflow-hidden md:flex md:w-[52%] lg:w-[55%]">
        {/* Atmospheric glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_65%,rgba(109,40,217,0.3)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(109,40,217,0.08)_0%,transparent_50%)]" />

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
              JOIN THE COMMUNITY
            </p>
            <h1 className="text-6xl font-black leading-[0.88] tracking-tighter text-white lg:text-7xl xl:text-8xl">
              <span className="block">THERE'S</span>
              <span className="block text-[#D4AF37]">A PLACE</span>
              <span className="block">FOR YOU</span>
            </h1>
            <p className="mt-8 max-w-xs text-sm leading-relaxed text-zinc-500">
              Join a Spirit-filled community rooted in the love and power of God.
            </p>
            <p className="mt-6 text-xs italic tracking-wide text-zinc-700">
              "Love is the foundation of all spiritual gifts."
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── RIGHT PANEL — form ───────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 md:border-l md:border-white/[0.04]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.09)_0%,transparent_55%)]" />

        <div className="relative w-full max-w-[400px]">

          {/* Mobile-only logo */}
          <div className="mb-12 flex flex-col items-center md:hidden">
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
              CREATE YOUR<br />ACCOUNT
            </h2>
            <p className="mt-3 text-sm text-zinc-600">Begin your journey with Eternal Love Church.</p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mt-10 space-y-4"
          >
            {/* Full Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Your full name"
                  className={`${inputClass} pl-11`}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  className={`${inputClass} pl-11`}
                  required
                  disabled={loading}
                  autoComplete="email"
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
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Create a strong password"
                  className={`${inputClass} pl-11 pr-11`}
                  minLength={8}
                  required
                  disabled={loading}
                  autoComplete="new-password"
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
              {/* Strength bar */}
              {formData.password && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-px flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-700">
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Repeat your password"
                  className={`${inputClass} pl-11 pr-11`}
                  minLength={8}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 transition hover:text-zinc-400"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Phone — optional */}
            <div>
              <label className={labelClass}>
                Phone{' '}
                <span className="ml-1 font-normal tracking-normal normal-case text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+27 72 000 0000"
                  className={`${inputClass} pl-11`}
                  disabled={loading}
                  autoComplete="tel"
                />
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
              </div>
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded accent-[#D4AF37]"
                disabled={loading}
              />
              <span className="text-xs leading-relaxed tracking-[0.06em] text-zinc-600">
                I agree to the{' '}
                <Link to="/terms" className="text-[#D4AF37] transition hover:opacity-70">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#D4AF37] transition hover:opacity-70">
                  Privacy Policy
                </Link>.
              </span>
            </label>

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
                  'JOIN THE FAMILY'
                )}
              </button>
            </div>
          </motion.form>

          {/* Sign in link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-center text-xs tracking-[0.08em] text-zinc-700"
          >
            Already have an account?{' '}
            <Link to="/login" className="text-[#D4AF37] transition hover:opacity-70">
              Sign in
            </Link>
          </motion.p>

          {/* Copyright */}
          <p className="mt-16 text-center text-[10px] tracking-[0.08em] text-zinc-800">
            © {new Date().getFullYear()} Eternal Love Church
          </p>
        </div>
      </div>
    </div>
  )
}
