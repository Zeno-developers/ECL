import { useState } from 'react'
import { useGooglePay } from '../../hooks/useGooglePay'
import { givingAPI } from '../../utils/api'

// variant="light" → white button for dark backgrounds (public /give page)
// variant="dark"  → black button for light backgrounds (member portal)
export default function GooglePayButton({ amountZAR, fund, donorName, donorEmail, merchantName, variant = 'light', onSuccess, onError }) {
  const { available, loading, pay } = useGooglePay({ amountZAR, fund, merchantName })
  const [processing, setProcessing] = useState(false)

  if (loading || !available) return null

  const handlePay = async () => {
    if (processing || !amountZAR) return
    setProcessing(true)
    try {
      const paymentData = await pay()
      const rawToken = paymentData?.paymentMethodData?.tokenizationData?.token
      if (!rawToken) throw new Error('No payment token received')

      const result = await givingAPI.processGooglePay({
        payment_token: rawToken,
        amount: amountZAR,
        fund: fund || 'General Giving',
        donor_name: donorName || '',
        donor_email: donorEmail || '',
      })

      onSuccess?.(result)
    } catch (err) {
      // User dismissed the Google Pay sheet — not an error
      if (err?.statusCode === 'CANCELED' || err?.message === 'CANCELED') return
      onError?.(err)
    } finally {
      setProcessing(false)
    }
  }

  const isDark = variant === 'dark'

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={processing || !amountZAR}
      className={`flex w-full items-center justify-center rounded-full px-8 py-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        isDark
          ? 'bg-[#000] hover:bg-[#1a1a1a]'
          : 'bg-white hover:bg-zinc-100'
      }`}
    >
      {processing ? (
        <span className={`text-[11px] tracking-[0.2em] ${isDark ? 'text-white' : 'text-[#050505]'}`}>
          PROCESSING...
        </span>
      ) : (
        <img
          src={isDark
            ? 'https://www.gstatic.com/instantbuy/svg/dark/en.svg'
            : 'https://www.gstatic.com/instantbuy/svg/light/en.svg'
          }
          alt="Buy with Google Pay"
          className="h-5"
        />
      )}
    </button>
  )
}
