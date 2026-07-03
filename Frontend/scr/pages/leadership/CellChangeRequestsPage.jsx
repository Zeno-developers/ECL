import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CheckCircle, XCircle, Users, ArrowLeft } from 'lucide-react'
import { cellChangeRequestsAPI } from '../../utils/api'
import DashboardShell from '../../components/dashboard/DashboardShell'

export default function CellChangeRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await cellChangeRequestsAPI.getPendingRequests()
      setRequests(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async (requestId, status) => {
    try {
      setProcessingId(requestId)
      await cellChangeRequestsAPI.process(requestId, status)
      toast.success(`Request ${status}`)
      await loadRequests()
    } catch (error) {
      toast.error(error.message || `Failed to ${status} request`)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">CELL CHANGE REQUESTS</h1>
            <p className="mt-1 text-sm text-warm-muted">Review pending requests from members.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="mx-auto mb-3 text-warm-gold/30" />
              <p className="text-sm text-warm-muted">No pending cell change requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-warm-espresso">{request.first_name} {request.last_name}</p>
                      <p className="text-xs text-warm-muted mt-0.5">{request.email}</p>
                      <p className="text-xs text-warm-espresso mt-2">
                        {request.current_cell_name || 'Unassigned'} → {request.requested_cell_name}
                        {request.requested_zone_name ? ` (${request.requested_zone_name})` : ''}
                      </p>
                      <p className="text-xs text-warm-muted mt-1">{request.reason}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleProcess(request.id, 'approved')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-3 py-2 text-xs font-semibold transition hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <CheckCircle size={13} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleProcess(request.id, 'rejected')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 px-3 py-2 text-xs font-semibold transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
