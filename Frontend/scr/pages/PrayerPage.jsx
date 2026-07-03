import { useState, useEffect } from 'react'
import { prayerAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { HandHeartIcon, Plus, CheckCircle, Clock, Users, EyeOff, X } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

const statusStyles = {
  pending: 'text-amber-400 bg-amber-500/10',
  prayed: 'text-blue-400 bg-blue-500/10',
  answered: 'text-emerald-400 bg-emerald-500/10',
}
const statusLabels = { pending: 'Pending', prayed: 'Prayed For', answered: 'Answered' }

const priorityStyles = {
  urgent: 'text-red-400 bg-red-500/10',
  normal: 'text-zinc-500 bg-white/[0.04]',
}
const priorityLabels = { urgent: 'Urgent', normal: 'Normal' }

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'

export default function PrayerPage() {
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', description: '', category: 'general', isPrivate: false })
  const [addSubmitting, setAddSubmitting] = useState(false)

  useEffect(() => { loadPrayers() }, [])

  const loadPrayers = async () => {
    try {
      const response = await prayerAPI.getAllPrayers()
      setPrayers(Array.isArray(response) ? response : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load prayer requests')
      setPrayers([])
    } finally {
      setLoading(false)
    }
  }

  const handlePrayerAction = async (prayerId, action) => {
    setActionLoading(prayerId)
    try {
      const validAction = action === 'approved' ? 'prayed' : action === 'rejected' ? 'answered' : action
      await prayerAPI.updatePrayerStatus(prayerId, validAction)
      setPrayers((prev) => prev.map((p) => p._id === prayerId ? { ...p, status: validAction } : p))
      toast.success(`Prayer request ${action} successfully`)
    } catch (error) {
      toast.error(error.message || `Failed to ${action} prayer request`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddPrayer = async () => {
    if (!addForm.title.trim() || !addForm.description.trim()) {
      toast.error('Title and description are required')
      return
    }
    setAddSubmitting(true)
    try {
      await prayerAPI.submit({
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        category: addForm.category,
        isPrivate: addForm.isPrivate,
      })
      toast.success('Prayer request submitted')
      setShowAddModal(false)
      setAddForm({ title: '', description: '', category: 'general', isPrivate: false })
      loadPrayers()
    } catch (error) {
      toast.error(error.message || 'Failed to submit prayer request')
    } finally {
      setAddSubmitting(false)
    }
  }

  const handlePriorityUpdate = async (prayerId, priority) => {
    try {
      await prayerAPI.updatePrayerPriority(prayerId, priority)
      setPrayers((prev) => prev.map((p) => p._id === prayerId ? { ...p, priority } : p))
      toast.success('Prayer priority updated')
    } catch (error) {
      toast.error(error.message || 'Failed to update priority')
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
        </div>
      </DashboardShell>
    )
  }

  const pendingPrayers = prayers.filter((p) => p.status === 'pending')
  const prayedPrayers = prayers.filter((p) => p.status === 'prayed')
  const answeredPrayers = prayers.filter((p) => p.status === 'answered')

  const PrayerCard = ({ prayer, showActions }) => (
    <div className={`rounded-2xl border p-5 space-y-3 ${prayer.status === 'answered' ? 'border-emerald-500/[0.12] bg-emerald-500/[0.03]' : prayer.status === 'prayed' ? 'border-blue-500/[0.12] bg-blue-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-zinc-200">{prayer.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {prayer.isPrivate && <EyeOff size={12} className="text-zinc-600" />}
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${statusStyles[prayer.status] || 'text-zinc-500 bg-white/[0.04]'}`}>
            {statusLabels[prayer.status] || prayer.status}
          </span>
          {prayer.priority && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${priorityStyles[prayer.priority] || 'text-zinc-500 bg-white/[0.04]'}`}>
              {priorityLabels[prayer.priority] || prayer.priority}
            </span>
          )}
        </div>
      </div>

      {prayer.category && prayer.category !== 'general' && (
        <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold text-zinc-500 bg-white/[0.04]">{prayer.category}</span>
      )}

      <p className="text-xs text-zinc-500 leading-relaxed">{prayer.description}</p>

      <div className="flex items-center justify-between text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><Users size={10} />By {prayer.user?.name || 'Anonymous'}</span>
        <span className="flex items-center gap-1"><Clock size={10} />{formatDate(showActions ? prayer.createdAt : prayer.updatedAt)}</span>
      </div>

      {showActions && (
        <>
          <select
            value={prayer.priority || 'normal'}
            onChange={(e) => handlePriorityUpdate(prayer._id, e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 focus:border-[#D4AF37]/40 focus:outline-none"
          >
            <option value="normal">Normal Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrayerAction(prayer._id, 'approved')}
              disabled={actionLoading === prayer._id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 py-2 text-xs font-semibold transition hover:bg-blue-500/20 disabled:opacity-50"
            >
              <CheckCircle size={12} />Mark as Prayed
            </button>
            <button
              onClick={() => handlePrayerAction(prayer._id, 'rejected')}
              disabled={actionLoading === prayer._id}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2 text-xs font-semibold transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle size={12} />Mark as Answered
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">PRAYER REQUESTS</h1>
            <p className="mt-2 text-sm text-zinc-500">Manage and review prayer requests from the congregation.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-600"><span className="font-bold text-zinc-300">{pendingPrayers.length}</span> pending</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-[#050505] transition hover:opacity-90"
            >
              <Plus size={13} />
              ADD PRAYER
            </button>
          </div>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Pending', value: pendingPrayers.length, icon: HandHeartIcon },
            { label: 'Prayed For', value: prayedPrayers.length, icon: CheckCircle },
            { label: 'Answered', value: answeredPrayers.length, icon: CheckCircle },
            { label: 'Total', value: prayers.length, icon: Users },
          ]}
        />

        {prayers.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
            <HandHeartIcon size={36} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-400">No Prayer Requests</p>
            <p className="text-xs text-zinc-600 mt-1">No prayer requests have been submitted yet.</p>
            <button onClick={() => setShowAddModal(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-[#050505] transition hover:opacity-90">
              Add First Prayer Request
            </button>
          </div>
        )}

        {pendingPrayers.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] text-zinc-600 mb-3">PENDING PRAYERS</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingPrayers.map((prayer) => <PrayerCard key={prayer._id} prayer={prayer} showActions />)}
            </div>
          </div>
        )}

        {prayedPrayers.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] text-zinc-600 mb-3">PRAYED FOR</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {prayedPrayers.map((prayer) => <PrayerCard key={prayer._id} prayer={prayer} showActions={false} />)}
            </div>
          </div>
        )}

        {answeredPrayers.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] text-zinc-600 mb-3">ANSWERED PRAYERS</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {answeredPrayers.map((prayer) => <PrayerCard key={prayer._id} prayer={prayer} showActions={false} />)}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-zinc-200">New Prayer Request</p>
              <button onClick={() => setShowAddModal(false)}>
                <X size={16} className="text-zinc-500 hover:text-zinc-200 transition" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={addForm.title}
                onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Prayer title *"
                autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
              />
              <textarea
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the prayer need *"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
              />
              <select
                value={addForm.category}
                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-zinc-300 focus:border-[#D4AF37]/40 focus:outline-none"
              >
                <option value="general">General</option>
                <option value="healing">Healing</option>
                <option value="family">Family</option>
                <option value="finances">Finances</option>
                <option value="salvation">Salvation</option>
                <option value="guidance">Guidance</option>
                <option value="thanksgiving">Thanksgiving</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addForm.isPrivate}
                  onChange={(e) => setAddForm((f) => ({ ...f, isPrivate: e.target.checked }))}
                  className="rounded border-white/20"
                />
                <span className="text-xs text-zinc-500">Keep private — visible only to pastor</span>
              </label>
              <button
                onClick={handleAddPrayer}
                disabled={addSubmitting}
                className="w-full rounded-xl bg-[#D4AF37] py-2.5 text-xs font-bold tracking-[0.12em] text-[#050505] transition hover:opacity-90 disabled:opacity-50"
              >
                {addSubmitting ? 'Submitting...' : 'SUBMIT PRAYER REQUEST'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
