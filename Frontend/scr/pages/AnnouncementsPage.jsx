import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../contexts/AuthContext'
import { announcementsAPI, cellsAPI, zonesAPI } from '../utils/api'
import { Calendar, Edit, Loader, Megaphone, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const defaultForm = {
  title: '',
  content: '',
  audience: 'all',
  zone_id: '',
  cell_id: '',
  expires_at: '',
  is_active: true,
  notify_whatsapp: true,
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Members' },
  { value: 'members', label: 'Members' },
  { value: 'zone_leaders', label: 'Zone Leaders' },
  { value: 'cell_leaders', label: 'Cell Leaders' },
  { value: 'specific_zones', label: 'Specific Zone' },
  { value: 'specific_cells', label: 'Specific Cell' },
]

function formatDate(str) {
  if (!str) return 'No expiry'
  return new Date(str).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [zones, setZones] = useState([])
  const [cells, setCells] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [formData, setFormData] = useState(defaultForm)

  const canManage = ['admin', 'pastor', 'superadmin'].includes(user?.role)

  const normalized = useMemo(
    () =>
      announcements.map((a) => ({
        ...a,
        id: a.id ?? a._id,
        authorName:
          `${a.created_by_first_name || ''} ${a.created_by_last_name || ''}`.trim() ||
          a.author ||
          'Church Admin',
        createdAt: a.created_at ?? a.createdAt,
        expiresAt: a.expires_at ?? a.endDate,
        isActive: Boolean(a.is_active ?? a.published ?? true),
      })),
    [announcements]
  )

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const reqs = [announcementsAPI.getAll({ active_only: canManage ? 0 : 1, limit: 100 })]
      if (canManage) {
        reqs.push(zonesAPI.getAll({ is_active: 1 }))
        reqs.push(cellsAPI.getAll({ is_active: 1 }))
      }
      const results = await Promise.all(reqs)
      setAnnouncements(Array.isArray(results[0]?.data) ? results[0].data : [])
      if (canManage) {
        setZones(Array.isArray(results[1]?.data) ? results[1].data : [])
        setCells(Array.isArray(results[2]?.data) ? results[2].data : [])
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData(defaultForm)
    setEditing(null)
    setShowForm(false)
  }

  const openEdit = (announcement) => {
    setEditing(announcement)
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      audience: announcement.audience || 'all',
      zone_id: announcement.zone_id || '',
      cell_id: announcement.cell_id || '',
      expires_at: announcement.expiresAt ? String(announcement.expiresAt).slice(0, 10) : '',
      is_active: announcement.isActive,
      notify_whatsapp: false,
    })
    setShowForm(true)
  }

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'audience' && value !== 'specific_zones' ? { zone_id: '' } : {}),
      ...(field === 'audience' && value !== 'specific_cells' ? { cell_id: '' } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      audience: formData.audience,
      zone_id: formData.audience === 'specific_zones' ? Number(formData.zone_id) : null,
      cell_id: formData.audience === 'specific_cells' ? Number(formData.cell_id) : null,
      expires_at: formData.expires_at || null,
      is_active: formData.is_active ? 1 : 0,
      notify_whatsapp: editing ? false : Boolean(formData.notify_whatsapp),
    }
    try {
      setSubmitting(true)
      if (editing?.id) {
        await announcementsAPI.update(editing.id, payload)
        toast.success('Announcement updated')
      } else {
        const res = await announcementsAPI.create(payload)
        const d = res?.data
        if (d) {
          const parts = [`Sent to ${d.recipients ?? 0} member(s)`]
          if (d.emails_sent != null)   parts.push(`${d.emails_sent} email(s)`)
          if (d.whatsapp_sent != null) parts.push(`${d.whatsapp_sent} WhatsApp(s)`)
          toast.success('Announcement created · ' + parts.join(', '))
        } else {
          toast.success('Announcement created')
        }
      }
      resetForm()
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to save announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return
    try {
      setActionLoading(announcement.id)
      await announcementsAPI.delete(announcement.id)
      setAnnouncements((prev) => prev.filter((a) => (a.id ?? a._id) !== announcement.id))
      if (selected?.id === announcement.id) setSelected(null)
      toast.success('Announcement deleted')
    } catch (error) {
      toast.error(error.message || 'Failed to delete')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggle = async (announcement) => {
    try {
      setActionLoading(announcement.id)
      await announcementsAPI.update(announcement.id, { is_active: announcement.isActive ? 0 : 1 })
      toast.success(announcement.isActive ? 'Announcement hidden' : 'Announcement published')
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setActionLoading(null)
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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ANNOUNCEMENTS</h1>
            <p className="mt-2 text-sm text-warm-muted">Church-wide updates for members and ministry teams.</p>
          </div>
          {canManage && !showForm && (
            <button
              onClick={() => { setEditing(null); setFormData(defaultForm); setShowForm(true) }}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Plus size={14} />
              CREATE
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && canManage && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">
                {editing ? 'EDIT ANNOUNCEMENT' : 'NEW ANNOUNCEMENT'}
              </p>
              <button onClick={resetForm} className="text-warm-muted transition hover:text-warm-charcoal">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className={inputCls}
                  placeholder="Announcement title"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  rows={5}
                  className={inputCls}
                  placeholder="Write the announcement message..."
                />
              </div>

              <div>
                <label className={labelCls}>Audience</label>
                <select
                  value={formData.audience}
                  onChange={(e) => updateField('audience', e.target.value)}
                  className={inputCls}
                >
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Expires On</label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => updateField('expires_at', e.target.value)}
                  className={inputCls}
                />
              </div>

              {formData.audience === 'specific_zones' && (
                <div>
                  <label className={labelCls}>Zone</label>
                  <select
                    value={formData.zone_id}
                    onChange={(e) => updateField('zone_id', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.audience === 'specific_cells' && (
                <div>
                  <label className={labelCls}>Cell</label>
                  <select
                    value={formData.cell_id}
                    onChange={(e) => updateField('cell_id', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select cell</option>
                    {cells.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-warm-charcoal/[0.07]">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-3 text-xs text-warm-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_active)}
                      onChange={(e) => updateField('is_active', e.target.checked)}
                      className="rounded accent-warm-gold"
                    />
                    Publish immediately
                  </label>
                  {!editing && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.notify_whatsapp)}
                        onChange={(e) => updateField('notify_whatsapp', e.target.checked)}
                        className="rounded accent-warm-gold"
                      />
                      <MessageSquare size={12} className={formData.notify_whatsapp ? 'text-warm-gold' : 'text-warm-muted'} />
                      <span className={formData.notify_whatsapp ? 'text-warm-charcoal font-semibold' : 'text-warm-muted'}>
                        Also send WhatsApp
                      </span>
                    </label>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-warm-charcoal/[0.07] px-4 py-2 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-warm-gold px-5 py-2 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editing ? 'UPDATE' : 'CREATE'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* List + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,0.7fr] gap-6">
          <div className="space-y-4">
            {normalized.length === 0 ? (
              <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
                <Megaphone size={32} className="mx-auto mb-4 text-warm-gold/30" />
                <p className="text-sm font-semibold text-warm-muted">
                  {canManage ? 'No announcements yet' : 'No active announcements'}
                </p>
              </div>
            ) : (
              normalized.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-2xl border bg-white p-5 transition cursor-pointer shadow-sm ${
                    selected?.id === a.id ? 'border-warm-gold/20' : 'border-warm-charcoal/[0.07] hover:border-warm-charcoal/[0.12]'
                  }`}
                  onClick={() => setSelected(a)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-sm font-semibold text-warm-charcoal">{a.title}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${
                          a.isActive ? 'text-emerald-700 bg-emerald-500/10' : 'text-warm-muted bg-warm-charcoal/[0.05]'
                        }`}>
                          {a.isActive ? 'PUBLISHED' : 'HIDDEN'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-warm-muted line-clamp-2 whitespace-pre-wrap">{a.content}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-warm-muted">
                        <span>{a.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(a.createdAt)}
                        </span>
                        <span>{(a.audience || 'all').replace(/_/g, ' ')}</span>
                        <span>Expires {formatDate(a.expiresAt)}</span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(a)}
                          className="rounded-lg p-2 text-warm-muted transition hover:bg-warm-ivory hover:text-warm-charcoal"
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(a)}
                          disabled={actionLoading === a.id}
                          className="rounded-lg p-2 text-warm-muted transition hover:bg-warm-gold/[0.08] hover:text-warm-gold disabled:opacity-40"
                          title={a.isActive ? 'Hide' : 'Publish'}
                        >
                          {actionLoading === a.id ? (
                            <Loader size={13} className="animate-spin" />
                          ) : (
                            <Megaphone size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          disabled={actionLoading === a.id}
                          className="rounded-lg p-2 text-warm-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail sidebar */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 h-fit sticky top-6 shadow-sm">
            <p className="mb-4 text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">ANNOUNCEMENT DETAILS</p>
            {selected ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] text-warm-muted mb-1">TITLE</p>
                  <p className="text-sm font-semibold text-warm-charcoal">{selected.title}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] text-warm-muted mb-1">MESSAGE</p>
                  <p className="text-xs text-warm-plum whitespace-pre-wrap">{selected.content}</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Audience', (selected.audience || 'all').replace(/_/g, ' ')],
                    ['Created', formatDate(selected.createdAt)],
                    ['Expiry', formatDate(selected.expiresAt)],
                    ['Status', selected.isActive ? 'Published' : 'Hidden'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-warm-charcoal/[0.05] pb-2">
                      <span className="text-warm-muted">{k}</span>
                      <span className="font-medium text-warm-espresso">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <Megaphone size={28} className="mx-auto mb-3 text-warm-gold/30" />
                <p className="text-xs text-warm-muted">Select an announcement to preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
