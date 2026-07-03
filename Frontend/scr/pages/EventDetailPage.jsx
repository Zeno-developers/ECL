import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { eventsAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { Calendar, Clock, MapPin, Edit, Users, FileText, Tag } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { DashboardPanel, DashboardStatGrid } from '../components/dashboard/RoleDashboardUI'

const formatDate = (value) => {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])

  useEffect(() => { loadEvent() }, [id])

  const loadEvent = async () => {
    try {
      setLoading(true)
      const [eventRes, registrationsRes] = await Promise.allSettled([
        eventsAPI.getOne(id),
        eventsAPI.getRegistrations(id),
      ])
      if (eventRes.status === 'fulfilled') setEvent(eventRes.value?.data || eventRes.value || null)
      if (registrationsRes.status === 'fulfilled') setRegistrations(registrationsRes.value?.data || [])
    } catch (error) {
      toast.error(error.message || 'Failed to load event')
      navigate('/events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
        </div>
      </DashboardShell>
    )
  }

  if (!event) return null

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-zinc-600 mb-1">{event.type?.toUpperCase() || 'EVENT'}</p>
            <h1 className="text-3xl font-black tracking-tighter text-white">{event.title || 'Event Detail'}</h1>
            <p className="mt-2 text-sm text-zinc-500">Event schedule, logistics, and registration overview.</p>
          </div>
          <button
            onClick={() => navigate(`/events/edit/${id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-[#050505] transition hover:opacity-90 shrink-0"
          >
            <Edit size={13} />
            EDIT EVENT
          </button>
        </div>

        <DashboardStatGrid
          stats={[
            { label: 'Event Date', value: formatDate(event.date), icon: Calendar },
            { label: 'Time', value: event.time || 'TBD', icon: Clock },
            { label: 'Location', value: event.location || 'TBD', icon: MapPin },
            { label: 'Registrations', value: registrations.length, icon: Users },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,0.9fr] gap-6">
          <DashboardPanel title="Event Details" icon={FileText}>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-1.5">Description</p>
                <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed">
                  {event.description || 'No description has been added for this event yet.'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <Tag size={15} className="text-zinc-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Type</p>
                    <p className="mt-0.5 font-medium text-zinc-300 capitalize">{event.type || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-zinc-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Location</p>
                    <p className="mt-0.5 font-medium text-zinc-300">{event.location || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Registrations" icon={Users}>
            {registrations.length === 0 ? (
              <p className="text-sm text-zinc-600">No registrations have been recorded for this event yet.</p>
            ) : (
              <div className="space-y-2">
                {registrations.map((reg, index) => (
                  <div key={reg.id || reg._id || index} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-sm font-semibold text-zinc-300">
                      {reg.name || reg.full_name || reg.email || 'Registrant'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{reg.email || 'No email provided'}</p>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardShell>
  )
}
