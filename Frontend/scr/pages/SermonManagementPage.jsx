import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import { BookOpen, Edit3, Eye, Pause, Play, Plus, Search, Trash2 } from 'lucide-react'
import { sermonsAPI } from '../utils/api'
import DashboardShell from '../components/dashboard/DashboardShell'

function isPublished(sermon) {
  return sermon?.published === 1 || sermon?.status === 'published'
}

export default function SermonManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [sermons, setSermons] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    loadSermons()
  }, [user])

  const loadSermons = async () => {
    try {
      setLoading(true)
      const response = await sermonsAPI.getAll({ limit: 200 })
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      setSermons(data)
    } catch (error) {
      toast.error('Failed to load sermons')
    } finally {
      setLoading(false)
    }
  }

  const filteredSermons = useMemo(() => {
    return sermons.filter((sermon) => {
      if (filter === 'published' && !isPublished(sermon)) return false
      if (filter === 'draft' && isPublished(sermon)) return false
      const term = searchTerm.trim().toLowerCase()
      if (!term) return true
      return [sermon.title, sermon.speaker, sermon.description, sermon.series, sermon.scripture]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    })
  }, [sermons, filter, searchTerm])

  const handleDelete = async (sermon) => {
    if (!window.confirm(`Delete "${sermon.title}"? This cannot be undone.`)) return
    try {
      setSavingId(sermon.id)
      await sermonsAPI.delete(sermon.id)
      setSermons((prev) => prev.filter((s) => s.id !== sermon.id))
      toast.success('Sermon deleted')
    } catch (error) {
      toast.error('Failed to delete sermon')
    } finally {
      setSavingId(null)
    }
  }

  const handlePublishToggle = async (sermon) => {
    try {
      setSavingId(sermon.id)
      if (isPublished(sermon)) {
        await sermonsAPI.unpublish(sermon.id)
      } else {
        await sermonsAPI.publish(sermon.id)
      }
      await loadSermons()
      toast.success('Sermon updated')
    } catch (error) {
      toast.error('Failed to update sermon')
    } finally {
      setSavingId(null)
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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">SERMONS</h1>
            <p className="mt-2 text-sm text-warm-muted">Edit, publish, and manage sermon content.</p>
          </div>
          <button
            onClick={() => navigate('/sermons/upload')}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
          >
            <Plus size={14} />
            UPLOAD SERMON
          </button>
        </div>

        {/* Search & Filter */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, speaker, series..."
                className="w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory py-2.5 pl-9 pr-4 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-1">
              {['all', 'published', 'draft'].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    filter === v
                      ? 'bg-warm-gold/[0.08] text-warm-plum border border-warm-gold/20'
                      : 'text-warm-muted hover:text-warm-charcoal'
                  }`}
                >
                  {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[10px] text-warm-muted">
            {filteredSermons.length} of {sermons.length} sermons
          </p>
        </div>

        {/* Grid */}
        {filteredSermons.length === 0 ? (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white py-16 text-center shadow-sm">
            <BookOpen size={32} className="mx-auto mb-4 text-warm-gold/30" />
            <p className="text-sm font-semibold text-warm-muted">No sermons found</p>
            <p className="mt-1 text-xs text-warm-muted">Try a different search or upload a new sermon.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSermons.map((sermon) => {
              const published = isPublished(sermon)
              return (
                <article key={sermon.id} className="rounded-2xl border border-warm-charcoal/[0.07] bg-white overflow-hidden flex flex-col shadow-sm">
                  <div className="relative h-40 bg-warm-ivory flex items-center justify-center">
                    {sermon.thumbnail_url || sermon.thumbnailUrl ? (
                      <img
                        src={sermonsAPI.getThumbnailUrl(sermon.thumbnail_url || sermon.thumbnailUrl)}
                        alt={sermon.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Play size={36} className="text-warm-gold/30" />
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] ${
                        published ? 'text-emerald-700 bg-emerald-500/10' : 'text-amber-700 bg-amber-500/10'
                      }`}>
                        {published ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 gap-3 p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-warm-espresso line-clamp-1">{sermon.title}</h3>
                      {sermon.speaker && (
                        <p className="mt-0.5 text-xs text-warm-gold">{sermon.speaker}</p>
                      )}
                    </div>

                    {sermon.description && (
                      <p className="text-xs text-warm-muted line-clamp-2">{sermon.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-warm-muted">
                      <div className="flex items-center gap-1">
                        <Eye size={11} />
                        <span>{sermon.views || 0} views</span>
                      </div>
                      {sermon.series && (
                        <span className="rounded-full border border-warm-charcoal/[0.07] px-2 py-0.5 text-[9px]">
                          {sermon.series}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-warm-charcoal/[0.07] mt-auto">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate('/sermons/upload', { state: { draft: sermon } })}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-warm-charcoal/[0.07] bg-white py-2 text-xs font-medium text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal"
                        >
                          <Edit3 size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => handlePublishToggle(sermon)}
                          disabled={savingId === sermon.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-warm-gold py-2 text-xs font-bold text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                        >
                          {published ? <Pause size={11} /> : <Play size={11} />}
                          {published ? 'Unpublish' : 'Publish'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(sermon)}
                        disabled={savingId === sermon.id}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
