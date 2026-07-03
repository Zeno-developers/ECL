import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { zoneLeaderRequestsAPI } from '../../utils/api';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

const statusBadge = {
  pending:  'text-amber-400 bg-amber-500/10',
  approved: 'text-emerald-400 bg-emerald-500/10',
  rejected: 'text-red-400 bg-red-500/10',
}

const statusIcon = {
  pending:  <Clock size={14} className="text-amber-400" />,
  approved: <CheckCircle size={14} className="text-emerald-400" />,
  rejected: <XCircle size={14} className="text-red-400" />,
}

export default function AdminZoneLeaderApprovals() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableInitError, setTableInitError] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectReason, setRejectReason] = useState({})
  const [showRejectForm, setShowRejectForm] = useState({})
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setTableInitError(false)
      const data = await zoneLeaderRequestsAPI.getPendingRequests()
      if (data?.status === 'table_not_found') {
        setTableInitError(true)
        setRequests([])
      } else {
        setRequests(Array.isArray(data) ? data : data?.data || [])
      }
    } catch (error) {
      if (error.message?.includes("doesn't exist")) {
        setTableInitError(true)
        setRequests([])
      } else {
        setRequests([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId) => {
    setActionLoading(requestId)
    try {
      const result = await zoneLeaderRequestsAPI.approve(requestId)
      if (result.status === 'success' || result.success) {
        toast.success('Request approved!')
        loadRequests()
      } else {
        toast.error(result.message || 'Failed to approve request')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId) => {
    setActionLoading(requestId)
    try {
      const result = await zoneLeaderRequestsAPI.reject(requestId, rejectReason[requestId] || '')
      if (result.status === 'success' || result.success) {
        toast.success('Request rejected!')
        setRejectReason((p) => ({ ...p, [requestId]: '' }))
        setShowRejectForm((p) => ({ ...p, [requestId]: false }))
        loadRequests()
      } else {
        toast.error(result.message || 'Failed to reject request')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (filter === 'pending') return req.status === 'pending'
    if (filter === 'approved') return req.status === 'approved'
    if (filter === 'rejected') return req.status === 'rejected'
    return true
  })

  const FILTERS = ['all', 'pending', 'approved', 'rejected']

  return (
    <div className="space-y-4">

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const count = f === 'all' ? requests.length : requests.filter((r) => r.status === f).length
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] transition-all ${
                active
                  ? 'bg-[#D4AF37]/[0.07] border border-[#D4AF37]/20 text-[#D4AF37]'
                  : 'border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? 'ALL' : f.toUpperCase()} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
        </div>
      ) : (tableInitError || filteredRequests.length === 0) ? (
        <div className="py-10 text-center">
          <p className="text-sm text-zinc-600">
            {filter === 'all' ? 'No requests yet.' : `No ${filter} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const status = request.status?.toLowerCase()
            return (
              <div
                key={request.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
              >
                {/* Row 1: name + badge + date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon[status]}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 leading-snug">
                        {request.member_name || `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unknown member'}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate">
                        {request.member_email || request.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${statusBadge[status] || 'text-zinc-500 bg-white/[0.04]'}`}>
                    {status?.toUpperCase()}
                  </span>
                </div>

                {/* Zone */}
                {request.zone_name && (
                  <p className="text-xs text-zinc-500">
                    Zone: <span className="font-semibold text-zinc-300">{request.zone_name}</span>
                  </p>
                )}

                {/* Motivation */}
                {request.motivation && (
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-zinc-600 mb-1">MOTIVATION</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{request.motivation}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {request.rejection_reason && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-2.5">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-red-400/70 mb-1">REJECTION REASON</p>
                    <p className="text-xs text-red-300/80 leading-relaxed">{request.rejection_reason}</p>
                  </div>
                )}

                {/* Actions */}
                {status === 'pending' ? (
                  showRejectForm[request.id] ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason[request.id] || ''}
                        onChange={(e) => setRejectReason((p) => ({ ...p, [request.id]: e.target.value }))}
                        placeholder="Reason for rejection (optional)..."
                        rows={2}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:border-[#D4AF37]/40 focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.08] py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/[0.14] disabled:opacity-50"
                        >
                          {actionLoading === request.id ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => setShowRejectForm((p) => ({ ...p, [request.id]: false }))}
                          className="flex-1 rounded-xl border border-white/[0.06] py-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/[0.14] disabled:opacity-50"
                      >
                        {actionLoading === request.id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm((p) => ({ ...p, [request.id]: true }))}
                        className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.08] py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/[0.14]"
                      >
                        Reject
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-[10px] text-zinc-600">
                    {status === 'approved' ? 'Approved' : 'Rejected'}
                    {request.reviewed_at && ` · ${new Date(request.reviewed_at).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
