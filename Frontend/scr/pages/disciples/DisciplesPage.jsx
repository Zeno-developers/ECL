import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { disciplesAPI, membersAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { BookOpen, Plus, Users, X } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const isAdminPastor = (role) => ['admin', 'pastor', 'superadmin', 'elder'].includes(role)

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold text-warm-espresso">{title}</p>
          <button onClick={onClose}><X size={16} className="text-warm-muted hover:text-warm-charcoal" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function DisciplesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', leader_id: '' })
  const [saving, setSaving] = useState(false)

  const canAdmin = isAdminPastor(user?.role)

  useEffect(() => {
    load()
    if (canAdmin) membersAPI.getAll().then(r => setAllMembers(r?.data?.members || r?.data || [])).catch(() => {})
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const res = await disciplesAPI.listGroups(canAdmin)
      setGroups(res?.data || [])
    } catch (e) {
      toast.error(e.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Group name is required')
    const leaderId = canAdmin ? (parseInt(form.leader_id) || user.id) : user.id
    try {
      setSaving(true)
      const res = await disciplesAPI.createGroup({ name: form.name, description: form.description, leader_id: leaderId })
      toast.success('Group created')
      setShowCreate(false)
      setForm({ name: '', description: '', leader_id: '' })
      navigate(`/disciples/${res?.data?.id}`)
    } catch (e) {
      toast.error(e.message || 'Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none'

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">DISCIPLES GROUPS</h1>
            <p className="mt-2 text-sm text-warm-muted">Small intensive discipleship groups — separate from cells.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 shrink-0">
            <Plus size={13} />
            NEW GROUP
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-warm-muted">
            <BookOpen size={36} className="mb-3 text-warm-gold/30" />
            <p className="text-sm">No disciples groups yet.</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-warm-gold hover:underline">Create the first group</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(g => {
              const lastMeeting   = g.last_meeting_date
              const daysSince     = lastMeeting ? Math.floor((Date.now() - new Date(lastMeeting + 'T00:00:00').getTime()) / 86400000) : null
              const isActive      = daysSince !== null && daysSince <= 30
              const isStagnant    = daysSince !== null && daysSince > 60
              const healthDot     = daysSince === null ? 'bg-warm-charcoal/20' : isActive ? 'bg-emerald-500' : isStagnant ? 'bg-red-400' : 'bg-amber-400'
              const healthLabel   = daysSince === null ? 'No meetings yet' : isActive ? `Active · ${daysSince}d ago` : isStagnant ? `Inactive · ${daysSince}d ago` : `${daysSince}d since last meeting`

              return (
              <button key={g.id} onClick={() => navigate(`/disciples/${g.id}`)}
                className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 text-left shadow-sm transition hover:border-warm-gold/25 hover:shadow-md group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-warm-gold/[0.08] border border-warm-gold/15 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-warm-gold" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {g.my_role && (
                      <span className={`text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-full ${g.my_role === 'leader' ? 'bg-warm-gold/10 text-warm-gold' : 'bg-warm-charcoal/[0.06] text-warm-muted'}`}>
                        {g.my_role.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-warm-espresso group-hover:text-warm-charcoal">{g.name}</p>
                {g.description && <p className="text-xs text-warm-muted mt-1 line-clamp-2">{g.description}</p>}
                <div className="mt-3 pt-3 border-t border-warm-charcoal/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-warm-muted">
                      <Users size={11} />
                      {g.member_count} members
                    </div>
                    {g.avg_attendance_pct !== null && g.avg_attendance_pct !== undefined && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        g.avg_attendance_pct >= 75 ? 'bg-emerald-50 text-emerald-700' :
                        g.avg_attendance_pct >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>{g.avg_attendance_pct}% attendance</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${healthDot}`} />
                    <p className="text-[10px] text-warm-muted">{healthLabel}</p>
                  </div>
                  <p className="text-[10px] text-warm-muted">Led by {g.leader_name}</p>
                </div>
              </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create Disciples Group" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Group name *" className={inputCls} autoFocus />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)" rows={3} className={`${inputCls} resize-none`} />
            {canAdmin && (
              <select value={form.leader_id} onChange={e => setForm(f => ({ ...f, leader_id: e.target.value }))} className={inputCls}>
                <option value="">Leader: myself ({user?.name || user?.first_name})</option>
                {allMembers.filter(m => m.id !== user?.id).map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            )}
            <button onClick={handleCreate} disabled={saving}
              className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
              {saving ? 'Creating...' : 'CREATE GROUP'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
