import { useState, useEffect } from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
import { API_CONFIG } from '../config/api'
import { AlertCircle, RefreshCw } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const APIKeysPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { testAPI() }, [])

  const testAPI = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`)
      if (!response.ok) throw new Error(`API failed: ${response.status}`)
      await response.json()
      setIsLoading(false)
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold mx-auto" />
            <p className="mt-4 text-sm text-warm-muted">Testing API connection...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <h3 className="text-sm font-bold tracking-[0.1em] text-warm-charcoal mb-2">API CONNECTION FAILED</h3>
            <p className="text-sm text-warm-muted mb-4">{error}</p>
            <div className="space-y-1 text-xs text-warm-muted text-left mb-4">
              <p>· Check if backend server is running on port 5000</p>
              <p>· Verify CORS is configured properly</p>
              <p>· Check browser console for detailed errors</p>
            </div>
            <button
              onClick={testAPI}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <RefreshCw size={13} />
              RETRY CONNECTION
            </button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <ApiKeyManager />
    </DashboardShell>
  )
}

export default APIKeysPage
