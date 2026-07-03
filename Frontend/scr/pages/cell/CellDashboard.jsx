import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cellsAPI, attendanceAPI, reportsAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { Users, Calendar, Home, TrendingUp, CheckCircle, XCircle, AlertTriangle, Plus, BarChart3, UserPlus, Bell, RefreshCw } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../../components/dashboard/RoleDashboardUI'
import OnboardingCoachmarks from '../../components/onboarding/OnboardingCoachmarks'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function CellDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [cellInfo, setCellInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [recentAttendance, setRecentAttendance] = useState([])
  const [stats, setStats] = useState({})
  const [availableMembers, setAvailableMembers] = useState([])
  const [assigningMemberId, setAssigningMemberId] = useState(null)

  const onboardingKey = useMemo(() => `onboarding_cell_dashboard_${user?.id || user?._id || 'guest'}`, [user?._id, user?.id])
  const onboardingSteps = useMemo(() => [
    { title: 'Start with attendance', body: 'Use the attendance cards and recent check-ins to confirm your weekly gathering health.' },
    { title: 'Grow your cell', body: 'Quick Actions let you add members or assign leaders without leaving this page.' },
    { title: 'Watch trends', body: 'The stats grid shows conversion and retention percentages for your cell.' },
    { title: 'Need reassignment?', body: 'If you are not tied to a cell, an admin must assign you. Use the message banner to request help.' },
  ], [])

  useEffect(() => {
    if (user?.cell_id) fetchCellData()
    else if (user?.role === 'cell_leader') { toast.error('You must be assigned to a cell by an administrator'); navigate('/dashboard', { replace: true }) }
    else { toast.error('You do not have permission to access this page'); navigate('/dashboard', { replace: true }) }
  }, [user?.cell_id, user?.role])

  const fetchCellData = async () => {
    try {
      if (!refreshing) setLoading(true)
      const [cellRes, attendanceRes, dashboardRes, availableRes] = await Promise.allSettled([
        cellsAPI.getCell(user.cell_id),
        attendanceAPI.getCellAttendance({ cell_id: user.cell_id, start_date: '1970-01-01', end_date: new Date().toISOString().split('T')[0] }),
        reportsAPI.getDashboard({ period: 'month' }),
        cellsAPI.getAvailableMembers(user.cell_id),
      ])
      if (cellRes.status === 'fulfilled') { setCellInfo(cellRes.value.data.cell); setMembers(cellRes.value.data.members || []) }
      if (attendanceRes.status === 'fulfilled') setRecentAttendance(attendanceRes.value.data || [])
      if (dashboardRes.status === 'fulfilled') {
        const data = dashboardRes.value.data
        if (data?.cell_info) setStats({ memberCount: data.member_count || 0, totalMeetings: data.total_meetings || 0, ...data })
      }
      if (availableRes.status === 'fulfilled') setAvailableMembers(availableRes.value.data || [])
    } catch {
      toast.error('Failed to load cell data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => { setRefreshing(true); fetchCellData() }
  const handleLogout = () => { logout(); navigate('/login') }

  const handleAssignMember = async (memberUserId) => {
    try {
      setAssigningMemberId(memberUserId)
      await cellsAPI.assignMember(user.cell_id, memberUserId)
      toast.success('Member assigned to your cell')
      await fetchCellData()
    } catch (error) {
      toast.error(error.message || 'Failed to assign member')
    } finally {
      setAssigningMemberId(null)
    }
  }

  const getAttendanceRate = () => {
    if (!members.length) return 0
    const totalPossible = members.length * (recentAttendance.length || 1)
    const totalAttended = recentAttendance.reduce((s, m) => s + (Array.isArray(m.attendees) ? m.attendees.length : 0), 0)
    return totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0
  }

  const lowAttendanceMembers = members.filter((m) => (m.recent_attendance?.total || 0) <= 2)

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
      <OnboardingCoachmarks storageKey={onboardingKey} steps={onboardingSteps} title="Cell leader quick tour" />
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70 mb-1">CELL LEADER</p>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">{cellInfo?.name?.toUpperCase() || 'MY CELL'}</h1>
            <p className="mt-2 text-sm text-warm-muted">
              {cellInfo?.meeting_day ? `Meets on ${cellInfo.meeting_day}s at ${cellInfo.meeting_time}` : 'Cell attendance, members, and quick actions.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Cell Members', value: members.length, icon: Users },
            { label: 'Meetings Held', value: stats.totalMeetings || 0, icon: Calendar },
            { label: 'Avg Attendance', value: `${getAttendanceRate()}%`, icon: TrendingUp },
            { label: 'Zone', value: cellInfo?.zone_name || 'N/A', icon: BarChart3 },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr,1fr] gap-6">
          <DashboardPanel
            title={`Cell Members (${members.length})`}
            icon={Users}
            action={
              <button
                onClick={() => navigate('/members/add')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90"
              >
                <Plus size={11} />
                ADD
              </button>
            }
          >
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users size={36} className="mx-auto mb-3 text-warm-gold/30" />
                <p className="text-sm text-warm-muted">No members in this cell yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    className="w-full flex items-center justify-between rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4 transition hover:bg-white text-left"
                    onClick={() => navigate('/members')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-warm-gold/10 border border-warm-gold/20 flex items-center justify-center text-warm-gold text-xs font-bold shrink-0">
                        {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-warm-espresso">{member.first_name} {member.last_name}</p>
                        <p className="text-xs text-warm-muted">{member.email}</p>
                        {member.member_number && <p className="text-[10px] text-warm-muted">#{member.member_number}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-warm-muted">Attendance (30d)</p>
                      <p className="text-xs font-semibold text-warm-plum">{member.recent_attendance?.total || 0} events</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DashboardPanel>

          <div className="space-y-6">
            <DashboardPanel title="Quick Actions" icon={CheckCircle}>
              <div className="space-y-2">
                {[
                  { label: 'Record Attendance', desc: 'Capture this week\'s cell attendance.', onClick: () => navigate('/cell/attendance') },
                  { label: 'Announcements', desc: 'Review updates sent to the church.', onClick: () => navigate('/announcements') },
                  { label: 'Cell Requests', desc: 'Review member requests linked to cell movement.', onClick: () => navigate('/leadership/cell-change-requests') },
                ].map(({ label, desc, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="w-full text-left rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3.5 transition hover:bg-white hover:border-warm-charcoal/[0.12]"
                  >
                    <p className="text-xs font-semibold text-warm-espresso">{label}</p>
                    <p className="text-[10px] text-warm-muted mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Assign Members To Cell" icon={UserPlus}>
              {availableMembers.length === 0 ? (
                <p className="text-sm text-warm-muted">No available members to assign right now.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {availableMembers.slice(0, 20).map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                      <div>
                        <p className="text-xs font-semibold text-warm-espresso">{member.first_name} {member.last_name}</p>
                        <p className="text-[10px] text-warm-muted">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleAssignMember(member.id)}
                        disabled={assigningMemberId === member.id}
                        className="rounded-xl bg-warm-gold px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                      >
                        {assigningMemberId === member.id ? '...' : 'ASSIGN'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel title="Alerts & Notes" icon={AlertTriangle}>
              <div className="space-y-2">
                {lowAttendanceMembers.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle size={14} />
                      <span className="text-xs font-semibold">{lowAttendanceMembers.length} members with low attendance</span>
                    </div>
                    <p className="text-[10px] text-red-600/70 mt-1">Consider following up with these members.</p>
                  </div>
                )}
                {members.length < (cellInfo?.max_members || 5) && (
                  <div className="rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] p-3">
                    <div className="flex items-center gap-2 text-warm-plum">
                      <Users size={14} />
                      <span className="text-xs font-semibold">Space available</span>
                    </div>
                    <p className="text-[10px] text-warm-muted mt-1">You can add up to {cellInfo?.max_members || 5} members.</p>
                  </div>
                )}
                {cellInfo?.meeting_day && (
                  <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                    <div className="flex items-center gap-2 text-warm-plum">
                      <Calendar size={14} />
                      <span className="text-xs font-semibold">Next Meeting</span>
                    </div>
                    <p className="text-[10px] text-warm-muted mt-1">{cellInfo.meeting_day}s at {cellInfo.meeting_time}</p>
                    {cellInfo.meeting_location && <p className="text-[10px] text-warm-muted">{cellInfo.meeting_location}</p>}
                  </div>
                )}
                {!lowAttendanceMembers.length && members.length >= (cellInfo?.max_members || 5) && !cellInfo?.meeting_day && (
                  <p className="text-sm text-warm-muted">No alerts at this time.</p>
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
