import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { disciplesAPI, membersAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import {
  Bell, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  Plus, Trash2, Users, X, XCircle, AlertTriangle, TrendingUp,
  Clock, MapPin, CheckCheck, Eye,
} from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

// ─── Shared input class ───────────────────────────────────────────────────────
const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`
}

const fmtDateTime = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-warm-charcoal/[0.08] bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold text-warm-espresso">{title}</p>
          <button onClick={onClose}><X size={16} className="text-warm-muted hover:text-warm-charcoal" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Avatar({ name, picture, size = 9 }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  return picture
    ? <img src={picture} alt={name} className={`${cls} object-cover border-2 border-warm-gold/20`} />
    : <div className={`${cls} bg-warm-gold/10 border-2 border-warm-gold/20 flex items-center justify-center text-xs font-bold text-warm-gold`}>{initials}</div>
}

function AbsenceBadge({ streak }) {
  if (streak < 2) return null
  const isAlert = streak >= 3
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${isAlert ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
      <AlertTriangle size={9} />
      {streak} missed
    </span>
  )
}

function AttendanceRing({ rate }) {
  if (rate === null || rate === undefined) return null
  const color = rate >= 75 ? 'text-emerald-600 bg-emerald-50' : rate >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${color}`}>{rate}%</span>
  )
}

