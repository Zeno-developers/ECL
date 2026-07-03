import { useEffect, useState } from 'react'
import { Briefcase, Plus, Pencil, Trash2, X, Check, Loader2, ToggleLeft, ToggleRight, Inbox, ChevronDown } from 'lucide-react'
import { toast } from 'react-toastify'
import { careersAPI } from '../utils/api'
import DashboardShell from '../components/dashboard/DashboardShell'

const STATUS_STYLES = {
  pending:  'bg-amber-500/10 text-amber-700',
  reviewed: 'bg-blue-500/10 text-blue-700',
  accepted: 'bg-emerald-500/10 text-emerald-700',
  rejected: 'bg-rose-500/10 text-rose-700',
}

function ApplicationsTab() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadApps() }, [filter])

  async function loadApps() {
    setLoading(true)
    try {
      const res = await careersAPI.listApplications(filter || undefined)
      setApps(Array.isArray(res?.data) ? res.data : [])
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(id, status) {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    try {
      await careersAPI.updateApplicationStatus(id, status)
    } catch {
      toast.error('Failed to update status')
      loadApps()
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-1 w-fit">
        {['', 'pending', 'reviewed', 'accepted', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              filter === s
                ? 'bg-warm-gold/[0.08] text-warm-plum border border-warm-gold/20'
                : 'text-warm-muted hover:text-warm-charcoal'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
          <Inbox size={32} className="mx-auto mb-3 text-warm-gold/30" />
          <p className="text-sm font-semibold text-warm-muted">No applications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden shadow-sm">
              <button
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-warm-ivory transition"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-warm-espresso text-sm">{app.full_name}</p>
                  <p className="text-xs text-warm-muted mt-0.5">{app.position} — {app.department}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-[0.1em] ${STATUS_STYLES[app.status] || STATUS_STYLES.pending}`}>
                  {app.status.toUpperCase()}
                </span>
                <ChevronDown size={15} className={`shrink-0 text-warm-muted transition ${expanded === app.id ? 'rotate-180' : ''}`} />
              </button>

              {expanded === app.id && (
                <div className="border-t border-warm-charcoal/[0.06] px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-0.5">EMAIL</p>
                      <p className="text-xs text-warm-charcoal">{app.email}</p>
                    </div>
                    {app.phone && (
                      <div>
                        <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-0.5">PHONE</p>
                        <p className="text-xs text-warm-charcoal">{app.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-0.5">APPLIED</p>
                      <p className="text-xs text-warm-charcoal">{new Date(app.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  {app.message && (
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-1">MESSAGE</p>
                      <p className="text-xs text-warm-muted leading-relaxed">{app.message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-2">UPDATE STATUS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['pending', 'reviewed', 'accepted', 'rejected'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(app.id, s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                            app.status === s
                              ? STATUS_STYLES[s] + ' border-transparent'
                              : 'border-warm-charcoal/[0.08] text-warm-muted hover:border-warm-charcoal/20 hover:text-warm-charcoal'
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEPARTMENTS = [
  'Worship & Arts',
  "Children's Ministry",
  'Outreach & Missions',
  'Media & Technology',
  'Hospitality',
  'Administration',
  'Other',
]

export default function AdminCareersPage() {
  const [tab, setTab] = useState('openings')
  const [openings, setOpenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({ department: DEPARTMENTS[0], title: '' })
  const [editForm, setEditForm] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await careersAPI.listAll()
      setOpenings(Array.isArray(res?.data) ? res.data : [])
    } catch {
      toast.error('Failed to load career openings')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const res = await careersAPI.create({ ...form, sort_order: 0 })
      const created = res?.data
      if (created) setOpenings((prev) => [...prev, { ...created, is_active: true }])
      setForm({ department: DEPARTMENTS[0], title: '' })
      toast.success('Opening added')
    } catch {
      toast.error('Failed to add opening')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(opening) {
    const updated = { ...opening, is_active: !opening.is_active }
    setOpenings((prev) => prev.map((o) => (o.id === opening.id ? updated : o)))
    try {
      await careersAPI.update(opening.id, { is_active: !opening.is_active })
    } catch {
      setOpenings((prev) => prev.map((o) => (o.id === opening.id ? opening : o)))
      toast.error('Failed to update')
    }
  }

  function startEdit(opening) {
    setEditingId(opening.id)
    setEditForm({ department: opening.department, title: opening.title })
  }

  async function handleEditSave(id) {
    if (!editForm.title?.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      await careersAPI.update(id, editForm)
      setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...editForm } : o)))
      setEditingId(null)
      toast.success('Opening updated')
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this opening?')) return
    setOpenings((prev) => prev.filter((o) => o.id !== id))
    try {
      await careersAPI.remove(id)
      toast.success('Opening removed')
    } catch {
      toast.error('Failed to remove')
      load()
    }
  }

  const grouped = openings.reduce((acc, o) => {
    const dept = o.department || 'Other'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(o)
    return acc
  }, {})

  const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-3 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted outline-none transition focus:border-warm-gold/40 focus:bg-white'
  const labelCls = 'block text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-1'

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-3">
            <Briefcase size={20} className="text-warm-gold" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">CAREERS</h1>
              <p className="mt-1 text-sm text-warm-muted">Manage openings and review applications.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-1 w-fit">
          {[['openings', 'Openings'], ['applications', 'Applications']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-5 py-1.5 text-xs font-semibold transition ${
                tab === key
                  ? 'bg-warm-gold/[0.08] text-warm-plum border border-warm-gold/20'
                  : 'text-warm-muted hover:text-warm-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'applications' ? <ApplicationsTab /> : (
          <>
            {/* Add form */}
            <form onSubmit={handleCreate} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm space-y-4">
              <p className="text-xs font-bold tracking-[0.18em] text-warm-charcoal">ADD NEW OPENING</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Department</label>
                  <select
                    className={inputCls}
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  >
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Position Title</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Sound Engineer"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  ADD OPENING
                </button>
              </div>
            </form>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
              </div>
            ) : openings.length === 0 ? (
              <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
                <Briefcase size={32} className="mx-auto mb-3 text-warm-gold/30" />
                <p className="text-sm font-semibold text-warm-muted">No openings yet</p>
                <p className="mt-1 text-xs text-warm-muted">Add one above to get started.</p>
              </div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, items]) => (
                <div key={dept} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-warm-charcoal/[0.06] bg-warm-ivory px-5 py-3">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">{dept.toUpperCase()}</p>
                  </div>
                  <ul className="divide-y divide-warm-charcoal/[0.05]">
                    {items.map((o) => (
                      <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                        {editingId === o.id ? (
                          <>
                            <select
                              className="flex-none rounded-lg border border-warm-charcoal/[0.1] bg-warm-ivory px-2 py-1.5 text-xs text-warm-charcoal outline-none focus:border-warm-gold/40"
                              value={editForm.department}
                              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                            >
                              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                            <input
                              className="min-w-0 flex-1 rounded-lg border border-warm-charcoal/[0.1] bg-warm-ivory px-2 py-1.5 text-xs text-warm-charcoal outline-none focus:border-warm-gold/40"
                              value={editForm.title}
                              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                              autoFocus
                            />
                            <button onClick={() => handleEditSave(o.id)} disabled={saving} className="text-warm-gold hover:opacity-70 transition">
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-warm-muted hover:text-warm-charcoal transition">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`flex-1 text-sm ${o.is_active ? 'text-warm-espresso' : 'text-warm-muted line-through'}`}>
                              {o.title}
                            </span>
                            {!o.is_active && (
                              <span className="rounded-full bg-warm-charcoal/[0.05] px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] text-warm-muted">
                                INACTIVE
                              </span>
                            )}
                            <button onClick={() => handleToggle(o)} title={o.is_active ? 'Deactivate' : 'Activate'} className="text-warm-muted hover:text-warm-gold transition">
                              {o.is_active ? <ToggleRight size={18} className="text-warm-gold" /> : <ToggleLeft size={18} />}
                            </button>
                            <button onClick={() => startEdit(o)} className="text-warm-muted hover:text-warm-charcoal transition">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(o.id)} className="text-warm-muted hover:text-rose-500 transition">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
