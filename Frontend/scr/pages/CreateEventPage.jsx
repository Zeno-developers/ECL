import { useState } from 'react'
import { eventsAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const inputErrCls = 'w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:outline-none'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

const EVENT_TYPES = [
  { value: 'service', label: 'Church Service' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'social', label: 'Social Event' },
  { value: 'prayer', label: 'Prayer Meeting' },
  { value: 'youth', label: 'Youth Event' },
  { value: 'study', label: 'Bible Study' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
const MINUTE_OPTIONS = ['00', '15', '30', '45']

const convertTo24Hour = (hour, minute, ampm) => {
  let h = parseInt(hour)
  if (ampm === 'PM' && h !== 12) h += 12
  else if (ampm === 'AM' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${minute}`
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    hour: '',
    minute: '',
    ampm: 'AM',
    type: 'service',
    description: '',
    location: 'A3313 Rd 3935, Mtubatuba, South Africa',
    is_published: true,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.title.trim()) errs.title = 'Event title is required'
    else if (formData.title.trim().length < 3) errs.title = 'Event title must be at least 3 characters'
    if (!formData.date) errs.date = 'Event date is required'
    else {
      const sel = new Date(formData.date)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (sel < today) errs.date = 'Event date cannot be in the past'
    }
    if (!formData.hour) errs.hour = 'Hour is required'
    if (!formData.minute) errs.minute = 'Minute is required'
    if (!formData.type) errs.type = 'Event type is required'
    if (!formData.location.trim()) errs.location = 'Event location is required'
    if (formData.description.length > 500) errs.description = 'Description cannot exceed 500 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) { toast.error('Please fix the form errors before submitting'); return }
    setLoading(true)
    try {
      const eventData = {
        title: formData.title.trim(),
        date: formData.date,
        time: convertTo24Hour(formData.hour, formData.minute, formData.ampm),
        type: formData.type,
        description: formData.description.trim(),
        location: formData.location.trim(),
        is_published: Boolean(formData.is_published),
      }
      await eventsAPI.createEvent(eventData)
      toast.success('Event created successfully!')
      navigate('/events/manage')
    } catch (error) {
      if (error.message?.includes('Unauthorized')) { toast.error('Please log in to create events'); navigate('/login') }
      else toast.error(error.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const formatTimePreview = () => {
    if (!formData.hour || !formData.minute) return '—'
    return `${formData.hour}:${formData.minute} ${formData.ampm}`
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <button onClick={() => navigate('/events/manage')} disabled={loading} className="rounded-xl border border-warm-charcoal/[0.07] bg-white p-2.5 text-warm-muted transition hover:text-warm-charcoal shadow-sm">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">CREATE EVENT</h1>
            <p className="mt-1 text-sm text-warm-muted">Fill in the details to create a new church event.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
              <div>
                <label className={labelCls}>Event Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className={errors.title ? inputErrCls : inputCls} placeholder="Enter event title" disabled={loading} maxLength={100} />
                {errors.title && <p className="mt-1 text-[10px] text-red-600">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Event Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className={errors.date ? inputErrCls : inputCls} disabled={loading} />
                  {errors.date && <p className="mt-1 text-[10px] text-red-600">{errors.date}</p>}
                </div>
                <div>
                  <label className={labelCls}>Event Time *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select name="hour" value={formData.hour} onChange={handleChange} className={errors.hour ? inputErrCls : inputCls} disabled={loading}>
                      <option value="">Hour</option>
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select name="minute" value={formData.minute} onChange={handleChange} className={errors.minute ? inputErrCls : inputCls} disabled={loading}>
                      <option value="">Min</option>
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select name="ampm" value={formData.ampm} onChange={handleChange} className={inputCls} disabled={loading}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  {(errors.hour || errors.minute) && <p className="mt-1 text-[10px] text-red-600">Hour and minute are required</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Event Type *</label>
                  <select name="type" value={formData.type} onChange={handleChange} className={errors.type ? inputErrCls : inputCls} disabled={loading}>
                    {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Location *</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className={errors.location ? inputErrCls : inputCls} placeholder="Enter event location" disabled={loading} maxLength={200} />
                  {errors.location && <p className="mt-1 text-[10px] text-red-600">{errors.location}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Description
                  <span className={`ml-2 normal-case font-normal ${formData.description.length > 500 ? 'text-red-600' : 'text-warm-muted'}`}>
                    {formData.description.length}/500
                  </span>
                </label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={`${errors.description ? inputErrCls : inputCls} resize-none`} placeholder="Enter event description (optional)" disabled={loading} maxLength={500} />
                {errors.description && <p className="mt-1 text-[10px] text-red-600">{errors.description}</p>}
              </div>

              <div className="rounded-xl border border-warm-gold/20 bg-warm-gold/[0.04] p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_published)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="w-4 h-4 rounded accent-warm-gold"
                    disabled={loading}
                  />
                  <span className="text-sm font-semibold text-warm-espresso">Show this event on the public website</span>
                </label>
                <p className="mt-1.5 ml-7 text-xs text-warm-muted">Turn this on to make the event visible on the public Events page.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => navigate('/events/manage')} disabled={loading} className="rounded-xl border border-warm-charcoal/[0.07] bg-white px-5 py-2.5 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50">
                <Plus size={13} />
                {loading ? 'CREATING...' : 'CREATE EVENT'}
              </button>
            </div>
          </form>

          {/* Preview */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 space-y-4 h-fit sticky top-6 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">EVENT PREVIEW</p>
            <div className="space-y-3">
              {[
                ['Title', formData.title || '—'],
                ['Date', formData.date ? new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
                ['Time', formatTimePreview()],
                ['Type', EVENT_TYPES.find((t) => t.value === formData.type)?.label || '—'],
                ['Location', formData.location || '—'],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-warm-charcoal/[0.07] pb-3">
                  <p className="text-[10px] text-warm-muted">{k}</p>
                  <p className="text-xs font-semibold text-warm-espresso mt-0.5">{v}</p>
                </div>
              ))}
              {formData.description && (
                <div>
                  <p className="text-[10px] text-warm-muted">Description</p>
                  <p className="text-xs text-warm-muted mt-0.5 leading-relaxed">{formData.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
