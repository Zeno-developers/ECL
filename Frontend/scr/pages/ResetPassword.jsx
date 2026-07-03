import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

const ease = [0.22, 1, 0.36, 1]

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-700 transition duration-200 focus:border-[#D4AF37]/40 focus:outline-none focus:bg-white/[0.06]'

const labelClass =
  'mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()

  const token = useMemo(() => {
    return searchParams.get('token') || params.token || ''
  }, [searchParams, params.token])

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({ newPassword: '', newPasswordConfirm: '' })

  const isTokenValid = token.length >= 32
  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.newPassword || !formData.newPasswordConfirm) {
      toast.error('Please fill in all fields')
      return
    }
    if (formData.newPassword !== formData.newPasswordConfirm) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const result = await resetPassword({ token, newPassword: formData.newPassword })
      if (result.success) {
        setDone(true)
        toast.success('Password reset successful')
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error(error.message || 'Reset failed. Request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#050505]">

      {/* ─── LEFT PANEL ───────────────────────────────────────────────────── */}
      <div className="relative hidden flex-col overflow-hidden md:flex md:w-[52%] lg:w-[55%]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,rgba(109,40,217,0.28)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(109,40,217,0.07)_0%,transparent_50%)]" />

        {/* Logo */}
        <div className="relative z-10 p-10 lg:p-12">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/images/logo.png" alt="Eternal Love Church" className="h-8 w-8 object-contain" />
            <p className="text-[10px] font-bold tracking-[0.22em] text-zinc-600">ETERNAL LOVE CHURCH</p>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-end px-10 pb-16 lg:px-12 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
          >
            <p className="mb-8 text-[10px] font-semibold tracking-[0.35em] text-zinc-600">
              NEW BEGINNING
            </p>
            <h1 className="text-6xl font-black leading-[0.88] tracking-tighter text-white lg:text-7xl xl:text-8xl">
              <span className="block">A FRESH</span>
              <span className="block text-[#D4AF37]">START</span>
              <span className="block">AWAITS</span>
            </h1>
            <p className="mt-8 max-w-xs text-sm leading-relaxed text-zinc-500">
              Set a strong new password and step back into your community.
            </p>
            <p className="mt-6 text-xs italic tracking-wide text-zinc-700">
              "Behold, I make all things new."
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 md:border-l md:border-white/[0.04]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(109,40,217,0.09)_0%,transparent_55%)]" />

        <div className="relative w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="mb-14 flex flex-col items-center md:hidden">
            <Link to="/">
              <img src="/images/logo.png" alt="Eternal Love Church" className="h-12 w-12 object-contain" />
            </Link>
            <p className="mt-3 text-[10px] font-bold tracking-[0.22em] text-zinc-600">
              ETERNAL LOVE CHURCH
            </p>
          </div>

          {/* ── Invalid token ── */}
          {!isTokenValid && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                INVALID<br />LINK
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                This reset link is missing a valid token or has expired.
              </p>

              <div className="mt-10 space-y-3">
                <Link
                  to="/forgot-password"
                  className="block w-full rounded-full bg-[#D4AF37] py-4 text-center text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90"
                >
                  REQUEST NEW LINK
                </Link>
                <Link
                  to="/login"
                  className="block w-full rounded-full border border-white/[0.08] py-4 text-center text-xs font-semibold tracking-[0.18em] text-zinc-500 transition hover:border-white/[0.14] hover:text-zinc-300"
                >
                  BACK TO SIGN IN
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {isTokenValid && done && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                PASSWORD<br />UPDATED
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                Your password was reset successfully. You can now sign in.
              </p>

              <div className="mt-10">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full rounded-full bg-[#D4AF37] py-4 text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90"
                >
                  SIGN IN NOW
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Form ── */}
          {isTokenValid && !done && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease }}
              >
                <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                  SET NEW<br />PASSWORD
                </h2>
                <p className="mt-3 text-sm text-zinc-600">
                  Use a strong password to protect your account.
                </p>
              </motion.div>

              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease }}
                className="mt-10 space-y-5"
              >
                {/* New Password */}
                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => updateField('newPassword', e.target.value)}
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
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.newPasswordConfirm}
                      onChange={(e) => updateField('newPasswordConfirm', e.target.value)}
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[#D4AF37] py-4 text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-[#050505]/25 border-t-[#050505]" />
                    ) : (
                      'RESET PASSWORD'
                    )}
                  </button>
                </div>
              </motion.form>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8 text-center text-xs tracking-[0.08em] text-zinc-700"
              >
                <Link to="/login" className="text-[#D4AF37] transition hover:opacity-70">
                  Back to sign in
                </Link>
              </motion.p>
            </>
          )}

          <p className="mt-16 text-center text-[10px] tracking-[0.08em] text-zinc-800">
            © {new Date().getFullYear()} Eternal Love Church
          </p>
        </div>
      </div>
    </div>
  )
}
