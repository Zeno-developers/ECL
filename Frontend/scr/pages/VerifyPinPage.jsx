import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { getRoleDashboardPath } from '../utils/roleRouting'
import { ShieldCheck, RotateCcw } from 'lucide-react'

export default function VerifyPinPage() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const { login }  = useAuth()

  const email = location.state?.email || ''
  const phone = location.state?.phone || ''

  const [pin, setPin]         = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputs = useRef([])

  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...pin]
    next[i] = val.slice(-1)
    setPin(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(d => d !== '')) handleVerify(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      const arr = text.split('')
      setPin(arr)
      inputs.current[5]?.focus()
      handleVerify(text)
    }
  }

  const handleVerify = async (code) => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const res = await authAPI.verifyPin(email, code)
      if (res?.status === 'success' && res?.token) {
        localStorage.setItem('token', res.token)
        if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token)
        if (res.user) localStorage.setItem('user', JSON.stringify(res.user))
        toast.success(res.message || 'Account verified! Welcome!')
        const role = res.user?.role || 'member'
        navigate(getRoleDashboardPath(role), { replace: true })
        window.location.reload()
      } else {
        toast.error(res?.message || 'Invalid PIN')
        setPin(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      }
    } catch (err) {
      toast.error(err?.message || 'Verification failed')
      setPin(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resending || countdown > 0) return
    setResending(true)
    try {
      const res = await authAPI.resendPin(email)
      if (res?.status === 'success') {
        toast.success('New PIN sent to your email and WhatsApp!')
        setCountdown(60)
        setPin(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      } else {
        toast.error(res?.message || 'Could not resend PIN')
      }
    } catch {
      toast.error('Could not resend PIN')
    } finally {
      setResending(false)
    }
  }

  const maskedPhone = phone ? phone.slice(0, -4).replace(/./g, '•') + phone.slice(-4) : ''

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-5">
            <ShieldCheck size={28} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">VERIFY YOUR ACCOUNT</h1>
          <p className="mt-2 text-sm text-zinc-500">
            A 6-digit PIN was sent to<br />
            <span className="text-zinc-300">{email}</span>
            {maskedPhone && <><br /><span className="text-zinc-300">and WhatsApp {maskedPhone}</span></>}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7">
          <div className="flex justify-center gap-2.5 mb-7" onPaste={handlePaste}>
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className={`
                  h-14 w-11 rounded-xl border text-center text-xl font-bold
                  transition duration-200 focus:outline-none
                  ${digit
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/[0.08] bg-white/[0.04] text-white'}
                  focus:border-[#D4AF37]/40 focus:bg-white/[0.06]
                  disabled:opacity-40
                `}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            onClick={() => handleVerify(pin.join(''))}
            disabled={loading || pin.some(d => !d)}
            className="w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-bold tracking-[0.1em] text-[#1a1208] transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'VERIFYING...' : 'VERIFY & ACTIVATE'}
          </button>

          <div className="mt-5 text-center">
            <p className="text-xs text-zinc-600 mb-2">Didn't receive it?</p>
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4AF37] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={12} className={resending ? 'animate-spin' : ''} />
              {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend PIN'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-700">
          Already have an account?{' '}
          <a href="/login" className="text-zinc-500 hover:text-[#D4AF37] transition">Sign in</a>
        </p>
      </div>
    </div>
  )
}
