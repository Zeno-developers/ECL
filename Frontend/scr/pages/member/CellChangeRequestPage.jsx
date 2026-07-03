import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrowRightLeft, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { cellsAPI, cellChangeRequestsAPI } from '../../utils/api'
import DashboardShell from '../../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const statusStyles = {
  approved: { icon: CheckCircle, cls: 'text-emerald-700 bg-emerald-500/10' },
  rejected: { icon: XCircle, cls: 'text-red-700 bg-red-500/10' },
  pending: { icon: Clock, cls: 'text-amber-700 bg-amber-500/10' },
}

export default function CellChangeRequestPage() {
  const navigate = useNavigate()
  const [cells, setCells] = useState([])
  const [requests, setRequests] = useState([])
  const [requestedCellId, setRequestedCellId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [cellsRes, requestsRes] = await Promise.all([
        cellsAPI.getAll({ is_active: 1 }),
        cellChangeRequestsAPI.getMyRequests(),
      ])
      setCells(Array.isArray(cellsRes?.data) ? cellsRes.data : [])
      setRequests(Array.isArray(requestsRes?.data) ? requestsRes.data : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load cell change data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!requestedCellId || !reason.trim()) { toast.error('Please select a cell and give a reason'); return }
    try {
      setSubmitting(true)
      await cellChangeRequestsAPI.request(Number(requestedCellId), reason.trim())
      toast.success('Cell change request submitted')
      setRequestedCellId('')
      setReason('')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
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
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 space-y-6">

        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">REQUEST CELL CHANGE</h1>
            <p className="mt-1 text-sm text-warm-muted">Ask leadership to move you to a different cell group.</p>
          </div>
        </div>

        {/* Request form */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Requested Cell</label>
              <select value={requestedCellId} onChange={(e) => setRequestedCellId(e.target.value)} className={inputCls}>
                <option value="">Choose a cell...</option>
                {cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}{cell.zone_name ? ` - ${cell.zone_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Explain why you are requesting a new cell..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
            >
              <ArrowRightLeft size={13} />
              {submitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
            </button>
          </form>
        </div>

        {/* My requests */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-4 shadow-sm">
          <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">MY REQUESTS</p>
          {requests.length === 0 ? (
            <p className="text-sm text-warm-muted">You have not submitted any cell change requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const s = statusStyles[request.status] || statusStyles.pending
                const Icon = s.icon
                return (
                  <div key={request.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-warm-espresso">
                          <Icon size={14} className={s.cls.split(' ')[0]} />
                          {request.current_cell_name || 'Unassigned'} → {request.requested_cell_name}
                        </div>
                        <p className="text-xs text-warm-muted mt-1">{request.reason}</p>
                        <p className="text-[10px] text-warm-muted mt-1.5">
                          Requested {request.requested_at ? new Date(request.requested_at).toLocaleString() : 'recently'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] shrink-0 ${s.cls}`}>
                        {request.status?.toUpperCase()}
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
