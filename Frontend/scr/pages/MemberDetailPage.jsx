import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import {
  User, Mail, Phone, MapPin, Calendar, Shield, FileText, Edit,
  Users, Heart, GitBranch, BookOpen, Clock, TrendingUp, DollarSign,
  CheckCircle, XCircle, AlertCircle, Activity, Star, Home, ChevronRight,
  LogIn, Smartphone, AtSign, Baby, UserCheck,
} from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d, opts = {}) => {
  if (!d) return 'Not recorded'
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', ...opts })
}
const fmtDT = (d) => {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmtAgo = (d) => {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
const initials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?'

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-warm-charcoal/[0.06] px-5 py-4">
        <Icon size={13} className="text-warm-gold" />
        <p className="text-[10px] font-bold tracking-[0.18em] text-warm-gold/80 uppercase">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.05] py-2.5 last:border-0">
      <span className="text-xs text-warm-muted shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-warm-espresso text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function Badge({ color, children }) {
  const colors = {
    green:  'bg-emerald-500/10 text-emerald-700',
    amber:  'bg-amber-500/10 text-amber-700',
    red:    'bg-red-500/10 text-red-600',
    blue:   'bg-blue-500/10 text-blue-700',
    purple: 'bg-purple-500/10 text-purple-700',
    gray:   'bg-warm-charcoal/[0.06] text-warm-muted',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function PersonPill({ name, sub }) {
  if (!name) return null
  const [fn, ...rest] = name.split(' ')
  return (
    <div className="flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory px-3 py-2">
      <div className="w-7 h-7 rounded-full bg-warm-gold/10 border border-warm-gold/20 flex items-center justify-center text-[10px] font-bold text-warm-gold">
        {initials(fn, rest[0])}
      </div>
      <div>
        <p className="text-xs font-semibold text-warm-espresso">{name}</p>
        {sub && <p className="text-[10px] text-warm-muted">{sub}</p>}
      </div>
    </div>
  )
}

function AttendanceDots({ records }) {
  if (!records?.length) return <p className="text-xs text-warm-muted">No attendance recorded</p>
  const last20 = records.slice(0, 20).reverse()
  return (
    <div className="flex flex-wrap gap-1">
      {last20.map((r, i) => (
        <div key={i} title={fmt(r.attendance_date)}
          className="w-3 h-3 rounded-sm bg-emerald-500/70" />
      ))}
    </div>
  )
}

const PRAYER_STATUS_COLOR = { pending: 'amber', approved: 'blue', praying: 'purple', answered: 'green', rejected: 'red', archived: 'gray' }
const ACTION_LABELS = { login: 'Logged in', logout: 'Logged out', profile_update: 'Updated profile', password_change: 'Changed password', rsvp: 'RSVP\'d to event' }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    setLoading(true)
    membersAPI.getOverview(id)
      .then(r => setData(r?.data || null))
      .catch(e => { toast.error(e.message || 'Failed to load'); navigate('/members') })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <DashboardShell>
      <div className="flex h-full items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
      </div>
    </DashboardShell>
  )
  if (!data) return null

  const { member, zone, cell, lineage, family, disciples_groups, led_groups,
          sunday_attendance, cell_attendance_12m, giving, prayers, engagement, activity_log, login_count } = data

  const fullName = `${member.first_name} ${member.last_name}`
  const userId = member.user_id

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-7">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-warm-gold/10 border-2 border-warm-gold/20 flex items-center justify-center text-xl font-black text-warm-gold">
              {initials(member.first_name, member.last_name)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-warm-charcoal">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge color={member.is_active ? 'green' : 'red'}>{member.is_active ? 'Active' : 'Inactive'}</Badge>
                <Badge color="blue">{capitalize(member.role)}</Badge>
                {member.email_verified ? <Badge color="green"><AtSign size={9} className="mr-0.5" />Email verified</Badge>
                  : <Badge color="amber"><AtSign size={9} className="mr-0.5" />Email unverified</Badge>}
                {member.phone_verified ? <Badge color="green"><Smartphone size={9} className="mr-0.5" />Phone verified</Badge>
                  : <Badge color="gray"><Smartphone size={9} className="mr-0.5" />Phone unverified</Badge>}
              </div>
              <p className="text-xs text-warm-muted mt-1.5">{member.member_number} · Joined {fmt(member.membership_date)}</p>
            </div>
          </div>
          <button onClick={() => navigate(`/members/edit/${member.id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso hover:opacity-90 transition shrink-0">
            <Edit size={12} /> EDIT
          </button>
        </div>

        {/* ── Quick stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Last Login', value: fmtAgo(member.last_login), icon: LogIn },
            { label: 'Login Count', value: login_count || '0', icon: Activity },
            { label: 'Sunday Visits', value: sunday_attendance.total_12m, icon: CheckCircle },
            { label: 'Cell Visits', value: cell_attendance_12m, icon: Home },
            { label: 'Total Given', value: giving.summary?.total > 0 ? `R ${Number(giving.summary.total).toLocaleString()}` : 'R 0', icon: DollarSign },
            { label: 'Prayers', value: prayers.count, icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-warm-gold" />
                <p className="text-[9px] font-bold tracking-[0.15em] text-warm-muted uppercase">{label}</p>
              </div>
              <p className="text-base font-black text-warm-espresso">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Contact & Personal */}
            <Section title="Contact & Personal" icon={User}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <Row label="Email" value={member.email} />
                  <Row label="Phone" value={member.phone} />
                  <Row label="Address" value={member.address} />
                  <Row label="Birthday" value={fmt(member.date_of_birth)} />
                  <Row label="Baptism" value={fmt(member.baptism_date)} />
                </div>
                <div>
                  <Row label="Gender" value={capitalize(member.gender)} />
                  <Row label="Marital Status" value={capitalize(member.marital_status)} />
                  <Row label="Emergency Contact" value={member.emergency_contact} />
                  <Row label="Emergency Phone" value={member.emergency_phone} />
                  <Row label="Member ID" value={member.member_number} mono />
                </div>
              </div>
              {member.notes && (
                <div className="mt-3 rounded-xl bg-warm-ivory border border-warm-charcoal/[0.06] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-muted mb-1">Pastoral Notes</p>
                  <p className="text-sm text-warm-espresso leading-relaxed whitespace-pre-wrap">{member.notes}</p>
                </div>
              )}
            </Section>

            {/* Church Structure */}
            <Section title="Church Structure" icon={Home}>
              <Row label="Zone" value={zone?.name} />
              <Row label="Cell" value={cell?.name} />
              {cell && <>
                <Row label="Cell Leader" value={cell.leader_name} />
                <Row label="Meeting" value={cell.meeting_day ? `${capitalize(cell.meeting_day)}s at ${cell.meeting_time?.slice(0,5)}` : null} />
                <Row label="Location" value={cell.meeting_location} />
              </>}
            </Section>

            {/* Spiritual Lineage */}
            <Section title="Spiritual Lineage" icon={GitBranch}>
              <Row label="Spiritual Parent" value={lineage?.parent_name} />
              <Row label="Direct Disciples" value={lineage?.direct_disciples ?? 0} />
              <Row label="Generation" value={lineage?.spiritual_parent_id ? '2+' : '1 (root)'} />
              {!lineage?.spiritual_parent_id && (
                <p className="text-[10px] text-warm-muted mt-2">No spiritual parent recorded — root generation.</p>
              )}
            </Section>

            {/* Family */}
            <Section title="Family Connections" icon={Heart}>
              {family.spouse || family.parents.length || family.children.length ? (
                <div className="space-y-4">
                  {family.spouse && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-muted mb-2">Spouse</p>
                      <PersonPill name={`${family.spouse.first_name} ${family.spouse.last_name}`} sub="Spouse" />
                    </div>
                  )}
                  {family.parents.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-muted mb-2">Parents</p>
                      <div className="flex flex-wrap gap-2">
                        {family.parents.map(p => <PersonPill key={p.id} name={`${p.first_name} ${p.last_name}`} sub="Parent" />)}
                      </div>
                    </div>
                  )}
                  {family.children.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-muted mb-2">Children</p>
                      <div className="flex flex-wrap gap-2">
                        {family.children.map(c => <PersonPill key={c.id} name={`${c.first_name} ${c.last_name}`} sub="Child" />)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-warm-muted">No family connections recorded.</p>
              )}
            </Section>

            {/* Disciples Groups */}
            {(disciples_groups.length > 0 || led_groups.length > 0) && (
              <Section title="Disciples Groups" icon={Users}>
                {led_groups.map(g => (
                  <div key={g.id} className="flex items-center justify-between rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] px-3 py-2 mb-2">
                    <span className="text-xs font-semibold text-warm-espresso">{g.name}</span>
                    <Badge color="amber">Leader</Badge>
                  </div>
                ))}
                {disciples_groups.map(g => (
                  <div key={g.id} className="flex items-center justify-between rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory px-3 py-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-warm-espresso">{g.name}</span>
                      <p className="text-[10px] text-warm-muted">Leader: {g.leader_name} · Joined {fmt(g.joined_at)}</p>
                    </div>
                    <Badge color="blue">Member</Badge>
                  </div>
                ))}
              </Section>
            )}

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">

            {/* Account Activity */}
            <Section title="Account Activity" icon={Activity}>
              <Row label="Account Created" value={fmtDT(member.user_created_at)} />
              <Row label="Last Login" value={fmtDT(member.last_login)} />
              <Row label="Total Logins" value={login_count} />
              <Row label="Email Verified" value={member.email_verified ? '✓ Yes' : '✗ No'} />
              <Row label="Phone Verified" value={member.phone_verified ? '✓ Yes' : '✗ No'} />
            </Section>

            {/* Sunday Attendance */}
            <Section title="Sunday Attendance (12 months)" icon={CheckCircle}>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-2xl font-black text-warm-espresso">{sunday_attendance.total_12m}</p>
                  <p className="text-[10px] text-warm-muted">services attended</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-warm-espresso">{cell_attendance_12m}</p>
                  <p className="text-[10px] text-warm-muted">cell meetings</p>
                </div>
              </div>
              <AttendanceDots records={sunday_attendance.records} />
              {sunday_attendance.records.length > 0 && (
                <p className="text-[10px] text-warm-muted mt-2">Last attended: {fmt(sunday_attendance.records[0]?.attendance_date)}</p>
              )}
            </Section>

            {/* Engagement Scores */}
            {engagement.length > 0 && (
              <Section title="Engagement Scores" icon={TrendingUp}>
                <div className="space-y-2">
                  {engagement.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-warm-muted w-16 shrink-0">{new Date(e.month_year).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-warm-charcoal/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-warm-gold/60" style={{ width: `${Math.min(100, e.total_score)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-warm-espresso w-8 text-right">{e.total_score}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Giving */}
            <Section title="Giving" icon={DollarSign}>
              {giving.summary?.count > 0 ? (
                <>
                  <div className="flex items-center gap-6 mb-3">
                    <div>
                      <p className="text-xl font-black text-warm-espresso">R {Number(giving.summary.total).toLocaleString()}</p>
                      <p className="text-[10px] text-warm-muted">total given</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-warm-espresso">{giving.summary.count}</p>
                      <p className="text-[10px] text-warm-muted">transactions</p>
                    </div>
                  </div>
                  <Row label="Last Gift" value={fmt(giving.summary.last_gift_date)} />
                  {giving.recent.map((g, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-warm-charcoal/[0.05] last:border-0">
                      <span className="text-xs text-warm-muted">{fmt(g.service_date)} · {g.fund || 'General'}</span>
                      <span className="text-xs font-bold text-warm-espresso">R {Number(g.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-warm-muted">No giving records found.</p>
              )}
            </Section>

            {/* Prayer Requests */}
            <Section title="Prayer Requests" icon={Star}>
              {prayers.count > 0 ? (
                <>
                  <p className="text-xs text-warm-muted mb-3">{prayers.count} total request{prayers.count !== 1 ? 's' : ''}</p>
                  <div className="space-y-2">
                    {prayers.recent.map(p => (
                      <div key={p.id} className="flex items-start justify-between gap-2 rounded-xl border border-warm-charcoal/[0.06] bg-warm-ivory px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-warm-espresso truncate">{p.title}</p>
                          <p className="text-[10px] text-warm-muted">{fmt(p.created_at)}</p>
                        </div>
                        <Badge color={PRAYER_STATUS_COLOR[p.status] || 'gray'}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-warm-muted">No prayer requests recorded.</p>
              )}
            </Section>

            {/* Activity Log */}
            <Section title="Recent Activity" icon={Clock}>
              {activity_log.length > 0 ? (
                <div className="space-y-2">
                  {activity_log.map((log, i) => (
                    <div key={i} className="flex items-start gap-2.5 border-b border-warm-charcoal/[0.05] pb-2 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-warm-gold/60 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-warm-espresso font-medium">{ACTION_LABELS[log.action] || capitalize(log.action.replace(/_/g, ' '))}</p>
                        {log.details && <p className="text-[10px] text-warm-muted truncate">{log.details}</p>}
                      </div>
                      <span className="text-[10px] text-warm-muted shrink-0 whitespace-nowrap">{fmtAgo(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-warm-muted">No activity recorded yet. Activity is logged on login and key actions.</p>
              )}
            </Section>

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
