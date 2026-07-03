import { useEffect, useMemo, useState } from 'react'
import { attendanceAPI, reportsAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Calendar, Church, Download, Users } from 'lucide-react'
import { downloadPdfReport } from '../utils/pdfReport'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

const CHURCH_INFO = { name: 'Eternal Love Church', tagline: 'We love God and love people' }

const selectCls = 'rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-xs text-warm-charcoal focus:border-warm-gold/40 focus:outline-none focus:bg-white'

export default function AttendanceHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('month')
  const [myAttendance, setMyAttendance] = useState(null)
  const [reportRows, setReportRows] = useState([])
  const [leadershipDashboard, setLeadershipDashboard] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)

  const isLeadership = ['pastor', 'elder', 'admin', 'superadmin', 'zone_leader', 'cell_leader'].includes(user?.role)

  useEffect(() => { loadAttendance() }, [range, user?.role])

  const loadAttendance = async () => {
    try {
      setLoading(true)
      const startDate = getStartDate(range)
      const endDate = new Date().toISOString().split('T')[0]
      const requests = []
      if (attendanceAPI.getMyAttendance) {
        requests.push(attendanceAPI.getMyAttendance({ start_date: startDate, end_date: endDate }))
      }
      if (isLeadership) {
        requests.push(
          reportsAPI.getDashboard({ period: range, start_date: startDate, end_date: endDate }),
          reportsAPI.getAttendanceReport({ start_date: startDate, end_date: endDate }),
          reportsAPI.getComparison({ start_date: startDate, end_date: endDate })
        )
      }
      const results = await Promise.all(requests.filter(Boolean))
      setMyAttendance(results[0]?.data || null)
      if (isLeadership) {
        setLeadershipDashboard(results[1]?.data || null)
        setReportRows(results[2]?.data || [])
        setComparisonData(results[3]?.data || null)
      } else {
        setLeadershipDashboard(null)
        setReportRows([])
        setComparisonData(null)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load attendance history')
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const stats = myAttendance?.stats || {}
    const leadershipAttendance = leadershipDashboard?.attendance || {}
    const zoneRates = Array.isArray(comparisonData?.zones)
      ? comparisonData.zones.map((z) => Number(z.attendance_rate || 0)).filter(Number.isFinite)
      : []
    const cellRates = Array.isArray(comparisonData?.cells)
      ? comparisonData.cells.map((c) => Number(c.attendance_rate || 0)).filter(Number.isFinite)
      : []
    const average = (values) => values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0
    if (isLeadership) {
      return {
        sundayRate: average(zoneRates),
        cellRate: average(cellRates),
        sundayCount: Number(leadershipAttendance.total_sunday_checkins || 0),
        cellCount: Number(leadershipAttendance.total_cell_meetings || 0),
      }
    }
    return {
      sundayRate: stats.sunday_rate || 0,
      cellRate: stats.cell_rate || 0,
      sundayCount: stats.sunday_attended || 0,
      cellCount: stats.cell_attended || 0,
    }
  }, [comparisonData, isLeadership, leadershipDashboard, myAttendance])

  const exportCsv = () => {
    const rows = [
      ['Type', 'Date', 'Detail'],
      ...(myAttendance?.sunday_attendance || []).map((item) => ['Sunday', item.attendance_date, item.check_in_time || 'Checked in']),
      ...(myAttendance?.cell_attendance || []).map((item) => ['Cell', item.meeting_date, item.cell_name || 'Cell meeting']),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const lines = [
      `${CHURCH_INFO.name} Attendance History`,
      CHURCH_INFO.tagline,
      `Range: ${range}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      'Summary',
      `Sunday Rate: ${summary.sundayRate}%`,
      `Cell Rate: ${summary.cellRate}%`,
      `Sunday Attended: ${summary.sundayCount}`,
      `Cell Meetings: ${summary.cellCount}`,
      '',
      'My Attendance Timeline',
      ...[...(myAttendance?.sunday_attendance || []), ...(myAttendance?.cell_attendance || [])]
        .sort((a, b) => new Date(b.attendance_date || b.meeting_date) - new Date(a.attendance_date || a.meeting_date))
        .map((item) => `${item.attendance_date ? 'Sunday Service' : item.cell_name || 'Cell Meeting'} | ${item.attendance_date || item.meeting_date} | ${item.check_in_time || 'Recorded attendance'}`),
    ]
    downloadPdfReport(
      `${CHURCH_INFO.name.toLowerCase().replace(/\s+/g, '-')}-attendance-history-${new Date().toISOString().split('T')[0]}.pdf`,
      lines
    )
    toast.success('Attendance history downloaded as PDF.')
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
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ATTENDANCE HISTORY</h1>
            <p className="mt-2 text-sm text-warm-muted">Track Sunday and cell attendance records.</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className={selectCls}
            >
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Download size={13} />
              EXPORT PDF
            </button>
          </div>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Sunday Rate', value: `${summary.sundayRate}%`, helper: isLeadership ? 'Average zone rate' : 'Your rate', icon: Church },
            { label: 'Cell Rate', value: `${summary.cellRate}%`, helper: isLeadership ? 'Average cell rate' : 'Your cell rate', icon: Users },
            { label: 'Sunday Attended', value: summary.sundayCount, helper: isLeadership ? 'Total check-ins' : 'Your attendances', icon: Calendar },
            { label: 'Cell Meetings', value: summary.cellCount, helper: isLeadership ? 'Total meetings' : 'Your cell meetings', icon: Users },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-6">
          <DashboardPanel title="My Attendance Timeline" icon={Calendar}>
            <div className="space-y-2">
              {[...(myAttendance?.sunday_attendance || []), ...(myAttendance?.cell_attendance || [])]
                .sort((a, b) => new Date(b.attendance_date || b.meeting_date) - new Date(a.attendance_date || a.meeting_date))
                .map((item, index) => (
                  <div key={index} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                    <p className="text-sm font-semibold text-warm-espresso">
                      {item.attendance_date ? 'Sunday Service' : item.cell_name || 'Cell Meeting'}
                    </p>
                    <p className="text-xs text-warm-muted mt-0.5">{item.attendance_date || item.meeting_date}</p>
                    <p className="text-[11px] text-warm-muted mt-0.5">{item.check_in_time || 'Recorded attendance'}</p>
                  </div>
                ))}
              {(!myAttendance?.sunday_attendance?.length && !myAttendance?.cell_attendance?.length) && (
                <p className="text-sm text-warm-muted">No attendance records returned for this period.</p>
              )}
            </div>
          </DashboardPanel>

          {isLeadership && (
            <DashboardPanel title="Leadership Summary" icon={Users}>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {reportRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                    <p className="text-sm font-semibold text-warm-espresso">{row.first_name} {row.last_name}</p>
                    <p className="text-xs text-warm-muted mt-0.5">{row.zone_name || 'No zone'} · {row.cell_name || 'No cell'}</p>
                    <p className="text-[11px] text-warm-muted mt-1">
                      Sundays: {row.sunday_count || 0} · Cell: {row.cell_count || 0} · Score: {row.total_score || 0}
                    </p>
                  </div>
                ))}
                {!reportRows.length && <p className="text-sm text-warm-muted">No summary rows returned for this period.</p>}
              </div>
            </DashboardPanel>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function getStartDate(range) {
  const date = new Date()
  if (range === 'quarter') date.setMonth(date.getMonth() - 3)
  else if (range === 'year') date.setFullYear(date.getFullYear() - 1)
  else date.setMonth(date.getMonth() - 1)
  return date.toISOString().split('T')[0]
}
