import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Mail, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

const ease = [0.22, 1, 0.36, 1]

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-700 transition duration-200 focus:border-[#D4AF37]/40 focus:outline-none focus:bg-white/[0.06]'

const labelClass =
  'mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isPhone = identifier && !identifier.includes('@')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      toast.error('Please enter your email or phone number')
      return
    }
    setLoading(true)
    try {
      const result = await forgotPassword(identifier.trim())
      if (result.success) {
        setSubmitted(true)
      } else {
        toast.error(result.error || 'Failed to send reset instructions')
      }
    } catch {
      toast.error('An unexpected error occurred')
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
              ACCOUNT RECOVERY
            </p>
            <h1 className="text-6xl font-black leading-[0.88] tracking-tighter text-white lg:text-7xl xl:text-8xl">
              <span className="block">WE'LL</span>
              <span className="block text-[#D4AF37]">FIND</span>
              <span className="block">THE WAY</span>
            </h1>
            <p className="mt-8 max-w-xs text-sm leading-relaxed text-zinc-500">
              A new beginning is one step away. Enter your email or phone number and we'll send you the path back in.
            </p>
            <p className="mt-6 text-xs italic tracking-wide text-zinc-700">
              "He restores my soul."
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

          {submitted ? (
            /* ── Success state ── */
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                CHECK YOUR<br />{isPhone ? 'WHATSAPP' : 'EMAIL'}
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                If an account exists for{' '}
                <span className="text-zinc-400">{identifier}</span>, we sent a reset link.
              </p>

              <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-xs leading-relaxed tracking-[0.06em] text-zinc-500">
                  Reset links expire in{' '}
                  <span className="text-zinc-300">24 hours</span>.{' '}
                  {isPhone ? 'Check your WhatsApp messages.' : "Check your spam folder if you don't see it."}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  to="/login"
                  className="block w-full rounded-full bg-[#D4AF37] py-4 text-center text-xs font-bold tracking-[0.22em] text-[#050505] transition hover:opacity-90"
                >
                  BACK TO SIGN IN
                </Link>
                <button
                  onClick={() => { setSubmitted(false); setIdentifier('') }}
                  className="w-full rounded-full border border-white/[0.08] py-4 text-xs font-semibold tracking-[0.18em] text-zinc-500 transition hover:border-white/[0.14] hover:text-zinc-300"
                >
                  SEND AGAIN
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Form state ── */
            <>
              <motion.div
                key="heading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease }}
              >
                <h2 className="text-4xl font-black leading-none tracking-tighter text-white">
                  FORGOT YOUR<br />PASSWORD?
                </h2>
                <p className="mt-3 text-sm text-zinc-600">
                  Enter your email or phone number and we'll send reset instructions.
                </p>
              </motion.div>

              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease }}
                className="mt-10 space-y-5"
              >
                <div>
                  <label className={labelClass}>Email or Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="your@email.com or 0760123456"
                      className={`${inputClass} pl-11`}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                    {isPhone ? (
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                    ) : (
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                    )}
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
                      'SEND RESET LINK'
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
                Remember your password?{' '}
                <Link to="/login" className="text-[#D4AF37] transition hover:opacity-70">
                  Sign in
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
