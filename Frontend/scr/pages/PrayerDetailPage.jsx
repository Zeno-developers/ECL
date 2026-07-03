import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { prayerAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { ArrowLeft, User, Mail, Calendar, Check, X, Shield } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const statusStyles = {
  approved: 'text-emerald-400 bg-emerald-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  pending: 'text-amber-400 bg-amber-500/10',
  prayed: 'text-blue-400 bg-blue-500/10',
  answered: 'text-emerald-400 bg-emerald-500/10',
}

export default function PrayerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prayer, setPrayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPrayer() }, [id])

  const loadPrayer = async () => {
    try {
      setLoading(true)
      const response = await prayerAPI.getPrayer(id)
      setPrayer(response.data || response)
    } catch (error) {
      toast.error(error.message || 'Failed to load prayer request')
      navigate('/prayers')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status) => {
    try {
      await prayerAPI.updatePrayerStatus(id, status)
      setPrayer({ ...prayer, status })
      toast.success(`Prayer request marked as ${status}`)
    } catch (error) {
      toast.error(error.message || 'Failed to update status')
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

  if (!prayer) return null

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 space-y-6">

        <div className="flex items-center gap-4 border-b border-white/[0.04] pb-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-zinc-500 transition hover:text-zinc-200"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tighter text-white">{prayer.title}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] shrink-0 ${statusStyles[prayer.status] || 'text-zinc-500 bg-white/[0.04]'}`}>
            {prayer.status?.charAt(0).toUpperCase() + prayer.status?.slice(1)}
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{prayer.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-white/[0.04]">
            {[
              { icon: User, label: 'Submitted By', value: prayer.submittedBy || 'Anonymous' },
              { icon: Mail, label: 'Contact Email', value: prayer.email || 'Not provided' },
              { icon: Calendar, label: 'Date Submitted', value: new Date(prayer.createdAt).toLocaleDateString() },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon size={15} className="text-zinc-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-300">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {prayer.isPublic && (
            <div className="flex items-center gap-2 text-xs text-[#D4AF37]/80 pt-1">
              <Shield size={13} />
              This prayer is public and visible to the church community.
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-600">ACTIONS</p>
            <button
              onClick={() => handleStatusUpdate('approved')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 text-xs font-semibold transition hover:bg-emerald-500/20"
            >
              <Check size={13} />Approve
            </button>
            <button
              onClick={() => handleStatusUpdate('rejected')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-xs font-semibold transition hover:bg-red-500/20"
            >
              <X size={13} />Reject
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