const RSVP_CONFIG = {
  yes:   { label: 'Going',        icon: '✓', pill: 'bg-emerald-500 text-white', border: 'border-emerald-500/30 bg-emerald-500/[0.06]', text: 'text-emerald-700', btn: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 hover:bg-emerald-500/20' },
  maybe: { label: 'Maybe',        icon: '~', pill: 'bg-amber-500 text-white',   border: 'border-amber-500/30 bg-amber-500/[0.06]',     text: 'text-amber-700',   btn: 'bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20' },
  no:    { label: "Can't make it", icon: '✕', pill: 'bg-red-500 text-white',    border: 'border-red-500/30 bg-red-500/[0.06]',         text: 'text-red-600',     btn: 'bg-red-500/10 border-red-500/25 text-red-700 hover:bg-red-500/20' },
}

function RsvpButtons({ myRsvp, onChange, disabled }) {
  const [changing, setChanging] = useState(false)
  const cfg = myRsvp ? RSVP_CONFIG[myRsvp] : null

  if (cfg && !changing) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${cfg.border}`}>
        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.icon} {cfg.label}</span>
        <span className="text-warm-charcoal/20 text-xs">·</span>
        <button
          onClick={() => setChanging(true)}
          className="text-[10px] text-warm-muted hover:text-warm-charcoal transition font-medium"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {Object.entries(RSVP_CONFIG).map(([status, c]) => (
        <button
          key={status}
          disabled={disabled}
          onClick={() => { onChange(status); setChanging(false) }}
          className={`rounded-lg border px-3 py-1 text-[10px] font-bold tracking-wide transition disabled:opacity-50 ${c.btn}`}
        >
          {c.label}
        </button>
      ))}
      {changing && (
        <button onClick={() => setChanging(false)} className="text-[10px] text-warm-muted hover:text-warm-charcoal transition">cancel</button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const TABS = ['members', 'meetings', 'lessons', 'notices']

export default function DisciplesGroupPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const groupId = parseInt(id)

  const [group,      setGroup]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('members')
  const [meetings,   setMeetings]   = useState([])
  const [lessons,    setLessons]    = useState([])
  const [notices,    setNotices]    = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [enrolledUserIds, setEnrolledUserIds] = useState(new Set())
  const [saving,     setSaving]     = useState(false)

  // Modals
  const [addMemberModal,  setAddMemberModal]  = useState(false)
  const [memberSearch,    setMemberSearch]    = useState('')
  const [meetingModal,    setMeetingModal]    = useState(false)
  const [meetingForm,     setMeetingForm]     = useState({ title: '', meeting_date: '', meeting_time: '', location: '', notes: '' })
  const [attendanceModal, setAttendanceModal] = useState(null)
  const [attendance,      setAttendance]      = useState([])
  const [checkedIds,      setCheckedIds]      = useState(new Set())
  const [rsvpListModal,   setRsvpListModal]   = useState(null)
  const [rsvpList,        setRsvpList]        = useState({ rsvps: [], summary: {} })
  const [lessonModal,     setLessonModal]     = useState(null)
  const [lessonForm,      setLessonForm]      = useState({ title: '', content: '', published: 1 })
  const [expandedLesson,  setExpandedLesson]  = useState(null)
  const [noticeModal,     setNoticeModal]     = useState(false)
  const [noticeForm,      setNoticeForm]      = useState({ title: '', message: '' })

  const isLeader = group?.leader_id === user?.id || ['admin', 'pastor', 'superadmin', 'elder'].includes(user?.role)
  const myId     = user?.id

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadGroup = useCallback(async () => {
    try {
      setLoading(true)
      const res = await disciplesAPI.getGroup(groupId)
      setGroup(res?.data || null)
    } catch (e) {
      toast.error(e.message || 'Failed to load group')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  const loadMeetings = useCallback(async () => {
    try {
      const r = await disciplesAPI.listMeetings(groupId)
      setMeetings(r?.data || [])
    } catch {}
  }, [groupId])

  const loadLessons = useCallback(async () => {
    try {
      const r = await disciplesAPI.listLessons(groupId)
      setLessons(r?.data || [])
    } catch {}
  }, [groupId])

  const loadNotices = useCallback(async () => {
    try {
      const r = await disciplesAPI.listNotices(groupId)
      setNotices(r?.data || [])
    } catch {}
  }, [groupId])

  useEffect(() => { loadGroup() }, [loadGroup])

  useEffect(() => {
    if (tab === 'meetings') loadMeetings()
    if (tab === 'lessons')  loadLessons()
    if (tab === 'notices')  loadNotices()
  }, [tab, loadMeetings, loadLessons, loadNotices])

  useEffect(() => {
    if (isLeader) {
      membersAPI.getAll({ limit: 500 })
        .then(r => setAllMembers(r?.data?.members || r?.data || []))
        .catch(() => {})
      disciplesAPI.getEnrolledUsers()
        .then(r => {
          const rows = r?.data || []
          setEnrolledUserIds(new Set(
            rows.filter(e => e.group_id !== groupId).map(e => Number(e.user_id))
          ))
        })
        .catch(() => {})
    }
  }, [isLeader, groupId])

  // ── Members ──────────────────────────────────────────────────────────────────
  const handleAddMember = async (m) => {
    try {
      await disciplesAPI.addMember(groupId, m.user_id)
      toast.success(`${m.first_name} added`)
      setAddMemberModal(false)
      setMemberSearch('')
      loadGroup()
    } catch (e) { toast.error(e.message) }
  }

  const handleRemoveMember = async (userId) => {
    try {
      await disciplesAPI.removeMember(groupId, userId)
      toast.success('Member removed')
      loadGroup()
    } catch (e) { toast.error(e.message) }
  }

  // group.members have users.id; allMembers from membersAPI have members.id but user_id = users.id
  const memberIds      = new Set((group?.members || []).map(m => m.id))
  const availableToAdd = allMembers.filter(m =>
    !memberIds.has(m.user_id) &&
    !enrolledUserIds.has(Number(m.user_id)) &&
    m.user_id !== group?.leader_id &&
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 8)

  // ── Meetings ─────────────────────────────────────────────────────────────────
  const handleCreateMeeting = async () => {
    if (!meetingForm.title || !meetingForm.meeting_date) return toast.error('Title and date are required')
    try {
      setSaving(true)
      await disciplesAPI.createMeeting(groupId, meetingForm)
      toast.success('Meeting created')
      setMeetingModal(false)
      setMeetingForm({ title: '', meeting_date: '', meeting_time: '', location: '', notes: '' })
      loadMeetings()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleRsvp = async (meetingId, status) => {
    try {
      await disciplesAPI.submitRsvp(meetingId, status)
      setMeetings(prev => prev.map(m =>
        m.id === meetingId ? { ...m, my_rsvp: status } : m
      ))
    } catch (e) { toast.error(e.message) }
  }

  const openRsvpList = async (meeting) => {
    setRsvpListModal(meeting)
    try {
      const r = await disciplesAPI.getMeetingRsvps(meeting.id)
      setRsvpList(r?.data || { rsvps: [], summary: {} })
    } catch {}
  }

  const openAttendance = async (meeting) => {
    setAttendanceModal(meeting)
    const r = await disciplesAPI.getMeetingAttendance(meeting.id)
    const rows = r?.data || []
    setAttendance(rows)
    setCheckedIds(new Set(rows.filter(x => x.attended).map(x => x.user_id)))
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      await disciplesAPI.saveAttendance(attendanceModal.id, Array.from(checkedIds))
      toast.success('Attendance saved')
      setAttendanceModal(null)
      loadMeetings()
      loadGroup()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  // ── Lessons ───────────────────────────────────────────────────────────────────
  const handleExpandLesson = async (lesson) => {
    const closing = expandedLesson?.id === lesson.id
    setExpandedLesson(closing ? null : lesson)
    if (!closing && !lesson.my_read_at) {
      try {
        await disciplesAPI.markLessonRead(lesson.id)
        const now = new Date().toISOString()
        setLessons(prev => prev.map(l =>
          l.id === lesson.id
            ? { ...l, my_read_at: now, read_count: (parseInt(l.read_count) || 0) + 1 }
            : l
        ))
      } catch {}
    }
  }

  const handleCreateLesson = async () => {
    if (!lessonForm.title || !lessonForm.content) return toast.error('Title and content are required')
    try {
      setSaving(true)
      if (lessonModal === 'create') {
        await disciplesAPI.createLesson(groupId, lessonForm)
        toast.success('Lesson posted')
      } else {
        await disciplesAPI.updateLesson(lessonModal.id, lessonForm)
        toast.success('Lesson updated')
      }
      setLessonModal(null)
      setLessonForm({ title: '', content: '', published: 1 })
      loadLessons()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDeleteLesson = async (lessonId) => {
    try {
      await disciplesAPI.deleteLesson(lessonId)
      toast.success('Lesson deleted')
      loadLessons()
    } catch (e) { toast.error(e.message) }
  }

  // ── Notices ───────────────────────────────────────────────────────────────────
  const handleCreateNotice = async () => {
    if (!noticeForm.title || !noticeForm.message) return toast.error('Title and message are required')
    try {
      setSaving(true)
      await disciplesAPI.createNotice(groupId, noticeForm)
      toast.success('Notice sent')
      setNoticeModal(false)
      setNoticeForm({ title: '', message: '' })
      loadNotices()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDeleteNotice = async (noticeId) => {
    try {
      await disciplesAPI.deleteNotice(noticeId)
      toast.success('Notice deleted')
      loadNotices()
    } catch (e) { toast.error(e.message) }
  }

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (loading) return (
    <DashboardShell>
      <div className="flex h-full items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
      </div>
    </DashboardShell>
  )

  if (!group) return (
    <DashboardShell>
      <div className="flex items-center justify-center py-32 text-warm-muted text-sm">Group not found.</div>
    </DashboardShell>
  )

  const upcomingMeetings = meetings.filter(m => m.meeting_date >= today())
  const pastMeetings     = meetings.filter(m => m.meeting_date < today())

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="border-b border-warm-charcoal/[0.07] pb-6">
          <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70 mb-1">DISCIPLES GROUP</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">{group.name.toUpperCase()}</h1>
              {group.description && <p className="mt-1.5 text-sm text-warm-muted max-w-xl">{group.description}</p>}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-warm-muted">
                  Led by <span className="font-semibold text-warm-espresso">{group.leader_name}</span>
                </span>
                <span className="text-warm-charcoal/20 text-xs">·</span>
                <span className="text-xs text-warm-muted">
                  <span className="font-semibold text-warm-espresso">{group.members?.length || 0}</span> members
                </span>
                {group.my_role && (
                  <span className={`text-[9px] font-bold tracking-[0.15em] px-2.5 py-0.5 rounded-full ${group.my_role === 'leader' ? 'bg-warm-gold/10 text-warm-gold' : 'bg-warm-charcoal/[0.06] text-warm-muted'}`}>
                    {group.my_role.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* My attendance summary — only shown to members (not leaders) */}
          {!isLeader && group.my_stats && (
            <div className="mt-4 inline-flex items-center gap-4 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory px-4 py-2.5">
              <div className="text-center">
                <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted mb-0.5">MY ATTENDANCE</p>
                <p className="text-lg font-black text-warm-espresso">{group.my_stats.attended}/{group.my_stats.total}</p>
              </div>
              <div className="h-8 w-px bg-warm-charcoal/[0.08]" />
              <div className="text-center">
                <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted mb-0.5">RATE</p>
                <p className={`text-lg font-black ${(group.my_stats.rate ?? 0) >= 75 ? 'text-emerald-600' : (group.my_stats.rate ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {group.my_stats.rate ?? 0}%
                </p>
              </div>
              {group.my_stats.absence_streak >= 2 && (
                <>
                  <div className="h-8 w-px bg-warm-charcoal/[0.08]" />
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-semibold">{group.my_stats.absence_streak} meetings missed in a row</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Leader stats bar */}
          {isLeader && group.members?.length > 0 && (
            <div className="mt-4 flex gap-4 flex-wrap">
              {[
                { label: 'MEMBERS', value: group.members.length },
                { label: 'MEETINGS TRACKED', value: group.members[0]?.meetings_tracked ?? 0 },
                {
                  label: 'AVG ATTENDANCE',
                  value: group.members.length > 0
                    ? Math.round(group.members.reduce((s, m) => s + (m.attendance_rate ?? 0), 0) / group.members.length) + '%'
                    : '—',
                },
                {
                  label: 'NEEDS FOLLOW-UP',
                  value: group.members.filter(m => m.absence_streak >= 2).length,
                },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory px-4 py-2.5 text-center">
                  <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted">{s.label}</p>
                  <p className="text-xl font-black text-warm-espresso mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-1 w-fit overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition whitespace-nowrap ${tab === t ? 'bg-white shadow-sm text-warm-espresso' : 'text-warm-muted hover:text-warm-charcoal'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MEMBERS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'members' && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">
                MEMBERS ({group.members?.length || 0})
              </p>
              {isLeader && (
                <button onClick={() => setAddMemberModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90">
                  <Plus size={11} /> ADD
                </button>
              )}
            </div>

            {group.members?.length ? (
              <div className="space-y-2">
                {group.members.map(m => {
                  const isMe = m.id === myId
                  return (
                    <div key={m.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${isMe ? 'border-warm-gold/20 bg-warm-gold/[0.03]' : 'border-warm-charcoal/[0.06] bg-warm-ivory'}`}>
                      <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-warm-espresso">{m.first_name} {m.last_name}</p>
                          {isMe && <span className="text-[8px] font-bold tracking-wide text-warm-gold bg-warm-gold/10 px-1.5 py-0.5 rounded-full">YOU</span>}
                          <AbsenceBadge streak={m.absence_streak} />
                        </div>
                        <p className="text-xs text-warm-muted truncate">{m.email}</p>
                      </div>
                      {isLeader && (
                        <div className="flex items-center gap-3 shrink-0">
                          <AttendanceRing rate={m.attendance_rate} />
                          <button onClick={() => handleRemoveMember(m.id)}
                            className="text-warm-muted hover:text-red-500 transition">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-warm-muted py-6 text-center">No members yet.{isLeader ? ' Add some.' : ''}</p>
            )}

            {/* Absence follow-up list for leaders */}
            {isLeader && group.members?.filter(m => m.absence_streak >= 2).length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700">FOLLOW-UP NEEDED</p>
                </div>
                <div className="space-y-1.5">
                  {group.members.filter(m => m.absence_streak >= 2).map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="text-sm text-amber-900 font-medium">{m.first_name} {m.last_name}</span>
                      <span className="text-xs text-amber-700">{m.absence_streak} consecutive missed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MEETINGS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'meetings' && (
          <div className="space-y-4">

            {/* Upcoming */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">UPCOMING</p>
                {isLeader && (
                  <button onClick={() => setMeetingModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90">
                    <Plus size={11} /> NEW
                  </button>
                )}
              </div>

              {upcomingMeetings.length ? (
                <div className="space-y-3">
                  {upcomingMeetings.map(m => (
                    <div key={m.id} className="rounded-xl border border-warm-charcoal/[0.07] p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-bold text-warm-espresso">{m.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-warm-muted">
                              <Calendar size={11} /> {fmtDate(m.meeting_date)}
                            </span>
                            {m.meeting_time && (
                              <span className="inline-flex items-center gap-1 text-xs text-warm-muted">
                                <Clock size={11} /> {fmtTime(m.meeting_time)}
                              </span>
                            )}
                            {m.location && (
                              <span className="inline-flex items-center gap-1 text-xs text-warm-muted">
                                <MapPin size={11} /> {m.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {isLeader && (
                          <button onClick={() => openRsvpList(m)}
                            className="shrink-0 rounded-xl border border-warm-charcoal/20 px-3 py-1.5 text-[10px] font-semibold text-warm-charcoal/60 hover:text-warm-charcoal hover:border-warm-charcoal/30 transition whitespace-nowrap">
                            View RSVPs
                          </button>
                        )}
                      </div>

                      {/* RSVP section */}
                      <div className="pt-3 border-t border-warm-charcoal/[0.06] space-y-2">
                        {/* Everyone can RSVP */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {!m.my_rsvp && <span className="text-[10px] font-semibold text-warm-muted">Are you coming?</span>}
                          <RsvpButtons
                            myRsvp={m.my_rsvp}
                            onChange={(status) => handleRsvp(m.id, status)}
                          />
                        </div>
                        {/* Leaders also see the count summary */}
                        {isLeader && (
                          <div className="flex items-center gap-4 text-xs text-warm-muted flex-wrap">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 size={12} /> {m.rsvp_yes ?? 0} going
                            </span>
                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">~ {m.rsvp_maybe ?? 0} maybe</span>
                            <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                              <XCircle size={12} /> {m.rsvp_no ?? 0} can't
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-warm-muted py-4 text-center">No upcoming meetings.{isLeader ? ' Schedule one.' : ''}</p>
              )}
            </div>

            {/* Past */}
            {pastMeetings.length > 0 && (
              <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70 mb-4">PAST MEETINGS</p>
                <div className="space-y-2">
                  {pastMeetings.map(m => (
                    <div key={m.id} className="flex items-center gap-4 rounded-xl border border-warm-charcoal/[0.06] bg-warm-ivory px-4 py-3">
                      <Calendar size={14} className="text-warm-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-warm-espresso">{m.title}</p>
                        <p className="text-xs text-warm-muted">{fmtDate(m.meeting_date)}{m.location ? ` · ${m.location}` : ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-warm-charcoal">{m.attended_count}/{m.total_members}</p>
                        <p className="text-[10px] text-warm-muted">attended</p>
                      </div>
                      {isLeader && (
                        <button onClick={() => openAttendance(m)}
                          className="shrink-0 rounded-xl border border-warm-charcoal/20 bg-white px-3 py-1.5 text-[10px] font-semibold text-warm-charcoal/60 hover:text-warm-charcoal hover:border-warm-charcoal/30 transition">
                          Attendance
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            LESSONS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'lessons' && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">LESSONS</p>
              {isLeader && (
                <button onClick={() => { setLessonForm({ title: '', content: '', published: 1 }); setLessonModal('create') }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90">
                  <Plus size={11} /> POST
                </button>
              )}
            </div>

            {lessons.length ? (
              <div className="space-y-2">
                {lessons.map(l => {
                  const isExpanded = expandedLesson?.id === l.id
                  const isRead     = !!l.my_read_at

                  return (
                    <div key={l.id} className={`rounded-xl border transition ${isRead ? 'border-warm-charcoal/[0.07]' : 'border-warm-gold/20'}`}>
                      {/* Lesson header — always visible */}
                      <button
                        onClick={() => handleExpandLesson(l)}
                        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-warm-espresso">{l.title}</p>
                            {!l.published && (
                              <span className="text-[9px] font-bold tracking-wide text-warm-muted bg-warm-charcoal/[0.06] px-2 py-0.5 rounded-full">DRAFT</span>
                            )}
                          </div>
                          <p className="text-xs text-warm-muted mt-0.5">
                            {l.author} · {fmtDateTime(l.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isLeader && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-warm-muted bg-warm-charcoal/[0.05] px-2 py-0.5 rounded-full">
                              <Eye size={9} /> {l.read_count ?? 0}
                            </span>
                          )}
                          {isRead ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCheck size={9} /> Read
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-warm-gold bg-warm-gold/10 px-2 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={14} className="text-warm-muted" /> : <ChevronDown size={14} className="text-warm-muted" />}
                        </div>
                      </button>

                      {/* Lesson body — expanded */}
                      {isExpanded && (
                        <div className="border-t border-warm-charcoal/[0.06] px-4 py-4">
                          <p className="text-sm text-warm-charcoal/80 whitespace-pre-line leading-relaxed">{l.content}</p>
                          {isLeader && (
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => { setLessonForm({ title: l.title, content: l.content, published: l.published }); setLessonModal(l) }}
                                className="rounded-xl border border-warm-charcoal/20 px-3 py-1.5 text-[10px] font-semibold text-warm-charcoal/60 hover:text-warm-charcoal transition">
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(l.id)}
                                className="rounded-xl border border-red-200 px-3 py-1.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 transition">
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-warm-muted py-6 text-center">No lessons posted yet.</p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            NOTICES TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'notices' && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-bold tracking-[0.2em] text-warm-gold/70">NOTICES</p>
              {isLeader && (
                <button onClick={() => setNoticeModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90">
                  <Plus size={11} /> POST
                </button>
              )}
            </div>

            {notices.length ? (
              <div className="space-y-3">
                {notices.map(n => (
                  <div key={n.id} className="rounded-xl border border-warm-charcoal/[0.07] p-4 flex gap-4">
                    <Bell size={14} className="text-warm-gold shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-warm-espresso">{n.title}</p>
                      <p className="text-xs text-warm-muted mb-1">{n.author} · {fmtDateTime(n.created_at)}</p>
                      <p className="text-sm text-warm-charcoal/80">{n.message}</p>
                    </div>
                    {isLeader && (
                      <button onClick={() => handleDeleteNotice(n.id)} className="text-warm-muted hover:text-red-500 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-muted py-6 text-center">No notices yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Add Member */}
      {addMemberModal && (
        <Modal title="Add Member" onClose={() => { setAddMemberModal(false); setMemberSearch('') }}>
          <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus
            placeholder="Search members…" className={`${inputCls} mb-3`} />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableToAdd.map(m => (
              <button key={m.id} onClick={() => handleAddMember(m)}
                className="w-full flex items-center gap-2.5 rounded-xl border border-warm-charcoal/[0.06] bg-white px-3 py-2 text-left hover:bg-warm-ivory transition">
                <Avatar name={`${m.first_name} ${m.last_name}`} picture={m.profile_picture} size={8} />
                <div>
                  <p className="text-sm text-warm-espresso font-semibold">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-warm-muted">{m.email}</p>
                </div>
              </button>
            ))}
            {!availableToAdd.length && (
              <p className="text-xs text-warm-muted text-center py-4">
                {memberSearch
                  ? 'No matches found'
                  : 'No available members — everyone is already assigned to a discipleship group'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* New Meeting */}
      {meetingModal && (
        <Modal title="Schedule Meeting" onClose={() => setMeetingModal(false)}>
          <div className="space-y-3">
            <input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Meeting title *" className={inputCls} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={meetingForm.meeting_date} onChange={e => setMeetingForm(f => ({ ...f, meeting_date: e.target.value }))} className={inputCls} />
              <input type="time" value={meetingForm.meeting_time} onChange={e => setMeetingForm(f => ({ ...f, meeting_time: e.target.value }))} className={inputCls} />
            </div>
            <input value={meetingForm.location} onChange={e => setMeetingForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Location (optional)" className={inputCls} />
            <textarea value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)" rows={3} className={`${inputCls} resize-none`} />
            <button onClick={handleCreateMeeting} disabled={saving}
              className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90 disabled:opacity-50">
              {saving ? 'Creating…' : 'SCHEDULE MEETING'}
            </button>
          </div>
        </Modal>
      )}

      {/* RSVP List (for leaders) */}
      {rsvpListModal && (
        <Modal title={`RSVPs — ${rsvpListModal.title}`} onClose={() => setRsvpListModal(null)}>
          <div className="flex gap-4 mb-4">
            {[['yes', 'emerald'], ['maybe', 'amber'], ['no', 'red']].map(([status, color]) => (
              <div key={status} className={`flex-1 rounded-xl bg-${color}-50 border border-${color}-200 p-3 text-center`}>
                <p className={`text-2xl font-black text-${color}-700`}>{rsvpList.summary?.[status] ?? 0}</p>
                <p className={`text-[9px] font-bold tracking-wide text-${color}-600`}>{RSVP_CONFIG[status].label.toUpperCase()}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {rsvpList.rsvps?.map(r => (
              <div key={r.user_id} className="flex items-center gap-2.5 rounded-xl border border-warm-charcoal/[0.06] px-3 py-2">
                <Avatar name={`${r.first_name} ${r.last_name}`} picture={r.profile_picture} size={7} />
                <p className="flex-1 text-sm font-medium text-warm-espresso">{r.first_name} {r.last_name}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  r.status === 'yes' ? 'bg-emerald-50 text-emerald-700' :
                  r.status === 'maybe' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-600'
                }`}>{RSVP_CONFIG[r.status]?.label}</span>
              </div>
            ))}
            {!rsvpList.rsvps?.length && <p className="text-xs text-warm-muted text-center py-4">No RSVPs yet.</p>}
          </div>
        </Modal>
      )}

      {/* Attendance */}
      {attendanceModal && (
        <Modal title={`Attendance — ${attendanceModal.title}`} onClose={() => setAttendanceModal(null)}>
          <p className="text-xs text-warm-muted mb-3">Tap each person to mark attended / not attended.</p>
          <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto">
            {attendance.map(a => {
              const checked = checkedIds.has(a.user_id)
              return (
                <button key={a.user_id}
                  onClick={() => setCheckedIds(s => { const n = new Set(s); checked ? n.delete(a.user_id) : n.add(a.user_id); return n })}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${checked ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-warm-charcoal/[0.07] hover:bg-warm-ivory'}`}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={`${a.first_name} ${a.last_name}`} picture={a.profile_picture} size={7} />
                    <span className="text-sm font-semibold text-warm-espresso">{a.first_name} {a.last_name}</span>
                  </div>
                  {checked
                    ? <CheckCircle2 size={16} className="text-emerald-600" />
                    : <XCircle size={16} className="text-warm-muted" />}
                </button>
              )
            })}
            {!attendance.length && <p className="text-xs text-warm-muted text-center py-3">No members in attendance list yet.</p>}
          </div>
          <button onClick={handleSaveAttendance} disabled={saving}
            className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 py-2.5 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50">
            {saving ? 'Saving…' : `Save (${checkedIds.size} attended)`}
          </button>
        </Modal>
      )}

      {/* Lesson Create/Edit */}
      {lessonModal && (
        <Modal title={lessonModal === 'create' ? 'Post Lesson' : 'Edit Lesson'} onClose={() => setLessonModal(null)} wide>
          <div className="space-y-3">
            <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Lesson title *" className={inputCls} autoFocus />
            <textarea value={lessonForm.content} onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write the lesson content here…" rows={10} className={`${inputCls} resize-none`} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pub" checked={lessonForm.published === 1}
                onChange={e => setLessonForm(f => ({ ...f, published: e.target.checked ? 1 : 0 }))}
                className="rounded" />
              <label htmlFor="pub" className="text-xs text-warm-muted">Publish immediately</label>
            </div>
            <button onClick={handleCreateLesson} disabled={saving}
              className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : lessonModal === 'create' ? 'POST LESSON' : 'UPDATE LESSON'}
            </button>
          </div>
        </Modal>
      )}

      {/* Notice */}
      {noticeModal && (
        <Modal title="Post Notice" onClose={() => setNoticeModal(false)}>
          <div className="space-y-3">
            <input value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notice title *" className={inputCls} autoFocus />
            <textarea value={noticeForm.message} onChange={e => setNoticeForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Message to all group members…" rows={4} className={`${inputCls} resize-none`} />
            <button onClick={handleCreateNotice} disabled={saving}
              className="w-full rounded-xl bg-warm-gold py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso hover:opacity-90 disabled:opacity-50">
              {saving ? 'Sending…' : 'SEND TO ALL MEMBERS'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
