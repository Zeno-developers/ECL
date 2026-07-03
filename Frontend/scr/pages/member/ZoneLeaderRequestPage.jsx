import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { zonesAPI, zoneLeaderRequestsAPI } from '../../utils/api';
import { AlertCircle, CheckCircle, Clock, MapPin, Send } from 'lucide-react';
import DashboardShell from '../../components/dashboard/DashboardShell';

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const statusStyles = {
  pending: { icon: Clock, cls: 'text-amber-700 bg-amber-500/10 border-amber-500/20' },
  approved: { icon: CheckCircle, cls: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
  rejected: { icon: AlertCircle, cls: 'text-red-700 bg-red-500/10 border-red-500/20' },
}

export default function ZoneLeaderRequestPage() {
  const { user } = useAuth()
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [motivation, setMotivation] = useState('')
  const [loading, setLoading] = useState(false)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    loadZones()
    loadMyRequests()
  }, [])

  const loadZones = async () => {
    try {
      const data = await zonesAPI.getAll()
      setZones(Array.isArray(data) ? data : data?.data || [])
    } catch {
      toast.error('Failed to load zones')
    }
  }

  const loadMyRequests = async () => {
    try {
      setLoadingRequests(true)
      const data = await zoneLeaderRequestsAPI.getMyRequests()
      if (data?.status === 'table_not_found') {
        setMyRequests([])
      } else {
        setMyRequests(Array.isArray(data) ? data : data?.data || [])
      }
    } catch {
      setMyRequests([])
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    if (!selectedZone) { toast.error('Please select a zone'); return }
    setLoading(true)
    try {
      const result = await zoneLeaderRequestsAPI.request(Number(selectedZone), motivation)
      if (result?.status === 'table_not_found') {
        toast.warning('Zone leader requests system is being initialized. Please try again in a moment.')
        return
      }
      if (result.status === 'success' || result.success) {
        toast.success('Zone leader request submitted!')
        setSelectedZone('')
        setMotivation('')
        loadMyRequests()
      } else {
        toast.error(result.message || 'Failed to submit request')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 space-y-6">

        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ZONE LEADER REQUEST</h1>
          <p className="mt-2 text-sm text-warm-muted">Apply to become a zone leader in your church.</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
          <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">SUBMIT YOUR REQUEST</p>
          <form onSubmit={handleSubmitRequest} className="space-y-5">
            <div>
              <label className={labelCls}>
                <div className="flex items-center gap-2"><MapPin size={10} />Select Zone</div>
              </label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Choose a zone...</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}{zone.location ? ` (${zone.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Motivation (Optional)</label>
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Tell the leadership why you want to lead this zone..."
                className={`${inputCls} resize-none`}
                rows={4}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Submitting...' : 'SUBMIT REQUEST'}
            </button>
          </form>
        </div>

        {/* Requests history */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-4 shadow-sm">
          <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">YOUR REQUESTS</p>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto mb-3 text-warm-gold/30" />
              <p className="text-sm text-warm-muted">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => {
                const style = statusStyles[request.status?.toLowerCase()] || { icon: AlertCircle, cls: 'text-warm-muted bg-warm-charcoal/[0.05] border-warm-charcoal/[0.07]' }
                const Icon = style.icon
                const requestedAt = request.requested_at || request.created_at
                return (
                  <div key={request.id} className={`rounded-xl border p-4 ${style.cls}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} />
                          <p className="text-sm font-semibold text-warm-espresso">{request.zone_name || `Zone ${request.zone_id}`}</p>
                        </div>
                        <p className="text-xs text-warm-muted">
                          Requested: {requestedAt ? new Date(requestedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                        {request.rejection_reason && (
                          <p className="text-xs text-warm-muted mt-1"><span className="font-semibold">Reason:</span> {request.rejection_reason}</p>
                        )}
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] bg-warm-charcoal/[0.05] text-warm-muted capitalize">
                        {request.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
