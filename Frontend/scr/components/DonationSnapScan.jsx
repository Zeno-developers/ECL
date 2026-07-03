import React, { useState, useEffect } from 'react'
import { Heart, AlertCircle, Loader, CheckCircle2 } from 'lucide-react'
import { API_CONFIG } from '../config/api'

const API_BASE_URL = API_CONFIG.BASE_URL

const DEFAULT_FUNDS = [
  { id: 1, name: 'General Fund', description: 'Support general church operations' },
  { id: 2, name: 'Building Fund', description: 'Help expand our church facilities' },
  { id: 3, name: 'Missions', description: 'Support outreach and missionary work' },
]

const DonationSnapScan = () => {
  const [amount, setAmount] = useState('100')
  const [fundId, setFundId] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [funds, setFunds] = useState(DEFAULT_FUNDS)

  // Get JWT token from localStorage if available
  const getAuthToken = () => {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Optionally load funds from API
    const loadFunds = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }
        
        const token = getAuthToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}/giving/funds`, {
          headers,
        })
        
        if (response.ok) {
          const data = await response.json()
          // Handle both { data: [...] } and direct array responses
          const fundsList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null
          
          if (fundsList && fundsList.length > 0) {
            setFunds(fundsList)
            return
          }
        }
        
        // Fall back to default funds
        setFunds(DEFAULT_FUNDS)
      } catch (err) {
        console.warn('Failed to load funds, using defaults:', err)
        setFunds(DEFAULT_FUNDS)
      }
    }

    loadFunds()
  }, [])

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^\d.]/g, '')
    setAmount(value)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount < 5) {
      setError('Minimum donation is R5.00')
      return
    }

    if (numAmount > 100000) {
      setError('Maximum donation is R100,000.00')
      return
    }

    setLoading(true)

    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }

      const token = getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/giving/snapscan/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: numAmount,
          fund_id: fundId ? parseInt(fundId, 10) : null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.data?.payment_url) {
        setSuccess('Redirecting to SnapScan...')
        // Redirect to the payment URL
        window.location.href = data.data.payment_url
      } else {
        const errorMsg = data.message || data.error || 'Failed to create payment link. Please try again.'
        setError(errorMsg)
        console.error('SnapScan error:', data)
      }
    } catch (err) {
      console.error('Donation error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg bg-red-100 p-2 text-red-600">
          <Heart size={20} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Support Our Mission</h3>
          <p className="text-xs text-slate-500">Secure online giving via SnapScan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Donation Amount */}
        <div>
          <label className="block text-sm font-semibold text-slate-700">Donation Amount</label>
          <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-lg font-semibold text-slate-600">R</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="100.00"
              className="ml-2 flex-1 bg-transparent text-lg font-semibold text-slate-950 outline-none"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Minimum: R5.00 | Maximum: R100,000.00</p>
        </div>

        {/* Fund Selection */}
        {funds && funds.length > 0 && (
          <div>
            <label htmlFor="fund" className="block text-sm font-semibold text-slate-700">
              Donation Fund
            </label>
            <select
              id="fund"
              value={fundId}
              onChange={(e) => {
                setFundId(e.target.value)
                setError('')
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
              disabled={loading}
            >
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name || fund.title || 'Fund'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition hover:from-red-700 hover:to-red-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Heart size={18} />
              Give Now
            </>
          )}
        </button>

        {/* Info Text */}
        <p className="text-xs text-slate-500 text-center">
          Secure payment processed by SnapScan. Your donation helps advance God's kingdom through Eternal Love Church.
        </p>
      </form>
    </div>
  )
}

export default DonationSnapScan
