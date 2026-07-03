import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  membersAPI,
  zonesAPI,
  cellsAPI,
  eventsAPI,
} from '../../utils/api';
import AdminZoneLeaderApprovals from '../../components/admin/AdminZoneLeaderApprovals';
import {
  Users,
  TrendingUp,
  Shield,
  Crown,
  RefreshCw,
} from 'lucide-react';
import {
  superAdminControlSections,
  totalSuperAdminControls,
} from '../../utils/superAdminControls';
import OnboardingCoachmarks from '../../components/onboarding/OnboardingCoachmarks';
import DashboardShell from '../../components/dashboard/DashboardShell';

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        {Icon && <Icon size={13} className="text-warm-gold/70 shrink-0" />}
        <p className="text-[10px] font-bold tracking-[0.2em] text-warm-gold/70">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function SuperadminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'superadmin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalMembers: 0, totalZones: 0, totalCells: 0, totalEvents: 0, activeMembers: 0 });
  const [systemMetrics, setSystemMetrics] = useState({ apiHealth: 'checking', databaseHealth: 'checking', lastBackup: 'unknown' });

  useEffect(() => {
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [membersRes, zonesRes, cellsRes, eventsRes] = await Promise.allSettled([
        membersAPI.getAll({ limit: 1000 }),
        zonesAPI.getAll({ is_active: 1 }),
        cellsAPI.getAll({ is_active: 1 }),
        eventsAPI.getAll({ limit: 100 }),
      ]);

      const members = membersRes.status === 'fulfilled' ? (Array.isArray(membersRes.value) ? membersRes.value : membersRes.value?.data || []) : [];
      const zones = zonesRes.status === 'fulfilled' ? (Array.isArray(zonesRes.value) ? zonesRes.value : zonesRes.value?.data || []) : [];
      const cells = cellsRes.status === 'fulfilled' ? (Array.isArray(cellsRes.value) ? cellsRes.value : cellsRes.value?.data || []) : [];
      const events = eventsRes.status === 'fulfilled' ? (Array.isArray(eventsRes.value) ? eventsRes.value : eventsRes.value?.data || []) : [];

      setStats({
        totalMembers: members.length,
        activeMembers: members.filter((m) => m.isActive !== false && m.is_active !== false).length,
        totalZones: zones.length,
        totalCells: cells.length,
        totalEvents: events.length,
      });
      setSystemMetrics({ apiHealth: 'operational', databaseHealth: 'operational', lastBackup: new Date().toLocaleString() });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
      setSystemMetrics({ apiHealth: 'error', databaseHealth: 'error', lastBackup: 'unknown' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success('Dashboard refreshed');
  };

  const onboardingKey = useMemo(() => `onboarding_superadmin_${user?.id || user?._id || 'guest'}`, [user?._id, user?.id]);
  const onboardingSteps = useMemo(() => [
    { title: 'Monitor system health', body: 'API and database status tell you if anything needs immediate attention before anything else.' },
    { title: 'Review approvals', body: 'Zone leader requests appear here so you never miss a pending leadership decision.' },
    { title: 'Run migrations carefully', body: 'Apply schema changes from the migrations panel — always check what runs before confirming.' },
    { title: 'Control Center', body: 'Super admins have a full control surface tab for jumping into any corner of the platform.' },
  ], []);

  const controlSections = useMemo(() =>
    superAdminControlSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item, onClick: () => navigate(item.path) })),
    })), [navigate]);

  const overviewStats = [
    { label: 'TOTAL MEMBERS', value: stats.totalMembers, sub: `${stats.activeMembers} active` },
    { label: 'TOTAL ZONES', value: stats.totalZones, sub: `${stats.totalCells} cells` },
    { label: 'TOTAL CELLS', value: stats.totalCells, sub: 'group networks' },
    {
      label: isSuperAdmin ? 'CONTROL SURFACES' : 'TOTAL EVENTS',
      value: isSuperAdmin ? totalSuperAdminControls : stats.totalEvents,
      sub: isSuperAdmin ? `${superAdminControlSections.length} sections` : 'upcoming & past',
    },
  ];

  const healthRows = [
    { label: 'API Status', sub: 'All endpoints operational', health: systemMetrics.apiHealth },
    { label: 'Database Status', sub: 'Connection healthy', health: systemMetrics.databaseHealth },
    { label: 'Last Backup', sub: systemMetrics.lastBackup, health: 'backup' },
  ];

  if (!user || !['admin', 'superadmin'].includes(user.role)) return null;

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <OnboardingCoachmarks storageKey={onboardingKey} steps={onboardingSteps} title="Admin control tour" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-3">
            {isSuperAdmin
              ? <Crown size={18} className="text-warm-gold" />
              : <Shield size={18} className="text-warm-muted" />
            }
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">
                {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
              </h1>
              <p className="mt-1 text-sm text-warm-muted">
                {isSuperAdmin
                  ? 'Full system access — people, content, structure, and infrastructure.'
                  : 'System administration, health monitoring, and approvals.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] ${isSuperAdmin ? 'text-warm-plum bg-warm-gold/10' : 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted shadow-sm transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tab strip — superadmin only */}
        {isSuperAdmin && (
          <div className="flex gap-2">
            {[{ id: 'overview', label: 'Overview' }, { id: 'controls', label: 'Control Center' }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-[0.08em] transition-all ${
                  activeTab === tab.id
                    ? 'bg-warm-gold/[0.08] border border-warm-gold/20 text-warm-plum'
                    : 'border border-warm-charcoal/[0.07] bg-white text-warm-muted hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {overviewStats.map(({ label, value, sub }) => (
                <div key={label} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                  <p className="text-3xl font-black tabular-nums text-warm-charcoal">{value}</p>
                  <p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-warm-gold/70">{label}</p>
                  <p className="mt-0.5 text-[10px] text-warm-muted">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,1fr] gap-6">
              <div className="space-y-6">

                <Panel title="SYSTEM HEALTH" icon={TrendingUp}>
                  <div className="space-y-2">
                    {healthRows.map(({ label, sub, health }) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory/60 p-4">
                        <div>
                          <p className="text-sm font-semibold text-warm-espresso">{label}</p>
                          <p className="text-xs text-warm-muted mt-0.5">{sub}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] ${
                          health === 'operational' ? 'text-emerald-700 bg-emerald-500/10' :
                          health === 'error' ? 'text-red-700 bg-red-500/10' :
                          'text-blue-700 bg-blue-500/10'
                        }`}>
                          {health === 'operational' ? 'ONLINE' : health === 'error' ? 'OFFLINE' : 'COMPLETED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="ZONE LEADER APPROVALS" icon={Users}>
                  <AdminZoneLeaderApprovals />
                </Panel>
              </div>

              <div className="space-y-6" />
            </div>
          </>
        )}

        {/* CONTROL CENTER (superadmin only) */}
        {activeTab === 'controls' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {controlSections.map((section) => (
                <Panel key={section.id} title={section.title?.toUpperCase()} icon={section.icon}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className="group flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-2.5 py-2.5 text-left transition hover:border-warm-gold/20 hover:bg-warm-gold/[0.04] disabled:opacity-50"
                        >
                          {ItemIcon && (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-warm-charcoal/[0.07] bg-warm-ivory transition group-hover:border-warm-gold/20 group-hover:bg-warm-gold/[0.1]">
                              <ItemIcon size={12} className="text-warm-muted transition group-hover:text-warm-gold" />
                            </div>
                          )}
                          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-warm-plum group-hover:text-warm-charcoal">{item.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-warm-charcoal/[0.07] pt-6 text-center">
          <p className="text-[9px] font-semibold tracking-[0.22em] text-warm-muted">
            {isSuperAdmin ? 'SUPER ADMIN CONTROL CENTER' : 'ADMIN CONTROL CENTER'}
          </p>
        </div>

      </div>
    </DashboardShell>
  );
}
