// components/giving/GivingSection.jsx
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import GooglePayButton from './GooglePayButton';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Wallet,
  LineChart,
  PiggyBank,
  Target,
  Gift,
  Building2,
  History,
  Plus,
  BarChart3,
  Zap,
  Award,
  Clock,
  DollarSign,
  Percent,
  Sparkles,
} from 'lucide-react';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { DashboardPanel, DashboardStatGrid } from '../dashboard/RoleDashboardUI';
import { givingAPI, settingsAPI } from '../../utils/api';
import { getCachedChurchSettings, normalizeChurchSettings } from '../../utils/churchSettings';
import {
  LineChart as RechartsLineChart,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  failed: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  refunded: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function GivingSection() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [churchName, setChurchName] = useState(
    () => getCachedChurchSettings().name || 'Eternal Love Church'
  );
  const canUsher = ['admin', 'pastor', 'superadmin', 'elder'].includes(user?.role);
  const [funds, setFunds] = useState([]);
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [bannerMessage, setBannerMessage] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedChart, setSelectedChart] = useState('trend');
  const [sundaySummary, setSundaySummary] = useState(null);
  const [loadingSunday, setLoadingSunday] = useState(false);
  const [usherForm, setUsherForm] = useState({ amount: '', fund_id: '', donor_name: '' });
  const [usherSubmitting, setUsherSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    fund_id: '',
  });

  useEffect(() => {
    if (canUsher) loadSundaySummary();
  }, [canUsher]);

  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      const s = normalizeChurchSettings(e.detail || {})
      if (s.name) setChurchName(s.name)
    }
    window.addEventListener('church-settings-updated', handleSettingsUpdate)
    settingsAPI.getPublicSettings().then((res) => {
      const n = res?.data?.name || res?.data?.churchName
      if (n) setChurchName(n)
    }).catch(() => {})
    return () => window.removeEventListener('church-settings-updated', handleSettingsUpdate)
  }, [])

  useEffect(() => {
    loadGivingData();
  }, [searchParams, selectedPeriod]);

  const loadGivingData = async () => {
    try {
      setLoading(true);
      const [fundsRes, donationsRes, summaryRes, trendsRes] = await Promise.all([
        givingAPI.getFunds(),
        givingAPI.getDonations({ limit: 100 }),
        givingAPI.getSummary(),
        givingAPI.getTrends({ period: selectedPeriod }),
      ]);

      setFunds(Array.isArray(fundsRes?.data) ? fundsRes.data : Array.isArray(fundsRes) ? fundsRes : []);
      setDonations(Array.isArray(donationsRes?.data) ? donationsRes.data : Array.isArray(donationsRes) ? donationsRes : []);
      setSummary(summaryRes?.data || summaryRes || null);
      setTrends(trendsRes?.data || trendsRes || null);
    } catch (error) {
      console.error('Failed to load giving data:', error);
      toast.error(error.message || 'Failed to load giving data');
    } finally {
      setLoading(false);
    }
  };

  const selectedFundName = useMemo(() => {
    if (!formData.fund_id) return 'General Giving';
    const f = funds.find((f) => String(f.id ?? f.name) === String(formData.fund_id));
    return f?.name || 'General Giving';
  }, [funds, formData.fund_id]);

  const handleGooglePaySuccess = (result) => {
    const ref = result?.data?.donation_uuid || result?.donation_uuid || ''
    setBannerMessage(
      ref
        ? `Thank you! Your donation was received. Reference: ${ref.slice(0, 8).toUpperCase()}`
        : 'Thank you! Your donation was received. A confirmation has been sent to you.'
    )
    setFormData({ amount: '', fund_id: '' })
    loadGivingData();
  };

  const handleGooglePayError = (err) => {
    toast.error(err?.message || 'Google Pay payment failed. Please try again.');
  };

  const downloadReceipt = async (donation) => {
    setReceiptLoadingId(donation.id);
    try {
      const blob = await givingAPI.downloadReceipt(donation.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${donation.donation_uuid || donation.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Receipt download failed:', error);
      toast.error(error.message || 'Failed to download receipt');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const loadSundaySummary = async () => {
    setLoadingSunday(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await givingAPI.getSundaySummary(today);
      setSundaySummary(res?.data || null);
    } catch {
      // silent — usher panel degrades gracefully
    } finally {
      setLoadingSunday(false);
    }
  };

  const handleUsherSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(usherForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setUsherSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const selectedFund = usherForm.fund_id
        ? (funds.find((f) => String(f.id ?? f.name) === String(usherForm.fund_id))?.name || usherForm.fund_id)
        : 'General Giving';
      await givingAPI.record({
        amount,
        fund: selectedFund,
        donor_name: usherForm.donor_name || 'Anonymous',
        payment_method: 'cash',
        entry_source: 'sunday_service',
        service_date: today,
      });
      toast.success('Offering recorded');
      setUsherForm({ amount: '', fund_id: '', donor_name: '' });
      loadSundaySummary();
    } catch (error) {
      toast.error(error.message || 'Failed to record offering');
    } finally {
      setUsherSubmitting(false);
    }
  };

  const totalThisMonth = Number(summary?.month?.total_given || 0);
  const totalThisYear = Number(summary?.year?.total_given || 0);
  const lifetime = Number(summary?.lifetime?.total_given || 0);
  const monthlyAverage = donations.length > 0 
    ? lifetime / Math.max(1, Math.ceil((new Date() - new Date(donations[0]?.created_at)) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  const trendData = useMemo(() => {
    const rows = Array.isArray(trends) ? trends : (trends?.monthly ?? []);
    return rows.map(item => ({
      month: item.month,
      amount: item.total,
      count: item.count,
      average: item.average,
    }));
  }, [trends]);

  const fundDistribution = useMemo(() => {
    const completedDonations = donations.filter(d => d.status === 'completed');
    const distribution = {};
    completedDonations.forEach(donation => {
      const fundName = donation.fund_name || 'General Giving';
      distribution[fundName] = (distribution[fundName] || 0) + Number(donation.amount);
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [donations]);

  const growthRate = useMemo(() => {
    if (trendData.length < 2) return 0;
    const last = trendData[trendData.length - 1]?.amount || 0;
    const first = trendData[0]?.amount || 1;
    return ((last - first) / first) * 100;
  }, [trendData]);

  const statCards = [
    {
      value: formatCurrency(lifetime),
      label: 'Lifetime Giving',
      icon: PiggyBank,
      iconWrapClass: 'bg-purple-100 text-purple-700',
      helper: `${donations.length} total donations`,
    },
    {
      value: formatCurrency(totalThisYear),
      label: 'This Year',
      icon: Calendar,
      iconWrapClass: 'bg-sky-100 text-sky-700',
      helper: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% vs previous`,
    },
    {
      value: formatCurrency(totalThisMonth),
      label: 'This Month',
      icon: Wallet,
      iconWrapClass: 'bg-emerald-100 text-emerald-700',
    },
    {
      value: formatCurrency(monthlyAverage),
      label: 'Monthly Average',
      icon: TrendingUp,
      iconWrapClass: 'bg-indigo-100 text-indigo-700',
      helper: 'Over your giving history',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bannerMessage ? (
        <Card className="border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Donation confirmed</p>
              <p className="text-sm text-emerald-800">{bannerMessage}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <DashboardStatGrid stats={statCards} />

      {/* Growth Indicator */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Zap className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Giving Momentum</p>
              <p className="text-xs text-purple-600">
                {growthRate > 0 ? `↑ ${growthRate.toFixed(1)}% increase` : growthRate < 0 ? `↓ ${Math.abs(growthRate).toFixed(1)}% decrease` : 'Stable'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('3months')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === '3months' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              3 Months
            </button>
            <button
              onClick={() => setSelectedPeriod('6months')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === '6months' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              6 Months
            </button>
            <button
              onClick={() => setSelectedPeriod('1year')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedPeriod === '1year' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              1 Year
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Make a Donation"
          icon={Wallet}
          action={<span className="text-sm text-slate-500">Secure payment via Google Pay</span>}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Amount (ZAR)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="250.00"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Select Fund</label>
              <select
                value={formData.fund_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, fund_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              >
                <option value="">General Giving</option>
                {funds.map((fund) => (
                  <option key={fund.id ?? fund.name} value={fund.id ?? fund.name}>
                    {fund.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-1">
              <GooglePayButton
                amountZAR={Number(formData.amount)}
                fund={selectedFundName}
                donorName={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''}
                donorEmail={user?.email || ''}
                merchantName={churchName}
                variant="dark"
                onSuccess={handleGooglePaySuccess}
                onError={handleGooglePayError}
              />
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <ShieldCheck size={12} />
                PCI DSS Compliant • 256-bit SSL Encryption
              </p>
            </div>
          </div>
        </DashboardPanel>

        <div className="grid gap-6">
          <DashboardPanel
            title="Giving Trends"
            icon={LineChart}
            action={
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedChart('trend')}
                  className={`p-1.5 rounded-lg transition-colors ${selectedChart === 'trend' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={() => setSelectedChart('pie')}
                  className={`p-1.5 rounded-lg transition-colors ${selectedChart === 'pie' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
                >
                  <PieChart size={16} />
                </button>
              </div>
            }
          >
            {selectedChart === 'trend' ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) => {
                        const [y, m] = v.split('-');
                        return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
                      }}
                    />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `R${v/1000}k`} width={50} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', zIndex: 9999 }}
                      formatter={(value) => [`R${Number(value).toLocaleString('en-ZA')}`, 'Amount']}
                      labelFormatter={(v) => {
                        const [y, m] = String(v).split('-');
                        return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#8b5cf6"
                      fill="url(#colorGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fundDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {fundDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Recent Transactions"
            icon={History}
            action={<span className="text-sm text-slate-500">Auto-updated</span>}
          >
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {donations.slice(0, 5).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                  No donations yet.
                </div>
              ) : (
                donations.slice(0, 5).map((donation) => (
                  <div key={donation.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${donation.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          {donation.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock size={16} className="text-amber-600" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{donation.fund_name || 'General Giving'}</div>
                          <div className="text-xs text-slate-500">{formatDate(donation.completed_at || donation.created_at)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(donation.amount)}</div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[donation.status] || statusStyles.pending}`}>
                          {donation.status}
                        </span>
                      </div>
                    </div>

                    {donation.status === 'completed' && donation.source !== 'legacy_giving' && donation.source !== 'usher_checkin' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => downloadReceipt(donation)}
                          disabled={receiptLoadingId === donation.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-60"
                        >
                          {receiptLoadingId === donation.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </DashboardPanel>
        </div>
      </div>

      {canUsher && (
        <DashboardPanel
          title="Sunday Service Collection"
          icon={Building2}
          action={
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Today's summary */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <p className="text-xl font-bold text-emerald-700">
                    {formatCurrency(Number(sundaySummary?.total_amount || 0))}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Total Collected</p>
                </div>
                <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-center">
                  <p className="text-xl font-bold text-purple-700">
                    {sundaySummary?.total_entries || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Envelopes</p>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {loadingSunday ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                ) : (sundaySummary?.entries || []).length > 0 ? (
                  (sundaySummary.entries).map((entry, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{entry.donor_name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-400">{entry.fund || 'General'}</p>
                      </div>
                      <p className="font-bold text-slate-900">{formatCurrency(Number(entry.amount))}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-slate-400">No entries yet today.</p>
                )}
              </div>
            </div>

            {/* Entry form */}
            <form onSubmit={handleUsherSubmit} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Record Cash Offering</p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={usherForm.amount}
                  onChange={(e) => setUsherForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="Amount (R)"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  required
                />
              </div>
              <select
                value={usherForm.fund_id}
                onChange={(e) => setUsherForm((f) => ({ ...f, fund_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
                value={usherForm.donor_name}
                onChange={(e) => setUsherForm((f) => ({ ...f, donor_name: e.target.value }))}
                placeholder="Donor name (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
              <button
                type="submit"
                disabled={usherSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
              >
                {usherSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {usherSubmitting ? 'Recording...' : 'Record Offering'}
              </button>
            </form>
          </div>
        </DashboardPanel>
      )}
    </div>
  );
}
