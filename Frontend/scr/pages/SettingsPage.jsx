import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Loader, Lock, Save, User } from 'lucide-react'
import { authAPI, membersAPI, settingsAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { broadcastChurchSettingsUpdate, getCachedChurchSettings } from '../utils/churchSettings'
import DashboardShell from '../components/dashboard/DashboardShell'

const ADMIN_ROLES = ['pastor', 'admin', 'superadmin', 'elder']

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'location', label: 'Location & Social' },
  { id: 'reports', label: 'Reports' },
]

const defaultSettings = {
  name: 'Eternal Love Church',
  description: '',
  pastorName: '',
  mission: '',
  vision: '',
  address: '',
  phone: '',
  email: '',
  serviceTimes: { sunday: 'Sunday 10:00 AM', wednesday: 'Wednesday 6:00 PM', friday: 'Friday 6:00 PM' },
  map_embed_url: '',
  latitude: -28.3865629,
  longitude: 32.1746065,
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
  pastor_report_email: '',
}

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

// --- Profile view for regular members ----------------------------------------

function ProfileView() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState({
    first_name: user?.first_name || user?.name?.split(' ')[0] || '',
    last_name: user?.last_name || user?.name?.split(' ').slice(1).join(' ') || '',
    phone: user?.phone || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [savingPw, setSavingPw] = useState(false)

  const toggleShow = (field) => setShowPw((p) => ({ ...p, [field]: !p[field] }))

  const handleProfileSave = async () => {
    setSavingProfile(true)
    try {
      const res = await membersAPI.updateProfile(profile)
      const updated = res?.data?.member
      if (updated && updateUser) updateUser({ ...user, ...updated })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!passwords.current) { toast.error('Enter your current password'); return }
    if (passwords.next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (passwords.next !== passwords.confirm) { toast.error('Passwords do not match'); return }

    setSavingPw(true)
    try {
      await authAPI.updatePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
        newPasswordConfirm: passwords.confirm,
      })
      toast.success('Password changed')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setSavingPw(false)
    }
  }

  const formatRole = (role) => {
    if (!role) return 'Member'
    if (role === 'cell_leader') return 'Cell Leader'
    if (role === 'zone_leader') return 'Zone Leader'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="border-b border-warm-charcoal/[0.07] pb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warm-gold/10 text-xl font-black text-warm-gold">
            {(profile.first_name?.[0] || user?.name?.[0] || 'M').toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">MY PROFILE</h1>
            <p className="mt-0.5 text-sm text-warm-muted">{formatRole(user?.role)} · {user?.email}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-warm-gold" />
          <h2 className="text-xs font-bold tracking-[0.15em] text-warm-charcoal">PERSONAL INFO</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name</label>
            <input
              className={inputCls}
              value={profile.first_name}
              onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              className={inputCls}
              value={profile.last_name}
              onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Phone / WhatsApp</label>
          <input
            className={inputCls}
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+27 000 000 0000"
          />
          <p className="mt-1 text-[10px] text-warm-muted">This number is used for WhatsApp notifications (e.g. Monday morning reports).</p>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls + ' opacity-60 cursor-not-allowed'} value={user?.email || ''} readOnly />
          <p className="mt-1 text-[10px] text-warm-muted">Email cannot be changed here. Contact your admin.</p>
        </div>

        <div className="border-t border-warm-charcoal/[0.07] pt-5 flex justify-end">
          <button
            onClick={handleProfileSave}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-3 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
          >
            {savingProfile ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {savingProfile ? 'SAVING...' : 'SAVE PROFILE'}
          </button>
        </div>
      </div>

      {/* Password change */}
      <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-warm-gold" />
          <h2 className="text-xs font-bold tracking-[0.15em] text-warm-charcoal">CHANGE PASSWORD</h2>
        </div>

        {[
          { key: 'current', label: 'Current Password' },
          { key: 'next', label: 'New Password' },
          { key: 'confirm', label: 'Confirm New Password' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <div className="relative">
              <input
                type={showPw[key] ? 'text' : 'password'}
                className={inputCls + ' pr-11'}
                value={passwords[key]}
                onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={key === 'current' ? 'Your current password' : key === 'next' ? 'Min 8 characters' : 'Repeat new password'}
              />
              <button
                type="button"
                onClick={() => toggleShow(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm-charcoal transition"
              >
                {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}

        <div className="border-t border-warm-charcoal/[0.07] pt-5 flex justify-end">
          <button
            onClick={handlePasswordSave}
            disabled={savingPw}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-3 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
          >
            {savingPw ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />}
            {savingPw ? 'SAVING...' : 'CHANGE PASSWORD'}
          </button>
        </div>
      </div>

    </div>
  )
}

// --- Admin settings view ------------------------------------------------------

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...getCachedChurchSettings() }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('general')

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    loadSettings()
  }, [user, isAdmin])

  const loadSettings = async () => {
    try {
      const [allRes, pubRes] = await Promise.allSettled([
        settingsAPI.getSettings(),
        settingsAPI.getPublicSettings(),
      ])
      const internal = allRes.status === 'fulfilled' ? (allRes.value?.data || {}) : {}
      const publicData = pubRes.status === 'fulfilled' ? (pubRes.value?.data || {}) : {}
      setSettings((prev) => ({
        ...prev,
        ...publicData,
        ...internal,
        serviceTimes: internal.serviceTimes || publicData.serviceTimes || prev.serviceTimes,
      }))
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const setField = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }))
  const setServiceTime = (name, value) =>
    setSettings((prev) => ({ ...prev, serviceTimes: { ...(prev.serviceTimes || {}), [name]: value } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        ...settings,
        latitude: settings.latitude ? parseFloat(settings.latitude) : settings.latitude,
        longitude: settings.longitude ? parseFloat(settings.longitude) : settings.longitude,
      }
      await settingsAPI.updateSettings(data)
      broadcastChurchSettingsUpdate(data)
      toast.success('Settings saved')
    } catch (error) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabBody = useMemo(() => {
    if (tab === 'general') return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Church Name</label>
            <input className={inputCls} value={settings.name || ''} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Pastor Name</label>
            <input className={inputCls} value={settings.pastorName || ''} onChange={(e) => setField('pastorName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea rows={3} className={inputCls} value={settings.description || ''} onChange={(e) => setField('description', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Mission</label>
          <textarea rows={3} className={inputCls} value={settings.mission || ''} onChange={(e) => setField('mission', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Vision</label>
          <textarea rows={3} className={inputCls} value={settings.vision || ''} onChange={(e) => setField('vision', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Sunday Service</label>
            <input className={inputCls} value={settings.serviceTimes?.sunday || ''} onChange={(e) => setServiceTime('sunday', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Wednesday Service</label>
            <input className={inputCls} value={settings.serviceTimes?.wednesday || ''} onChange={(e) => setServiceTime('wednesday', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Friday Service</label>
            <input className={inputCls} value={settings.serviceTimes?.friday || ''} onChange={(e) => setServiceTime('friday', e.target.value)} />
          </div>
        </div>
      </div>
    )

    if (tab === 'location') return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={settings.email || ''} onChange={(e) => setField('email', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={settings.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <textarea rows={2} className={inputCls} value={settings.address || ''} onChange={(e) => setField('address', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Google Map Embed URL</label>
          <input className={inputCls} value={settings.map_embed_url || ''} onChange={(e) => setField('map_embed_url', e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
          <p className="mt-1 text-[10px] text-warm-muted">Or enter coordinates below to auto-generate embed URL.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Latitude</label>
            <input className={inputCls} type="number" step="0.00001" value={settings.latitude || ''} onChange={(e) => setField('latitude', e.target.value ? parseFloat(e.target.value) : '')} placeholder="-28.3865629" />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input className={inputCls} type="number" step="0.00001" value={settings.longitude || ''} onChange={(e) => setField('longitude', e.target.value ? parseFloat(e.target.value) : '')} placeholder="32.1746065" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Facebook</label>
            <input className={inputCls} value={settings.social_facebook || ''} onChange={(e) => setField('social_facebook', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Instagram</label>
            <input className={inputCls} value={settings.social_instagram || ''} onChange={(e) => setField('social_instagram', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>YouTube</label>
            <input className={inputCls} value={settings.social_youtube || ''} onChange={(e) => setField('social_youtube', e.target.value)} />
          </div>
        </div>
      </div>
    )

    return (
      <div className="space-y-5">
        <p className="text-xs text-warm-muted">This email receives Monday weekly reports, including Sunday collection totals.</p>
        <div>
          <label className={labelCls}>Pastor Report Email (Private)</label>
          <input
            type="email"
            className={inputCls}
            value={settings.pastor_report_email || ''}
            onChange={(e) => setField('pastor_report_email', e.target.value)}
            placeholder="pastor.personal@email.com"
          />
        </div>
      </div>
    )
  }, [settings, tab])

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      </DashboardShell>
    )
  }

  if (!isAdmin) {
    return (
      <DashboardShell>
        <ProfileView />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">SETTINGS</h1>
          <p className="mt-2 text-sm text-warm-muted">Control website content, map, social links, and report delivery.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* Tab list */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-3 h-fit shadow-sm">
            <div className="space-y-0.5">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] transition ${
                    tab === item.id
                      ? 'bg-warm-gold/[0.08] text-warm-plum'
                      : 'text-warm-muted hover:bg-warm-ivory hover:text-warm-charcoal'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab body */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 shadow-sm">
            {tabBody}
            <div className="mt-8 border-t border-warm-charcoal/[0.07] pt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-3 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
