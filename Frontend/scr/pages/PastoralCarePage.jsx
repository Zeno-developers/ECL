import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { absenceAPI, followUpNotesAPI, membersAPI, prayerAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Calendar, HeartHandshake, Mail, Phone, Save, Send, Users } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'

const TABS = ['overview', 'follow-up', 'notes', 'prayer-care']

export default function PastoralCarePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [prayers, setPrayers] = useState([])
  const [flags, setFlags] = useState([])
  const [notes, setNotes] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    member_id: '', note: '', contact_method: 'phone', status: 'open', follow_up_date: '',
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [membersRes, prayersRes, flagsRes, notesRes] = await Promise.all([
        membersAPI.getMembers(),
        prayerAPI.getAllPrayers(),
        absenceAPI.getFlags(),
        followUpNotesAPI.getAll(),
      ])
      setMembers(Array.isArray(membersRes) ? membersRes : membersRes?.data || [])
      setPrayers(prayersRes?.data || prayersRes || [])
      setFlags(Array.isArray(flagsRes?.data) ? flagsRes.data : [])
      setNotes(Array.isArray(notesRes?.data) ? notesRes.data : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load pastoral care data')
    } finally {
      setLoading(false)
    }
  }

  const membersNeedingFollowUp = useMemo(() => {
    const flaggedIds = new Set(flags.map((f) => String(f.user_id ?? f.userId ?? f.id ?? '')))
    return members.filter((m) => {
      const id = String(m.id ?? m._id ?? '')
      return flaggedIds.has(id) || m.status === 'inactive'
    })
  }, [members, flags])

  const highPriorityPrayers = useMemo(
    () => (Array.isArray(prayers) ? prayers.filter((p) => p.priority === 'high' && (p.status === 'pending' || !p.status)) : []),
    [prayers]
  )

  const sundayFlags = useMemo(
    () => flags.filter((f) => (f.absence_type || 'sunday') !== 'cell'),
    [flags]
  )

  const cellFlags = useMemo(
    () => flags.filter((f) => (f.absence_type || 'sunday') === 'cell' || (f.absence_type || '') === 'combined' || Number(f.consecutive_cell_misses || 0) >= 2),
    [flags]
  )

  const handleSubmitNote = async (e) => {
    e.preventDefault()
    if (!form.member_id || !form.note.trim()) { toast.error('Select a member and add a note'); return }
    try {
      setSaving(true)
      await followUpNotesAPI.create(form)
      toast.success('Follow-up note saved')
      setForm({ member_id: '', note: '', contact_method: 'phone', status: 'open', follow_up_date: '' })
      await loadData()
      setActiveTab('notes')
    } catch (error) {
      toast.error(error.message || 'Failed to save follow-up note')
    } finally {
      setSaving(false)
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
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">PASTORAL CARE</h1>
          <p className="mt-2 text-sm text-warm-muted">
            Follow-up, prayer care, and member support backed by absence flags and prayer requests.
          </p>
        </div>

        {/* Stats */}
        <DashboardStatGrid
          stats={[
            { label: 'Need Follow-up', value: membersNeedingFollowUp.length, icon: Users },
            { label: 'Sunday Flags', value: sundayFlags.length, icon: Calendar },
            { label: 'Cell Flags', value: cellFlags.length, icon: HeartHandshake },
            { label: 'High Priority Prayers', value: highPriorityPrayers.length, icon: HeartHandshake },
            { label: 'Follow-up Notes', value: notes.length, icon: Mail },
          ]}
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-[0.1em] transition ${
                activeTab === tab
                  ? 'bg-warm-gold/[0.08] border border-warm-gold/20 text-warm-plum'
                  : 'border border-warm-charcoal/[0.07] bg-white text-warm-muted hover:text-warm-charcoal'
              }`}
            >
              {tab.replace('-', ' ').toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => navigate('/pastoral-care/follow-up')}
            className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal"
          >
            <Send size={12} />
            EMAIL FOLLOW-UP
          </button>
        </div>

        {(activeTab === 'overview' || activeTab === 'follow-up') && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">
            <DashboardPanel title="Members Needing Follow-up" icon={Users}>
              <div className="space-y-3">
                {membersNeedingFollowUp.map((member) => (
                  <div key={member.id || member._id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                    <p className="text-sm font-semibold text-warm-espresso">{member.name}</p>
                    <p className="mt-0.5 text-xs text-warm-muted">
                      {member.email || 'No email'}{member.phone ? ` · ${member.phone}` : ''}
                    </p>
                    <p className="mt-1 text-[10px] text-warm-muted">Status: {member.status || 'active'}</p>
                  </div>
                ))}
                {!membersNeedingFollowUp.length && flags.length > 0 && flags.map((flag) => (
                  <div key={flag.id} className="rounded-xl border border-amber-500/[0.12] bg-amber-500/[0.04] p-4">
                    <p className="text-sm font-semibold text-warm-espresso">{flag.first_name} {flag.last_name}</p>
                    <p className="mt-0.5 text-xs text-warm-muted">{flag.email || 'No email'}</p>
                    <p className="mt-1 text-[10px] text-warm-muted">
                      {flag.cell_name || 'No cell'}{flag.zone_name ? ` · ${flag.zone_name}` : ''}
                    </p>
                  </div>
                ))}
                {!membersNeedingFollowUp.length && !flags.length && (
                  <p className="text-xs text-warm-muted">No members currently need follow-up.</p>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Sunday vs Cell Follow-up" icon={HeartHandshake}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                  <p className="text-[9px] font-bold tracking-[0.18em] text-warm-gold/70 mb-3">SUNDAY FLAGS</p>
                  <div className="space-y-2">
                    {sundayFlags.slice(0, 5).map((flag) => (
                      <div key={flag.id} className="rounded-lg border border-warm-charcoal/[0.07] bg-white p-3">
                        <p className="text-xs font-semibold text-warm-espresso">{flag.first_name} {flag.last_name}</p>
                        <p className="mt-0.5 text-[10px] text-warm-muted">
                          {Number(flag.consecutive_sunday_misses || 0)} missed Sundays
                        </p>
                      </div>
                    ))}
                    {!sundayFlags.length && <p className="text-xs text-warm-muted">No Sunday flags.</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                  <p className="text-[9px] font-bold tracking-[0.18em] text-warm-gold/70 mb-3">CELL FLAGS</p>
                  <div className="space-y-2">
                    {cellFlags.filter((f) => f.cell_id).slice(0, 5).map((flag) => (
                      <div key={flag.id} className="rounded-lg border border-warm-charcoal/[0.07] bg-white p-3">
                        <p className="text-xs font-semibold text-warm-espresso">{flag.first_name} {flag.last_name}</p>
                        <p className="mt-0.5 text-[10px] text-warm-muted">
                          {Number(flag.consecutive_cell_misses || 0)} missed cell meetings
                        </p>
                      </div>
                    ))}
                    {!cellFlags.length && <p className="text-xs text-warm-muted">No cell flags.</p>}
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Add Follow-up Note" icon={Save}>
              <form onSubmit={handleSubmitNote} className="space-y-3">
                <select
                  value={form.member_id}
                  onChange={(e) => setForm((p) => ({ ...p, member_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                  ))}
                </select>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  rows={5}
                  className={inputCls}
                  placeholder="Write a follow-up note..."
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={form.contact_method}
                    onChange={(e) => setForm((p) => ({ ...p, contact_method: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="visit">Visit</option>
                    <option value="message">Message</option>
                  </select>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <input
                    type="date"
                    value={form.follow_up_date}
                    onChange={(e) => setForm((p) => ({ ...p, follow_up_date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                >
                  <Save size={13} />
                  {saving ? 'SAVING...' : 'SAVE NOTE'}
                </button>
              </form>
            </DashboardPanel>
          </div>
        )}

        {activeTab === 'notes' && (
          <DashboardPanel title="Follow-up Notes" icon={Mail}>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                  <p className="text-sm font-semibold text-warm-espresso">{note.first_name} {note.last_name}</p>
                  <p className="mt-1 text-xs text-warm-muted">{note.note}</p>
                  <p className="mt-1 text-[10px] text-warm-muted">
                    {note.contact_method || 'contact'} · {note.status || 'open'} · {note.follow_up_date || 'No date'}
                  </p>
                </div>
              ))}
              {!notes.length && <p className="text-xs text-warm-muted">No follow-up notes saved yet.</p>}
            </div>
          </DashboardPanel>
        )}

        {activeTab === 'follow-up' && (
          <DashboardPanel title="Flag Details" icon={Calendar}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                <p className="text-[9px] font-bold tracking-[0.18em] text-warm-gold/70 mb-3">SUNDAY SERVICE FLAGS</p>
                <div className="space-y-2">
                  {sundayFlags.map((flag) => (
                    <div key={flag.id} className="rounded-lg border border-warm-charcoal/[0.07] bg-white p-3">
                      <p className="text-xs font-semibold text-warm-espresso">{flag.first_name} {flag.last_name}</p>
                      <p className="text-[10px] text-warm-muted">
                        {flag.email || 'No email'} · {Number(flag.consecutive_sunday_misses || 0)} missed
                      </p>
                    </div>
                  ))}
                  {!sundayFlags.length && <p className="text-xs text-warm-muted">No Sunday flags.</p>}
                </div>
              </div>
              <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                <p className="text-[9px] font-bold tracking-[0.18em] text-warm-gold/70 mb-3">CELL MEETING FLAGS</p>
                <div className="space-y-2">
                  {cellFlags.map((flag) => (
                    <div key={flag.id} className="rounded-lg border border-warm-charcoal/[0.07] bg-white p-3">
                      <p className="text-xs font-semibold text-warm-espresso">{flag.first_name} {flag.last_name}</p>
                      <p className="text-[10px] text-warm-muted">
                        {flag.cell_name || 'No cell'} · {Number(flag.consecutive_cell_misses || 0)} missed
                      </p>
                    </div>
                  ))}
                  {!cellFlags.length && <p className="text-xs text-warm-muted">No cell flags.</p>}
                </div>
              </div>
            </div>
          </DashboardPanel>
        )}

        {activeTab === 'prayer-care' && (
          <DashboardPanel title="High Priority Prayer Care" icon={HeartHandshake}>
            <div className="space-y-3">
              {highPriorityPrayers.map((prayer) => (
                <div key={prayer.id || prayer._id} className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-warm-espresso">{prayer.title || 'Prayer Request'}</p>
                  <p className="mt-1 text-xs text-warm-muted">{prayer.description || prayer.request || 'No details.'}</p>
                  <div className="mt-2 flex items-center gap-4 text-[10px] text-warm-muted">
                    <span>{prayer.submittedBy || prayer.name || 'Anonymous'}</span>
                    <span>{prayer.createdAt || prayer.created_at || 'Recent'}</span>
                    <span className="flex items-center gap-1"><Phone size={10} /> Follow up</span>
                  </div>
                </div>
              ))}
              {!highPriorityPrayers.length && (
                <p className="text-xs text-warm-muted">No high priority prayer requests pending.</p>
              )}
            </div>
          </DashboardPanel>
        )}
      </div>
    </DashboardShell>
  )
}
