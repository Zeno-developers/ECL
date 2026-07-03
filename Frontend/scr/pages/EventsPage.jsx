import { useState, useEffect } from 'react'
import { eventsAPI } from '../utils/api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Filter, Loader, MapPin, Plus, Search, Trash2, Users, Edit, Eye } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'
import { useAuth } from '../contexts/AuthContext'

const EVENT_TYPES = [
  { value: 'all', label: 'All Types' },
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

const DATE_FILTERS = [
  { value: 'all', label: 'All Dates' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'past', label: 'Past' },
]

const TYPE_BADGE = {
  service: 'text-blue-700 bg-blue-500/10',
  meeting: 'text-red-700 bg-red-500/10',
  outreach: 'text-orange-700 bg-orange-500/10',
  social: 'text-violet-700 bg-violet-500/10',
  prayer: 'text-pink-700 bg-pink-500/10',
  youth: 'text-green-700 bg-green-500/10',
  study: 'text-indigo-700 bg-indigo-500/10',
  training: 'text-teal-700 bg-teal-500/10',
}

function getStatus(dateStr) {
  if (!dateStr) return 'unknown'
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return 'today'
  if (d < today) return 'past'
  return 'upcoming'
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export default function EventsPage() {
  const { user } = useAuth()
  const canManage = ['admin', 'pastor', 'superadmin', 'elder'].includes(user?.role)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => { loadEvents() }, [])

  const loadEvents = async () => {
    try {
      const response = await eventsAPI.getEvents()
      const data = response?.data || response
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (eventId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    setDeleteLoading(eventId)
    try {
      await eventsAPI.deleteEvent(eventId)
      setEvents((prev) => prev.filter((e) => (e._id || e.id) !== eventId))
      toast.success('Event deleted')
    } catch (error) {
      toast.error(error.message || 'Failed to delete event')
    } finally {
      setDeleteLoading(null)
    }
  }

  const filtered = events.filter((event) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (
        !event.title?.toLowerCase().includes(term) &&
        !event.description?.toLowerCase().includes(term) &&
        !event.location?.toLowerCase().includes(term)
      ) return false
    }
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const d = new Date(event.date)
      d.setHours(0, 0, 0, 0)
      if (dateFilter === 'upcoming' && d < today) return false
      if (dateFilter === 'past' && d >= today) return false
      if (dateFilter === 'today' && d.getTime() !== today.getTime()) return false
    }
    return true
  })

  const hasFilters = searchTerm || typeFilter !== 'all' || dateFilter !== 'all'

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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">EVENTS</h1>
            <p className="mt-2 text-sm text-warm-muted">{canManage ? 'Manage church events and calendar.' : 'Browse upcoming church events.'}</p>
          </div>
          {canManage && (
            <button
              onClick={() => navigate('/events/create')}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <Plus size={14} />
              CREATE EVENT
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-2.5 pl-9 pr-4 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="relative">
              <Filter size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-2.5 pl-9 pr-4 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-2.5 text-sm text-warm-charcoal focus:border-warm-gold/40 focus:outline-none"
            >
              {DATE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-warm-muted">
              {filtered.length} of {events.length} events
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearchTerm(''); setTypeFilter('all'); setDateFilter('all') }}
                className="text-[10px] text-warm-gold hover:opacity-70 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Event Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
            <Calendar size={32} className="mx-auto mb-4 text-warm-gold/30" />
            <p className="text-sm font-semibold text-warm-muted">
              {events.length === 0 ? 'No events yet' : 'No events match your filters'}
            </p>
            {events.length === 0 ? (
              canManage && (
                <button
                  onClick={() => navigate('/events/create')}
                  className="mt-4 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
                >
                  CREATE FIRST EVENT
                </button>
              )
            ) : (
              <button
                onClick={() => { setSearchTerm(''); setTypeFilter('all'); setDateFilter('all') }}
                className="mt-4 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((event) => {
              const status = getStatus(event.date)
              const id = event._id || event.id
              return (
                <div key={id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-warm-charcoal line-clamp-1">{event.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${TYPE_BADGE[event.type] || 'text-warm-muted bg-warm-charcoal/[0.05]'}`}>
                          {EVENT_TYPES.find((t) => t.value === event.type)?.label?.toUpperCase() || (event.type || 'EVENT').toUpperCase()}
                        </span>
                        {status === 'today' && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-orange-700 bg-orange-500/10">
                            TODAY
                          </span>
                        )}
                        {status === 'past' && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-warm-muted bg-warm-charcoal/[0.05]">
                            PAST
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs text-warm-muted line-clamp-2">{event.description}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-warm-muted">
                    <div className="flex items-center gap-2">
                      <Calendar size={11} className="shrink-0 text-warm-gold/60" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    {event.time && (
                      <div className="flex items-center gap-2">
                        <Clock size={11} className="shrink-0 text-warm-gold/60" />
                        <span>{event.time}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={11} className="shrink-0 text-warm-gold/60" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    {event.attendees > 0 && (
                      <div className="flex items-center gap-2">
                        <Users size={11} className="shrink-0 text-warm-gold/60" />
                        <span>{event.attendees} attendees</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 border-t border-warm-charcoal/[0.07]">
                    <button
                      onClick={() => navigate(`/events/${id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-warm-charcoal/[0.07] bg-white py-2 text-xs font-medium text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal"
                    >
                      <Eye size={11} />
                      View
                    </button>
                    {canManage && (
                      <button
                        onClick={() => navigate(`/events/edit/${id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-warm-charcoal/[0.07] bg-white py-2 text-xs font-medium text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal"
                      >
                        <Edit size={11} />
                        Edit
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleDelete(id, event.title)}
                        disabled={deleteLoading === id}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                      >
                        {deleteLoading === id ? (
                          <Loader size={11} className="animate-spin" />
                        ) : (
                          <Trash2 size={11} />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
