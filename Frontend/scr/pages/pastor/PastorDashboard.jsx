import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  absenceAPI,
  eventsAPI,
  prayerAPI,
  reportsAPI,
} from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-toastify'
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  HeartHandshake,
  Home,
  RefreshCw,
  Users,
} from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

function Panel({ title, action, children }) {
  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 sm:p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Add Member', path: '/members/add', icon: Users },
  { label: 'Create Event', path: '/events/create', icon: Calendar },
  { label: 'Upload Sermon', path: '/sermons/upload', icon: BookOpen },
  { label: 'New Announcement', path: '/announcements', icon: Bell },
  { label: 'Pastoral Follow-Up', path: '/pastoral-care/follow-up', icon: HeartHandshake },
  { label: 'Manage Cells', path: '/zone/cells', icon: Home },
]

export default function PastorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboard, setDashboard] = useState({})
  const [absenceSummary, setAbsenceSummary] = useState({})
  const [prayers, setPrayers] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      if (!refreshing) setLoading(true)
      const [dashboardRes, absenceRes, prayersRes, eventsRes] = await Promise.all([
        reportsAPI.getDashboard({ period: 'month' }),
        absenceAPI.getSummary(),
        prayerAPI.getAllPrayers(),
        eventsAPI.getEvents(),
      ])
      setDashboard(dashboardRes?.data || {})
      setAbsenceSummary(absenceRes?.data || {})
      setPrayers(prayersRes?.data || prayersRes || [])
      setEvents(eventsRes?.data || eventsRes || [])
    } catch (error) {
      toast.error(error.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const pendingPrayers = useMemo(
    () => (Array.isArray(prayers) ? prayers.filter(p => p.status === 'pending' || !p.status) : []),
    [prayers]
  )

  const upcomingEvents = useMemo(
    () =>
      (Array.isArray(events) ? events : [])
        .filter(e => new Date(e.date || e.startDate) >= new Date())
        .sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate))
        .slice(0, 5),
    [events]
  )

  const openAbsenceFlags = absenceSummary?.absence_flags?.total_flags ?? 0
  const criticalAbsenceFlags = absenceSummary?.absence_flags?.critical ?? 0
  const pendingAbsenceRequests =
    absenceSummary?.pending_requests ?? absenceSummary?.pending_absence_requests ?? 0

  const recentActivity = useMemo(
    () => (Array.isArray(dashboard?.recent_activity) ? dashboard.recent_activity.slice(0, 6) : []),
    [dashboard]
  )

  const needsAttention = useMemo(() => {
    const items = []

    pendingPrayers
      .filter(p => p.priority === 'high')
      .slice(0, 3)
      .forEach(p => {
        items.push({
          id: `prayer-${p.id || p._id}`,
          type: 'PRAYER',
          badge: 'text-red-600 bg-red-500/10',
          title: p.title || 'Prayer Request',
          desc: p.description || p.request,
          date: p.created_at || p.date,
          urgent: true,
          onClick: () => navigate('/pastoral-care'),
        })
      })

    if (!items.length) {
      pendingPrayers.slice(0, 2).forEach(p => {
        items.push({
          id: `prayer-${p.id || p._id}`,
          type: 'PRAYER',
          badge: 'text-rose-600 bg-rose-500/10',
          title: p.title || 'Prayer Request',
          desc: p.description || p.request,
          date: p.created_at || p.date,
          urgent: false,
          onClick: () => navigate('/pastoral-care'),
        })
      })
    }

    if (openAbsenceFlags > 0) {
      items.push({
        id: 'absence',
        type: 'ATTENDANCE',
        badge: criticalAbsenceFlags > 0 ? 'text-orange-600 bg-orange-500/10' : 'text-amber-600 bg-amber-500/10',
        title: `${openAbsenceFlags} open absence ${openAbsenceFlags === 1 ? 'flag' : 'flags'}`,
        desc: criticalAbsenceFlags > 0 ? `${criticalAbsenceFlags} critical` : 'Needs pastoral review',
        urgent: criticalAbsenceFlags > 0,
        onClick: () => navigate('/pastoral-care'),
      })
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 2)
    upcomingEvents
      .filter(e => {
        const d = new Date(e.date || e.startDate)
        return !isNaN(d.getTime()) && d <= cutoff
      })
      .slice(0, 2)
      .forEach(e => {
        items.push({
          id: `event-${e.id || e._id}`,
          type: 'EVENT',
          badge: 'text-indigo-600 bg-indigo-500/10',
          title: e.title,
          desc: e.location || 'Church campus',
          date: e.date || e.startDate,
          urgent: false,
          onClick: () => navigate('/events/manage'),
        })
      })

    return items.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
  }, [pendingPrayers, openAbsenceFlags, criticalAbsenceFlags, upcomingEvents, navigate])

  const stats = [
    {
      label: 'ACTIVE MEMBERS',
      value: dashboard.membership?.total_members ?? 0,
      sub: 'total registered',
    },
    {
      label: 'PRAYER REQUESTS',
      value: pendingPrayers.length,
      sub: 'pending response',
    },
    {
      label: 'UPCOMING EVENTS',
      value: upcomingEvents.length,
      sub: 'scheduled ahead',
    },
    {
      label: 'AVG ATTENDANCE',
      value: Math.round(dashboard.attendance?.avg_sunday_attendance ?? 0),
      sub: 'sunday service',
    },
  ]

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

        {/* Greeting */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-warm-charcoal leading-[0.92]">
              {getGreeting()},<br />
              <span className="text-warm-gold">
                {(user?.first_name || 'PASTOR').toUpperCase()}.
              </span>
            </h1>
            <p className="mt-3 text-sm text-warm-muted">
              Here's what needs attention today.
            </p>
          </div>
          <button
            onClick={() => { setRefreshing(true); loadDashboard() }}
            disabled={refreshing}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-white text-warm-muted shadow-sm transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-3xl font-black tabular-nums text-warm-charcoal">{value}</p>
              <p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-warm-gold/70">{label}</p>
              <p className="mt-0.5 text-[10px] text-warm-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Needs Attention */}
        <Panel
          title="NEEDS ATTENTION"
          action={
            pendingAbsenceRequests > 0 ? (
              <span className="text-[9px] font-semibold tracking-[0.15em] text-amber-600">
                {pendingAbsenceRequests} PENDING
              </span>
            ) : null
          }
        >
          {needsAttention.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xl font-black tracking-tight text-warm-charcoal leading-tight">
                ALL CLEAR TODAY
              </p>
              <p className="mt-3 text-xs text-warm-muted">
                No urgent items require your attention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {needsAttention.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="group w-full border-b border-warm-charcoal/[0.05] pb-4 text-left last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] ${item.badge}`}
                    >
                      {item.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-warm-espresso leading-snug transition group-hover:text-warm-charcoal">
                        {item.title}
                      </p>
                      {item.desc && (
                        <p className="mt-1 text-xs text-warm-muted line-clamp-1">{item.desc}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.date && (
                        <span className="text-[10px] text-warm-muted">{formatDate(item.date)}</span>
                      )}
                      <ChevronRight
                        size={13}
                        className="text-warm-muted transition group-hover:text-warm-plum"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* Quick Actions + Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

          <Panel title="QUICK ACTIONS">
            <div className="space-y-1.5">
              {QUICK_ACTIONS.map(({ label, path, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-warm-charcoal/[0.07] bg-white px-3.5 py-3 text-left transition hover:border-warm-gold/20 hover:bg-warm-gold/[0.04]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-warm-charcoal/[0.07] bg-warm-ivory transition group-hover:border-warm-gold/20 group-hover:bg-warm-gold/[0.1]">
                    <Icon size={13} className="text-warm-muted transition group-hover:text-warm-gold" />
                  </div>
                  <span className="flex-1 text-xs font-semibold text-warm-muted transition group-hover:text-warm-charcoal">
                    {label}
                  </span>
                  <ChevronRight size={12} className="text-warm-gold/40 transition group-hover:text-warm-gold/70" />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="RECENT ACTIVITY">
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-xs text-warm-muted">No recent activity.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivity.map((activity, i) => (
                  <div
                    key={activity.id || i}
                    className="flex items-start gap-3.5 border-b border-warm-charcoal/[0.05] pb-3.5 last:border-0 last:pb-0"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warm-gold/60" />
                    <div className="min-w-0">
                      <p className="text-xs text-warm-muted leading-snug">
                        <span className="font-semibold text-warm-espresso">
                          {[activity.first_name, activity.last_name].filter(Boolean).join(' ') ||
                            'System'}
                        </span>
                        <span className="mx-1.5 text-warm-muted/40">·</span>
                        <span className="capitalize text-warm-muted">
                          {(activity.action || '').replaceAll('_', ' ')}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-warm-muted/70">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Footer */}
        <div className="border-t border-warm-charcoal/[0.07] pt-6 text-center">
          <p className="text-[9px] font-semibold tracking-[0.22em] text-warm-muted">
            PASTORAL CONTROL CENTER
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}
