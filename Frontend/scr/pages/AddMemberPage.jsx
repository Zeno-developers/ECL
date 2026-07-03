import { useState } from 'react'
import { membersAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { UserPlus, ArrowLeft } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const inputErrCls = 'w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:outline-none'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function AddMemberPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    joinDate: new Date().toISOString().split('T')[0],
    role: 'member',
    status: 'active',
    gender: '',
    maritalStatus: '',
    occupation: '',
    emergencyContact: '',
    notes: '',
  })

  const validateForm = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email is invalid'
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) errs.phone = 'Phone number is invalid'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) { toast.error('Please fix the form errors'); return }
    setLoading(true)
    try {
      const memberData = {
        first_name: formData.name.trim().split(/\s+/)[0] || '',
        last_name: formData.name.trim().split(/\s+/).slice(1).join(' ') || '',
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        date_of_birth: formData.dateOfBirth || undefined,
        membership_date: formData.joinDate,
        role: formData.role,
        status: formData.status,
        is_active: formData.status === 'active',
        gender: formData.gender || undefined,
        marital_status: formData.maritalStatus || undefined,
        occupation: formData.occupation.trim() || undefined,
        emergency_contact: formData.emergencyContact.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }
      const result = await membersAPI.addMember(memberData)
      const saved = result?.data || result
      const savedName = saved?.name || `${saved?.first_name || ''} ${saved?.last_name || ''}`.trim() || 'Member'
      toast.success(`${savedName} added successfully!`)
      navigate('/members')
    } catch (error) {
      if (error.message?.includes('email already exists')) {
        setErrors({ email: 'A member with this email already exists' })
        toast.error('A member with this email already exists')
      } else {
        toast.error(error.message || 'Failed to add member')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button onClick={() => navigate('/members')} disabled={loading} className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">ADD MEMBER</h1>
            <p className="mt-1 text-sm text-warm-muted">Register a new church member.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">PERSONAL INFORMATION</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className={errors.name ? inputErrCls : inputCls} placeholder="Enter full name" />
                {errors.name && <p className="mt-1 text-[10px] text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} className={errors.email ? inputErrCls : inputCls} placeholder="Enter email address" />
                {errors.email && <p className="mt-1 text-[10px] text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={errors.phone ? inputErrCls : inputCls} placeholder="Enter phone number" />
                {errors.phone && <p className="mt-1 text-[10px] text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className={inputCls}>
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Church Information */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">CHURCH INFORMATION</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className={inputCls}>
                  {['member', 'volunteer', 'deacon', 'elder', 'usher', 'cell_leader', 'zone_leader', 'pastor', 'admin', 'superadmin', 'developer'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="visitor">Visitor</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Join Date *</label>
                <input type="date" name="joinDate" required value={formData.joinDate} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">ADDITIONAL INFORMATION</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Occupation</label>
                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className={inputCls} placeholder="Enter occupation" />
              </div>
              <div>
                <label className={labelCls}>Emergency Contact</label>
                <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className={inputCls} placeholder="Name and number" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className={`${inputCls} resize-none`} placeholder="Enter full address" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={`${inputCls} resize-none`} placeholder="Any additional notes" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/members')} disabled={loading} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-5 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
              <UserPlus size={13} />
              {loading ? 'ADDING...' : 'ADD MEMBER'}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  )
}
