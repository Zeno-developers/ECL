import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Save, ArrowLeft } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function EditMemberPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    role: 'member',
    status: 'active',
    gender: '',
    marital_status: '',
    emergency_contact: '',
    notes: '',
  })

  useEffect(() => { loadMember() }, [id])

  const loadMember = async () => {
    try {
      setLoading(true)
      const response = await membersAPI.getOne(id)
      const member = response?.data || {}
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        date_of_birth: member.date_of_birth || '',
        role: member.role || 'member',
        status: member.status || 'active',
        gender: member.gender || '',
        marital_status: member.marital_status || '',
        emergency_contact: member.emergency_contact || '',
        notes: member.notes || '',
      })
    } catch (error) {
      toast.error(error.message || 'Failed to load member')
      navigate('/members')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await membersAPI.update(id, { ...formData, is_active: formData.status === 'active' })
      toast.success('Member updated successfully')
      navigate(`/members/${id}`)
    } catch (error) {
      toast.error(error.message || 'Failed to update member')
    } finally {
      setSaving(false)
    }
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
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button onClick={() => navigate(`/members/${id}`)} className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">EDIT MEMBER</h1>
            <p className="mt-1 text-sm text-warm-muted">Update member details, role, and contact information.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">PERSONAL INFORMATION</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['first_name', 'First Name'],
                ['last_name', 'Last Name'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel'],
                ['date_of_birth', 'Date of Birth', 'date'],
                ['emergency_contact', 'Emergency Contact'],
              ].map(([name, label, type = 'text']) => (
                <div key={name}>
                  <label className={labelCls}>{label}</label>
                  <input type={type} name={name} value={formData[name]} onChange={handleChange} className={inputCls} />
                </div>
              ))}

              <div>
                <label className={labelCls}>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Marital Status</label>
                <select name="marital_status" value={formData.marital_status} onChange={handleChange} className={inputCls}>
                  <option value="">Select marital status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Church Info */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">CHURCH INFORMATION</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className={inputCls}>
                  {['member', 'cell_leader', 'zone_leader', 'usher', 'admin', 'pastor', 'elder', 'superadmin'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                  {['active', 'visitor', 'inactive'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={5} className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate(`/members/${id}`)} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-5 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
              <Save size={13} />
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  )
}
