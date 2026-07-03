import { useCallback, useEffect, useState } from 'react'

const GOOGLE_PAY_API_URL = 'https://pay.google.com/gp/p/js/pay.js'

const BASE_REQUEST = {
  apiVersion: 2,
  apiVersionMinor: 0,
}

const ALLOWED_PAYMENT_METHODS = [
  {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
      allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX'],
    },
    tokenizationSpecification: {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'stripe',
        'stripe:version': '2023-10-16',
        'stripe:publishableKey': import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
      },
    },
  },
]

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.payments?.api) { resolve(); return }
    const existing = document.querySelector(`script[src="${GOOGLE_PAY_API_URL}"]`)
    if (existing) { existing.addEventListener('load', resolve); return }
    const s = document.createElement('script')
    s.src = GOOGLE_PAY_API_URL
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export function useGooglePay({ amountZAR, fund, merchantName = 'Eternal Love Church' }) {
  const [available, setAvailable] = useState(false)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled) return
        const env = import.meta.env.DEV ? 'TEST' : 'PRODUCTION'
        const c = new window.google.payments.api.PaymentsClient({ environment: env })
        c.isReadyToPay({ ...BASE_REQUEST, allowedPaymentMethods: ALLOWED_PAYMENT_METHODS })
          .then(({ result }) => {
            if (!cancelled) {
              setClient(c)
              setAvailable(result)
            }
          })
          .catch(() => { if (!cancelled) setAvailable(false) })
          .finally(() => { if (!cancelled) setLoading(false) })
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const pay = useCallback(() => {
    if (!client || !amountZAR) return Promise.reject(new Error('Not ready'))

    const merchantId = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4T27YTAQLP' // test fallback

    const paymentRequest = {
      ...BASE_REQUEST,
      allowedPaymentMethods: ALLOWED_PAYMENT_METHODS,
      merchantInfo: {
        merchantId,
        merchantName,
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: Number(amountZAR).toFixed(2),
        currencyCode: 'ZAR',
        countryCode: 'ZA',
      },
    }

    return client.loadPaymentData(paymentRequest)
  }, [client, amountZAR, merchantName])

  return { available, loading, pay }
}
