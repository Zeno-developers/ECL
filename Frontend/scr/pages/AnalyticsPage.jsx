import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { analyticsAPI, reportsAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Activity, AlertTriangle, BarChart3, Download, Globe, TrendingUp, Users } from 'lucide-react'
import { downloadPdfReport } from '../utils/pdfReport'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

function getToday() { return new Date().toISOString().split('T')[0] }
function getStartDate(period) {
  const d = new Date()
  if (period === 'quarter') d.setMonth(d.getMonth() - 3)
  else if (period === 'year') d.setFullYear(d.getFullYear() - 1)
  else d.setMonth(d.getMonth() - 1)
  return d.toISOString().split('T')[0]
}

const selectCls = 'rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none focus:bg-white'

const ROLE_BADGE = {
  zone_leader: 'text-blue-700 bg-blue-500/10',
  cell_leader: 'text-violet-700 bg-violet-500/10',
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [website, setWebsite] = useState({})
  const [engagement, setEngagement] = useState({})
  const [growth, setGrowth] = useState({})
  const [attendanceRows, setAttendanceRows] = useState([])

  useEffect(() => { loadAnalytics() }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const params = {}
      if (user?.role === 'zone_leader' && user?.zone_id) params.zone_id = user.zone_id
      else if (user?.role === 'cell_leader' && user?.cell_id) params.cell_id = user.cell_id

      const dateRange = { start_date: getStartDate(period), end_date: getToday(), ...params }

      const [websiteRes, engagementRes, growthRes, attendanceRes] = await Promise.all([
        analyticsAPI.getWebsite(params),
        analyticsAPI.getEngagement(params),
        reportsAPI.getGrowth(dateRange),
        reportsAPI.getAttendanceReport(dateRange),
      ])

      setWebsite(websiteRes?.data || websiteRes || {})
      setEngagement(engagementRes?.data || engagementRes || {})
      setGrowth(growthRes?.data || growthRes || {})

      let attendanceData = []
      if (attendanceRes) {
        if (Array.isArray(attendanceRes)) attendanceData = attendanceRes
        else if (Array.isArray(attendanceRes.data)) attendanceData = attendanceRes.data
        else if (attendanceRes.data && typeof attendanceRes.data === 'object') {
          const arr = Object.values(attendanceRes.data).find((v) => Array.isArray(v))
          attendanceData = arr || []
        }
      }
      setAttendanceRows(attendanceData)
    } catch (error) {
      toast.error(error.message || 'Failed to load analytics')
      setAttendanceRows([])
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => growth?.summary || {}, [growth])

  const attendanceInsights = useMemo(() => {
    if (!Array.isArray(attendanceRows)) return []
    const grouped = attendanceRows.reduce((acc, row) => {
      const key = row.cell_name || row.zone_name || 'Unassigned'
      if (!acc[key]) acc[key] = { label: key, members: 0, sunday: 0, cell: 0, total: 0 }
      acc[key].members += 1
      acc[key].sunday += Number(row.sunday_count || 0)
      acc[key].cell += Number(row.cell_count || 0)
      acc[key].total += Number(row.total_score || 0)
      return acc
    }, {})
    return Object.values(grouped)
      .map((item) => ({ ...item, avgScore: item.members ? Number((item.total / item.members).toFixed(1)) : 0 }))
      .sort((a, b) => a.avgScore - b.avgScore)
  }, [attendanceRows])

  const exportPdfReport = () => {
    const lines = [
      'Eternal Love Church Analytics Report',
      `Period: ${period}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      'Summary',
      `New Members: ${summary.total_new_members || 0}`,
      `Website Visitors: ${website.total_visitors || 0}`,
      `Avg Sunday Attendance: ${Math.round(summary.avg_sunday_attendance || 0)}`,
      `Avg Engagement Score: ${Math.round(summary.avg_engagement_score || 0)}`,
      '',
      'Attendance Pressure Points',
      ...(attendanceInsights.length
        ? attendanceInsights.map((item) => `${item.label} | Members: ${item.members} | Sunday: ${item.sunday} | Cell: ${item.cell} | Avg Score: ${item.avgScore}`)
        : ['No data available.']),
    ]
    downloadPdfReport(`eternal-love-analytics-${new Date().toISOString().split('T')[0]}.pdf`, lines)
    toast.success('Analytics report downloaded as PDF.')
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

  const roleBadgeClass = ROLE_BADGE[user?.role] || 'text-warm-plum bg-warm-gold/10'
  const roleLabel = user?.role === 'zone_leader' ? 'Zone Perspective' : user?.role === 'cell_leader' ? 'Cell Perspective' : 'Church-wide View'
  const RoleIcon = user?.role === 'zone_leader' ? TrendingUp : user?.role === 'cell_leader' ? Users : Globe

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ANALYTICS</h1>
            <p className="mt-2 text-sm text-warm-muted">Growth, attendance, and engagement insights.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-[0.18em] ${roleBadgeClass}`}>
              {roleLabel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Period + Export */}
        <div className="flex items-center justify-between gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={selectCls}
          >
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={exportPdfReport}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
          >
            <Download size={13} />
            EXPORT PDF
          </button>
        </div>

        {/* Stats */}
        <DashboardStatGrid
          stats={[
            { label: 'New Members', value: summary.total_new_members || 0, icon: Users },
            { label: 'New Cells', value: summary.total_new_cells || 0, icon: TrendingUp },
            { label: 'Avg Sunday Attendance', value: Math.round(summary.avg_sunday_attendance || 0), icon: Activity },
            { label: 'Website Visitors', value: website.total_visitors || 0, icon: Globe },
          ]}
        />

        {/* Growth + Engagement */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DashboardPanel title="Growth Summary" icon={TrendingUp}>
            <div className="space-y-3">
              {[
                ['Total New Members', summary.total_new_members || 0],
                ['Total New Cells', summary.total_new_cells || 0],
                ['Leader Promotions', summary.total_leader_promotions || 0],
                ['Avg Cell Attendance', Math.round(summary.avg_cell_attendance || 0)],
                ['Avg Engagement Score', Math.round(summary.avg_engagement_score || 0)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-warm-charcoal/[0.07] pb-3 text-sm">
                  <span className="text-warm-muted">{k}</span>
                  <span className="font-semibold text-warm-espresso">{v}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Engagement Snapshot" icon={Users}>
            <div className="space-y-3">
              {[
                ['Active Members', engagement.active_members || 0],
                ['Event Registrations', engagement.event_registrations || 0],
                ['Prayer Requests', engagement.prayer_requests || 0],
                ['Donations', engagement.donations || 0],
                ['Avg Donation Amount', `R ${Number(engagement.avg_donation_amount || 0).toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-warm-charcoal/[0.07] pb-3 text-sm">
                  <span className="text-warm-muted">{k}</span>
                  <span className="font-semibold text-warm-espresso">{v}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        {/* Pressure Points */}
        <DashboardPanel title="Attendance Pressure Points" icon={AlertTriangle}>
          <div className="space-y-3">
            {attendanceInsights.slice(0, 8).map((item) => (
              <div key={item.label} className="rounded-xl border border-amber-500/[0.12] bg-amber-500/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-warm-espresso">{item.label}</p>
                  <span className="text-xs font-semibold text-amber-600">Avg score {item.avgScore}</span>
                </div>
                <p className="mt-1 text-xs text-warm-muted">
                  Members: {item.members} · Sundays: {item.sunday} · Cell: {item.cell}
                </p>
              </div>
            ))}
            {!attendanceInsights.length && (
              <p className="text-xs text-warm-muted">No grouped attendance insights available for this period.</p>
            )}
          </div>
        </DashboardPanel>

        {/* Attendance Rows */}
        <DashboardPanel title="Attendance Report Rows" icon={BarChart3}>
          <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
            {attendanceRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                <p className="text-sm font-semibold text-warm-espresso">{row.first_name} {row.last_name}</p>
                <p className="mt-0.5 text-xs text-warm-muted">{row.zone_name || 'No zone'} · {row.cell_name || 'No cell'}</p>
                <p className="mt-1 text-[10px] text-warm-muted">
                  Sundays: {row.sunday_count || 0} · Cell: {row.cell_count || 0} · Score: {row.total_score || 0}
                </p>
              </div>
            ))}
            {!attendanceRows.length && (
              <p className="text-xs text-warm-muted">No attendance rows for the selected period.</p>
            )}
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
