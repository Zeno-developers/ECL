// pages/admin/GivingAdmin.jsx
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  BadgeDollarSign,
  BarChart3,
  Download,
  Filter,
  Loader2,
  PieChart,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  TrendingUp,
  Wallet,
  TrendingDown,
  Award,
  Target,
  Calendar as CalendarIcon,
  Activity,
  Zap,
  Percent,
  Clock,
  Building2,
  Repeat,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { DashboardPanel, DashboardStatGrid } from '../dashboard/RoleDashboardUI';
import { givingAPI } from '../../utils/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';

const currency = (amount) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatShortCurrency = (amount) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    notation: 'compact',
    compactDisplay: 'short',
  }).format(Number(amount || 0));

const toDate = (value) => (value ? new Date(value) : null);
const inRange = (date, start, end) => {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const statusBadge = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    case 'refunded':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function GivingAdmin() {
  const { user } = useAuth();
  const canAccess = ['finance_admin', 'superadmin', 'admin', 'pastor', 'elder'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [trends, setTrends] = useState(null);
  const [projections, setProjections] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [fundId, setFundId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [showProjections, setShowProjections] = useState(false);
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    amount: '',
    fund_id: '',
    member_id: '',
    donor_email: '',
    donor_name: '',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (canAccess) {
      loadData();
    }
  }, [canAccess, selectedPeriod]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [donationsRes, fundsRes, trendsRes, projectionsRes] = await Promise.all([
        givingAPI.getDonations({ limit: 2000 }),
        givingAPI.getFunds(),
        givingAPI.getTrends({ period: selectedPeriod }),
        givingAPI.getProjections({ period: selectedPeriod }),
      ]);

      setDonations(Array.isArray(donationsRes?.data) ? donationsRes.data : Array.isArray(donationsRes) ? donationsRes : []);
      setFunds(Array.isArray(fundsRes?.data) ? fundsRes.data : Array.isArray(fundsRes) ? fundsRes : []);
      setTrends(trendsRes?.data || trendsRes || null);
      setProjections(projectionsRes?.data || projectionsRes || null);
    } catch (error) {
      console.error('Failed to load giving admin data:', error);
      toast.error(error.message || 'Failed to load giving analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredDonations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return donations.filter((donation) => {
      const donationDate = toDate(donation.completed_at || donation.created_at);
      const matchesSearch =
        !term ||
        donation.member_name?.toLowerCase().includes(term) ||
        donation.donation_uuid?.toLowerCase().includes(term) ||
        donation.fund_name?.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || donation.status === status;
      const matchesFund = fundId === 'all' || String(donation.fund_id) === String(fundId);
      const matchesDate = inRange(donationDate, start, end);

      return matchesSearch && matchesStatus && matchesFund && matchesDate;
    });
  }, [donations, search, status, fundId, dateFrom, dateTo]);

  const analytics = useMemo(() => {
    const completed = donations.filter((donation) => donation.status === 'completed');
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const totals = (start, end) =>
      completed
        .filter((donation) => inRange(toDate(donation.completed_at || donation.created_at), start, end))
        .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

    const completedThisMonth = completed.filter((donation) => inRange(toDate(donation.completed_at || donation.created_at), monthStart, today));
    
    const donorFrequency = completed.reduce((acc, donation) => {
      const key = donation.user_id || donation.member_name || donation.member_email;
      if (!key) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const fundTotals = completed.reduce((acc, donation) => {
      const label = donation.fund_name || 'General Giving';
      acc[label] = (acc[label] || 0) + Number(donation.amount || 0);
      return acc;
    }, {});

    const monthlyTrend = {};
    completed.forEach(donation => {
      const date = toDate(donation.completed_at || donation.created_at);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyTrend[key] = (monthlyTrend[key] || 0) + Number(donation.amount || 0);
      }
    });

    const avgGift = completed.length > 0
      ? completed.reduce((sum, donation) => sum + Number(donation.amount || 0), 0) / completed.length
      : 0;

    const medianGift = completed.length > 0
      ? [...completed].sort((a, b) => Number(a.amount) - Number(b.amount))[Math.floor(completed.length / 2)]?.amount || 0
      : 0;

    return {
      today: totals(today, today),
      week: totals(weekStart, today),
      month: totals(monthStart, today),
      quarter: totals(quarterStart, today),
      year: totals(yearStart, today),
      avgGift,
      medianGift,
      recurringDonors: Array.from(donorFrequency.values()).filter((count) => count >= 2).length,
      highValueDonors: Array.from(donorFrequency.entries()).filter(([, count]) => count >= 5).length,
      fundTotals,
      completedThisMonth: completedThisMonth.length,
      monthlyTrend,
    };
  }, [donations]);

  const trendData = useMemo(() => {
    if (trends?.monthly?.length) {
      return trends.monthly.map(item => ({
        month: item.month,
        amount: Number(item.total || 0),
        count: Number(item.count || 0),
        average: Number(item.average || 0),
        projection: projections?.monthly?.[item.month] || null,
      }));
    }
    // Fallback: compute monthly totals from the already-loaded donations list
    const byMonth = {};
    donations.forEach(d => {
      if (d.status !== 'completed') return;
      const date = new Date(d.completed_at || d.created_at);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { amount: 0, count: 0 };
      byMonth[key].amount += Number(d.amount || 0);
      byMonth[key].count += 1;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { amount, count }]) => ({
        month,
        amount,
        count,
        average: count > 0 ? amount / count : 0,
        projection: null,
      }));
  }, [trends, projections, donations]);

  const fundRows = useMemo(() => {
    const entries = Object.entries(analytics.fundTotals || {});
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    return entries
      .map(([label, value]) => ({
        label,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [analytics.fundTotals]);

  const growthMetrics = useMemo(() => {
    if (trendData.length < 2) return { monthOverMonth: 0, yearOverYear: 0, projectedGrowth: 0 };
    const last = trendData[trendData.length - 1]?.amount || 0;
    const previous = trendData[trendData.length - 2]?.amount || 1;
    const yearAgo = trendData[Math.max(0, trendData.length - 13)]?.amount || 1;
    const monthOverMonth = ((last - previous) / previous) * 100;
    const yearOverYear = ((last - yearAgo) / yearAgo) * 100;
    const projectedGrowth = projections?.growth_rate || monthOverMonth;
    return { monthOverMonth, yearOverYear, projectedGrowth };
  }, [trendData, projections]);

  const handleOfflineSubmit = async (event) => {
    event.preventDefault();
    if (!offlineForm.amount || Number(offlineForm.amount) <= 1) {
      toast.error('Amount must be greater than R1.00');
      return;
    }

    setOfflineSubmitting(true);
    try {
      await givingAPI.recordOffline({
        ...offlineForm,
        amount: Number(offlineForm.amount),
        fund_id: offlineForm.fund_id || null,
        member_id: offlineForm.member_id ? Number(offlineForm.member_id) : null,
      });

      toast.success('Offline gift recorded successfully');
      setOfflineForm({
        amount: '',
        fund_id: '',
        member_id: '',
        donor_email: '',
        donor_name: '',
        payment_method: 'cash',
        notes: '',
      });
      await loadData();
    } catch (error) {
      console.error('Offline gift record failed:', error);
      toast.error(error.message || 'Failed to record offline gift');
    } finally {
      setOfflineSubmitting(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Date', 'Donor', 'Fund', 'Amount', 'Status', 'Reference', 'Email', 'Payment Method'];
    const rows = filteredDonations.map((donation) => [
      donation.completed_at || donation.created_at || '',
      donation.member_name || '',
      donation.fund_name || '',
      Number(donation.amount || 0).toFixed(2),
      donation.status || '',
      donation.donation_uuid || '',
      donation.member_email || '',
      donation.payment_method || 'SnapScan',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `giving-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-lg p-6 text-center">
          <ShieldAlert size={34} className="mx-auto text-rose-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Access denied</h2>
          <p className="mt-2 text-sm text-slate-600">
            This dashboard is available to finance_admin, superadmin, admin, pastor, and elder users.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const actionButtons = (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => setShowProjections(!showProjections)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-200 hover:text-purple-700"
      >
        {showProjections ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {showProjections ? 'Hide Projections' : 'Show Projections'}
      </button>
      <button
        onClick={loadData}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-200 hover:text-purple-700"
      >
        {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        Refresh
      </button>
      <button
        onClick={exportCsv}
        className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
      >
        <Download size={16} />
        Export CSV
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Growth Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Month over Month</p>
              <p className={`text-xl font-bold ${growthMetrics.monthOverMonth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {growthMetrics.monthOverMonth >= 0 ? '+' : ''}{growthMetrics.monthOverMonth.toFixed(1)}%
              </p>
            </div>
            <div className={`p-2 rounded-xl ${growthMetrics.monthOverMonth >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {growthMetrics.monthOverMonth >= 0 ? <TrendingUp size={20} className="text-emerald-600" /> : <TrendingDown size={20} className="text-rose-600" />}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Year over Year</p>
              <p className={`text-xl font-bold ${growthMetrics.yearOverYear >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {growthMetrics.yearOverYear >= 0 ? '+' : ''}{growthMetrics.yearOverYear.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-100">
              <CalendarIcon size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Projected Growth</p>
              <p className="text-xl font-bold text-purple-600">{growthMetrics.projectedGrowth.toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-xl bg-purple-100">
              <Zap size={20} className="text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Recurring Donors</p>
              <p className="text-xl font-bold text-indigo-600">{analytics.recurringDonors}</p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-100">
              <Repeat size={20} className="text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      <DashboardStatGrid
        stats={[
          { label: 'Today', value: currency(analytics.today), icon: Wallet, iconWrapClass: 'bg-purple-100 text-purple-700' },
          { label: 'This Week', value: currency(analytics.week), icon: TrendingUp, iconWrapClass: 'bg-sky-100 text-sky-700' },
          { label: 'This Month', value: currency(analytics.month), icon: PieChart, iconWrapClass: 'bg-indigo-100 text-indigo-700' },
          { label: 'This Quarter', value: currency(analytics.quarter), icon: CalendarIcon, iconWrapClass: 'bg-amber-100 text-amber-700' },
          { label: 'This Year', value: currency(analytics.year), icon: BadgeDollarSign, iconWrapClass: 'bg-emerald-100 text-emerald-700' },
          { label: 'Avg Gift', value: currency(analytics.avgGift), icon: Users, iconWrapClass: 'bg-slate-100 text-slate-700', helper: `Median: ${currency(analytics.medianGift)}` },
          { label: 'High-Value Donors', value: analytics.highValueDonors, icon: Award, iconWrapClass: 'bg-rose-100 text-rose-700', helper: '5+ donations' },
          { label: 'Monthly Donations', value: analytics.completedThisMonth, icon: Activity, iconWrapClass: 'bg-cyan-100 text-cyan-700' },
        ]}
      />

      <DashboardPanel title="Giving Analytics" icon={BadgeDollarSign} action={actionButtons} className="border-white/70">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            {/* Trend Chart with Projections */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Financial Trend</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Giving History & Forecast</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPeriod('3months')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === '3months' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}
                  >
                    3M
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('6months')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === '6months' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}
                  >
                    6M
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('year')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === 'year' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}
                  >
                    1Y
                  </button>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatShortCurrency(v)} width={60} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', zIndex: 9999 }}
                      formatter={(value, name) => {
                        if (name === 'amount') return [currency(value), 'Actual Giving'];
                        if (name === 'projection') return [currency(value), 'Projected'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#8b5cf6"
                      fill="url(#colorGradient)"
                      strokeWidth={2}
                      name="Actual Giving"
                    />
                    {showProjections && (
                      <Line
                        type="monotone"
                        dataKey="projection"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Projected"
                      />
                    )}
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fund Distribution */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fund mix</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Distribution by fund</h3>
                </div>
                <div className="rounded-2xl bg-white p-3 text-purple-700 shadow-sm ring-1 ring-slate-200">
                  <PieChart size={18} />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {fundRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No completed gifts yet.
                  </div>
                ) : (
                  fundRows.map((row, index) => {
                    const color = COLORS[index % COLORS.length];
                    return (
                      <div key={row.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium text-slate-700">{row.label}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{currency(row.value)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full shadow-sm transition-all duration-500"
                            style={{
                              width: `${Math.max(row.pct, 4)}%`,
                              background: `linear-gradient(90deg, ${color}, rgba(139,92,246,0.7))`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat size={16} className="text-purple-500" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recurring</div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{analytics.recurringDonors}</div>
                <div className="mt-1 text-sm text-slate-500">Repeat givers</div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-amber-500" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">High Value</div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{analytics.highValueDonors}</div>
                <div className="mt-1 text-sm text-slate-500">5+ donations</div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-emerald-500" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avg Gift</div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{currency(analytics.avgGift)}</div>
                <div className="mt-1 text-sm text-slate-500">Per transaction</div>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            {/* Transactions Panel */}
            <DashboardPanel
              title="Transactions"
              icon={Filter}
              action={<span className="text-sm text-slate-500">Search by member, reference, or fund</span>}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
                <select
                  value={fundId}
                  onChange={(e) => setFundId(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="all">All Funds</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200">
                <div className="max-h-[540px] overflow-auto">
                  <table className="min-w-[700px] w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Donor</th>
                        <th className="px-4 py-3 font-medium">Fund</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDonations.map((donation) => (
                        <tr key={donation.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{donation.member_name || 'Anonymous'}</div>
                            <div className="text-xs text-slate-500">{donation.member_email || 'No email'}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{donation.fund_name || 'General Giving'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{currency(donation.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(donation.completed_at || donation.created_at).toLocaleDateString('en-ZA')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(donation.status)}`}>
                              {donation.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{donation.donation_uuid}</td>
                        </tr>
                      ))}
                      {filteredDonations.length === 0 ? (
                        <tr>
                          <td className="px-4 py-10 text-center text-slate-500" colSpan="6">
                            No transactions match your filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </DashboardPanel>

            {/* Offline Gift Recording */}
            <DashboardPanel
              title="Record Offline Gift"
              icon={Building2}
              action={<span className="text-sm text-slate-500">Cash, cheque, or manual transfer</span>}
            >
              <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleOfflineSubmit}>
                <input
                  type="number"
                  min="1.01"
                  step="0.01"
                  inputMode="decimal"
                  value={offlineForm.amount}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Amount (R)"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  required
                />
                <select
                  value={offlineForm.fund_id}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, fund_id: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">General Giving</option>
                  {funds.map((fund) => (
                    <option key={fund.id ?? fund.name} value={fund.id ?? fund.name}>
                      {fund.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={offlineForm.donor_name}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, donor_name: e.target.value }))}
                  placeholder="Donor name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
                <input
                  type="email"
                  value={offlineForm.donor_email}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, donor_email: e.target.value }))}
                  placeholder="Donor email"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
                <select
                  value={offlineForm.payment_method}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                <input
                  type="text"
                  value={offlineForm.member_id}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, member_id: e.target.value }))}
                  placeholder="Member ID (optional)"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
                <textarea
                  rows={2}
                  value={offlineForm.notes}
                  onChange={(e) => setOfflineForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes"
                  className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
                <div className="md:col-span-2 xl:col-span-3">
                  <button
                    type="submit"
                    disabled={offlineSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {offlineSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
                    {offlineSubmitting ? 'Saving gift...' : 'Save Offline Gift'}
                  </button>
                </div>
              </form>
            </DashboardPanel>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}