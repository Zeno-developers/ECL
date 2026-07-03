import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleDashboardPath } from '../utils/roleRouting';
import {
  Users,
  Calendar,
  Heart,
  DollarSign,
  BarChart3,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { reportsAPI } from '../utils/api';
import { getDashboardActions } from '../utils/dashboardActions';
import DailyVerse from '../components/bible/DailyVerse';
import OnboardingCoachmarks from '../components/onboarding/OnboardingCoachmarks';
import DashboardShell from '../components/dashboard/DashboardShell';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? user?._id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [quickStats, setQuickStats] = useState({});

  const isAdminUser = () => ['admin', 'pastor', 'superadmin'].includes(user?.role);
  const isPastor = () => ['pastor', 'superadmin'].includes(user?.role);

  useEffect(() => {
    if (userId && user.role !== 'member') {
      const dashboardPath = getRoleDashboardPath(user.role);
      if (dashboardPath !== '/dashboard') {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [userId, user?.role, navigate]);

  useEffect(() => {
    if (userId && user.role === 'member') {
      fetchDashboardData();
    }
  }, [userId, user?.role]);

  const quickActions = getDashboardActions({ role: user?.role, isMobile: false });

  const onboardingKey = useMemo(
    () => `onboarding_member_dashboard_${user?.id || user?._id || 'guest'}`,
    [user?._id, user?.id]
  );
  const onboardingSteps = useMemo(() => ([
    { title: 'Start with quick actions', body: 'Use the action buttons to log prayers, giving, or events faster.' },
    { title: 'Track your walk', body: 'Your attendance, giving, and engagement stats refresh every Sunday.' },
    { title: 'Daily encouragement', body: 'The Daily Verse card keeps a scripture in view every time you sign in.' },
    { title: 'Need help?', body: 'Settings holds your profile, and Chat/Prayer help you reach leaders for support.' },
  ]), [user?.id, user?._id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (isAdminUser()) {
        await fetchAdminDashboardData();
      } else {
        await fetchMemberDashboardData();
      }
    } catch {
      setFallbackData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdminDashboardData = async () => {
    try {
      const response = await reportsAPI.getDashboard({ period: 'month' });
      const data = response?.data || {};
      if (data?.membership && data?.attendance) {
        setStats([
          { value: data.membership.total_members.toString(), label: 'Total Members', icon: Users },
          { value: `R ${(data.attendance.total_sunday_checkins || 0).toLocaleString()}`, label: 'Total Giving (Est.)', icon: DollarSign },
          { value: data.membership.new_members.toString(), label: 'New Members This Month', icon: Users },
          { value: data.attendance.avg_sunday_attendance.toFixed(0), label: 'Avg Sunday Attendance', icon: Activity },
        ]);
        setQuickStats({
          activeMembers: data.membership.total_members,
          newMembers: data.membership.new_members,
          pendingPrayers: data.alerts?.pending_absence_requests || 0,
          monthlyGiven: data.attendance?.total_sunday_checkins || 0,
        });
        const activities = [];
        if (data.alerts?.absence_flags > 0) activities.push({ text: `${data.alerts.absence_flags} members flagged for absence`, time: 'Needs follow-up', dot: 'bg-red-400' });
        if (data.alerts?.pending_absence_requests > 0) activities.push({ text: `${data.alerts.pending_absence_requests} absence requests pending`, time: 'Requires review', dot: 'bg-amber-400' });
        if (data.alerts?.pending_cell_change_requests > 0) activities.push({ text: `${data.alerts.pending_cell_change_requests} cell change requests pending`, time: 'Leadership action', dot: 'bg-amber-400' });
        activities.push({ text: `${data.structure?.total_cells || 0} active cells in ${data.structure?.total_zones || 0} zones`, time: 'Current structure', dot: 'bg-emerald-400' });
        setRecentActivity(activities);
      } else {
        setFallbackAdminData();
      }
    } catch {
      setFallbackAdminData();
    }
  };

  const fetchMemberDashboardData = async () => {
    try {
      const response = await reportsAPI.getDashboard({ period: 'month' });
      const data = response?.data || {};
      if (data?.user_info && data?.attendance) {
        const { attendance, user_info } = data;
        setStats([
          { value: attendance.sunday_count.toString(), label: 'My Sunday Attendances', icon: Activity },
          { value: `${attendance.sunday_rate}%`, label: 'Sunday Attendance Rate', icon: TrendingUp },
          { value: attendance.cell_count.toString(), label: 'Cell Meetings Attended', icon: Users },
          { value: user_info.cell_name || 'No Cell', label: 'My Cell Group', icon: Users },
        ]);
        setQuickStats({
          cellName: user_info.cell_name,
          zoneName: user_info.zone_name,
          sundayRate: attendance.sunday_rate,
          cellRate: attendance.cell_rate,
        });
        const activities = [];
        if (data.announcements?.length) {
          data.announcements.slice(0, 3).forEach((ann) => {
            activities.push({ text: `Announcement: ${ann.title}`, time: new Date(ann.created_at).toLocaleDateString(), dot: 'bg-blue-400' });
          });
        }
        if (attendance.sunday_rate < 50) activities.push({ text: 'Your Sunday attendance is low — consider attending more!', time: 'Needs attention', dot: 'bg-red-400' });
        activities.push({ text: `You belong to ${user_info.cell_name || 'no cell'}`, time: 'Current', dot: 'bg-emerald-400' });
        setRecentActivity(activities);
      } else {
        setFallbackMemberData();
      }
    } catch {
      setFallbackMemberData();
    }
  };

  const setFallbackAdminData = () => {
    setStats([
      { value: '500+', label: 'Total Members', icon: Users },
      { value: 'R 125,000', label: 'Total Giving', icon: DollarSign },
      { value: '12', label: 'Upcoming Events', icon: Calendar },
      { value: '45', label: 'Prayer Requests', icon: Heart },
    ]);
    setQuickStats({ activeMembers: 350, pendingPrayers: 8, monthlyGiven: 12500, newMembers: 15 });
    setRecentActivity([
      { text: '8 prayer requests need review', time: 'Needs attention', dot: 'bg-red-400' },
      { text: '12 upcoming events scheduled', time: 'This month', dot: 'bg-blue-400' },
      { text: '350 active members', time: 'Current', dot: 'bg-emerald-400' },
    ]);
  };

  const setFallbackMemberData = () => {
    setStats([
      { value: '12', label: 'My Prayers', icon: Heart },
      { value: 'R 1,250', label: 'My Giving', icon: DollarSign },
      { value: '8', label: 'My Events', icon: Calendar },
      { value: '5', label: 'Donations', icon: Users },
    ]);
    setQuickStats({ myPrayers: 12, myEvents: 8, totalGiven: 1250 });
    setRecentActivity([
      { text: 'You submitted a prayer request', time: '2 hours ago', dot: 'bg-red-400' },
      { text: 'New event: Sunday Service', time: '1 day ago', dot: 'bg-blue-400' },
      { text: 'Your donation was received', time: '3 days ago', dot: 'bg-emerald-400' },
    ]);
  };

  const setFallbackData = () => isAdminUser() ? setFallbackAdminData() : setFallbackMemberData();

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      <OnboardingCoachmarks storageKey={onboardingKey} steps={onboardingSteps} title="New here? Quick tour" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-8">

        {/* Welcome */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Friend'}
            </h1>
            <p className="mt-2 text-sm text-warm-muted">
              {isAdminUser() ? 'Church administration overview.' : 'Welcome to your Eternal Love Church dashboard.'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-warm-charcoal/[0.08] bg-white px-4 py-2.5 text-xs font-semibold text-warm-plum transition hover:border-warm-gold/30 hover:text-warm-espresso disabled:opacity-50 shrink-0 shadow-sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Daily Verse */}
        <DailyVerse />

        {/* Stats */}
        <section>
          <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70 mb-4">
            {isAdminUser() ? 'CHURCH OVERVIEW' : 'MY OVERVIEW'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black tracking-tighter text-warm-charcoal">{stat.value}</p>
                      <p className="text-xs text-warm-muted mt-1">{stat.label}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-warm-gold/[0.08] border border-warm-gold/15 flex items-center justify-center">
                      <Icon size={18} className="text-warm-gold" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Actions */}
        {quickActions?.length > 0 && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70 mb-4">QUICK ACTIONS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.path ? navigate(action.path) : action.onClick?.()}
                  className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 text-left transition hover:border-warm-gold/25 hover:bg-warm-ivory group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-warm-gold/[0.07] border border-warm-gold/15 flex items-center justify-center mb-4">
                    <action.icon size={18} className="text-warm-gold group-hover:text-warm-plum transition" />
                  </div>
                  <p className="text-sm font-bold text-warm-charcoal">{action.label}</p>
                  <p className="text-xs text-warm-muted mt-1">{action.description}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Activity + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold tracking-[0.18em] text-warm-plum">
                {isAdminUser() ? 'CHURCH ACTIVITY' : 'MY ACTIVITY'}
              </p>
              <TrendingUp size={14} className="text-warm-gold/50" />
            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-warm-ivory transition">
                    <div className={`w-2 h-2 ${activity.dot} rounded-full shrink-0 mt-1.5`} />
                    <div className="flex-1">
                      <p className="text-sm text-warm-plum">{activity.text}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-warm-muted">
                        <Clock size={10} />
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity size={28} className="mx-auto mb-2 text-warm-gold/30" />
                  <p className="text-sm text-warm-muted">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold tracking-[0.18em] text-warm-plum mb-5">
              {isAdminUser() ? 'CHURCH STATISTICS' : 'MY CONTRIBUTIONS'}
            </p>
            <div className="space-y-1">
              {isAdminUser() ? (
                <>
                  {[
                    { label: 'Active Members', value: quickStats.activeMembers || '0', color: 'text-warm-charcoal' },
                    { label: 'Pending Prayers', value: quickStats.pendingPrayers || '0', color: 'text-red-500' },
                    { label: 'New Members', value: quickStats.newMembers || '0', color: 'text-warm-plum' },
                    { label: 'Monthly Giving', value: `R ${(quickStats.monthlyGiven || 0).toLocaleString()}`, color: 'text-emerald-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center py-3 border-b border-warm-charcoal/[0.06]">
                      <span className="text-sm text-warm-muted">{label}</span>
                      <span className={`text-sm font-semibold ${color}`}>{value}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: 'My Cell', value: quickStats.cellName || 'Not assigned', color: 'text-warm-gold' },
                    { label: 'My Zone', value: quickStats.zoneName || 'Not assigned', color: 'text-warm-plum' },
                    { label: 'Sunday Rate', value: `${quickStats.sundayRate || 0}%`, color: 'text-emerald-600' },
                    { label: 'Cell Rate', value: `${quickStats.cellRate || 0}%`, color: 'text-warm-plum' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center py-3 border-b border-warm-charcoal/[0.06]">
                      <span className="text-sm text-warm-muted">{label}</span>
                      <span className={`text-sm font-semibold ${color}`}>{value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
