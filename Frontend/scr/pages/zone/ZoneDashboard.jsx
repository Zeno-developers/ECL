import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { zonesAPI } from '../../utils/api'
import { toast } from 'react-toastify'
import { MapPin, Users, Home, TrendingUp, BarChart3, Eye, Calendar, Church, RefreshCw } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../../components/dashboard/RoleDashboardUI'
import OnboardingCoachmarks from '../../components/onboarding/OnboardingCoachmarks'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function ZoneDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [zoneInfo, setZoneInfo] = useState(null)
  const [cells, setCells] = useState([])
  const [stats, setStats] = useState({})

  const onboardingKey = useMemo(() => `onboarding_zone_dashboard_${user?.id || user?._id || 'guest'}`, [user?._id, user?.id])
  const onboardingSteps = useMemo(() => [
    { title: 'Verify your zone', body: 'The header shows the zone name and coverage. If this is wrong, request reassignment.' },
    { title: 'Review cells quickly', body: 'Cards list each cell with leaders and recent attendance — tap to drill into details.' },
    { title: 'Watch movement', body: 'The stats grid tracks members, attendance, and meetings. Refresh after services to stay current.' },
    { title: 'Send updates', body: 'Use quick actions to message cell leaders or open the main dashboard for broader tasks.' },
  ], [])

  useEffect(() => {
    if (user?.zone_id) fetchZoneData()
    else { toast.error('You are not assigned to a zone'); navigate('/dashboard') }
  }, [user?.zone_id])

  const fetchZoneData = async () => {
    try {
      if (!refreshing) setLoading(true)
      const [zoneRes, statsRes] = await Promise.allSettled([
        zonesAPI.getZone(user.zone_id),
        zonesAPI.getStats(),
      ])
      if (zoneRes.status === 'fulfilled') {
        const data = zoneRes.value.data
        setZoneInfo(data.zone)
        setCells(data.cells || [])
      }
      if (statsRes.status === 'fulfilled') {
        const data = statsRes.value.data
        if (data?.zones) {
          const zoneStats = data.zones.find((z) => Number(z.id) === Number(user.zone_id))
          if (zoneStats) setStats({ totalMembers: zoneStats.member_count || 0, totalCells: data.summary?.total_cells || 0, ...zoneStats })
        }
      }
    } catch {
      toast.error('Failed to load zone data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => { setRefreshing(true); fetchZoneData() }
  const handleLogout = () => { logout(); navigate('/login') }

  const getCapacityRate = () => {
    if (!cells.length) return 0
    const totalCapacity = cells.reduce((s, c) => s + (c.max_members || 5), 0)
    const totalMembers = cells.reduce((s, c) => s + (c.member_count || 0), 0)
    return totalCapacity > 0 ? Math.round((totalMembers / totalCapacity) * 100) : 0
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
      <OnboardingCoachmarks storageKey={onboardingKey} steps={onboardingSteps} title="Zone leader quick tour" />
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
            <p className="text-[10px] font-bold tracking-[0.22em] text-warm-gold/70 mb-1">ZONE LEADER</p>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">{zoneInfo?.name?.toUpperCase() || 'MY ZONE'}</h1>
            <p className="mt-2 text-sm text-warm-muted">Cell health, member coordination, and zone overview.</p>
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
            { label: 'Total Cells', value: cells.length, icon: Home },
            { label: 'Zone Members', value: stats.totalMembers || 0, icon: Users },
            { label: 'Cell Capacity', value: `${getCapacityRate()}%`, icon: TrendingUp },
            { label: 'Active Leaders', value: zoneInfo?.leader_first_name ? '1' : '0', icon: Church },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr,1fr] gap-6">
          <DashboardPanel
            title="Cells in This Zone"
            icon={Home}
            action={<span className="text-[10px] font-bold tracking-[0.15em] text-warm-gold/70">{cells.length} CELLS</span>}
          >
            {cells.length === 0 ? (
              <div className="text-center py-12">
                <Home size={36} className="mx-auto mb-3 text-warm-gold/30" />
                <p className="text-sm text-warm-muted">No cells in this zone yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cells.map((cell) => {
                  const pct = Math.round(((cell.member_count || 0) / (cell.max_members || 1)) * 100)
                  return (
                    <div key={cell.id} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm font-bold text-warm-espresso">{cell.name}</p>
                          <p className="text-xs text-warm-muted mt-0.5">Leader: {cell.leader_first_name} {cell.leader_last_name}</p>
                          {cell.meeting_day && (
                            <p className="text-xs text-warm-gold mt-1">
                              <Calendar size={11} className="inline mr-1" />
                              {cell.meeting_day}s at {cell.meeting_time}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-black text-warm-espresso">{cell.member_count || 0}<span className="text-warm-muted text-sm font-normal">/{cell.max_members || 5}</span></p>
                          <p className="text-[10px] text-warm-muted">members</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-full bg-warm-charcoal/[0.06] h-1.5">
                          <div className="h-1.5 rounded-full bg-warm-gold/60" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-warm-muted shrink-0">{pct}% full</span>
                        <button
                          onClick={() => navigate('/zone/cells')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-warm-charcoal/[0.07] bg-white px-3 py-1.5 text-[10px] font-semibold text-warm-muted transition hover:text-warm-charcoal shrink-0 shadow-sm"
                        >
                          <Eye size={11} />
                          Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </DashboardPanel>

          <div className="space-y-6">
            <DashboardPanel title="Zone Overview" icon={BarChart3}>
              <div className="space-y-3">
                {[
                  ['Total Members', stats.totalMembers || 0],
                  ['Active Cells', cells.length],
                  ['Avg Members / Cell', cells.length > 0 ? Math.round((stats.totalMembers || 0) / cells.length) : 0],
                  ['Zone Capacity', `${getCapacityRate()}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-warm-charcoal/[0.07] pb-3 text-sm">
                    <span className="text-warm-muted">{label}</span>
                    <span className="font-bold text-warm-espresso">{value}</span>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Quick Actions" icon={TrendingUp}>
              <div className="space-y-2">
                {[
                  { label: 'Assign Cell Leaders', desc: 'Promote leaders in one flow.', onClick: () => navigate('/zone/cells') },
                  { label: 'Zone Reports', desc: 'View attendance analytics.', onClick: () => navigate('/analytics') },
                  { label: 'Zone Members', desc: 'Review and follow up with members.', onClick: () => navigate('/zone/members') },
                  { label: 'Manage Cells', desc: 'Open the full cell list.', onClick: () => navigate('/zone/cells') },
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

            <DashboardPanel title="Zone Summary" icon={Calendar}>
              <div className="space-y-2">
                <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                  <p className="text-xs font-semibold text-warm-espresso">{cells.length} cells · {stats.totalMembers || 0} members</p>
                </div>
                {cells.length < 3 && (
                  <div className="rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] p-3">
                    <p className="text-xs font-semibold text-warm-plum">Growth Opportunity</p>
                    <p className="text-[10px] text-warm-muted mt-0.5">Consider planting more cells.</p>
                  </div>
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
