import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Download, FileText, Plus, Save, Send, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../contexts/AuthContext'
import { sermonsAPI } from '../utils/api'
import {
  buildSermonDraftDescription,
  createEmptySermonDraft,
  exportSermonDrafts,
} from '../utils/sermonDrafts'
import DashboardShell from '../components/dashboard/DashboardShell'

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white'
const labelCls = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-muted'

export default function SermonPrepPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [drafts, setDrafts] = useState([])
  const [sermon, setSermon] = useState(() =>
    createEmptySermonDraft({
      speaker: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    })
  )
  const [saving, setSaving] = useState(false)
  const [loadingDrafts, setLoadingDrafts] = useState(true)

  useEffect(() => { loadDrafts(location.state?.draftId) }, [location.state?.draftId])

  const currentDraftLabel = useMemo(() => {
    if (!sermon?.updated_at) return 'New draft'
    return `Last saved ${new Date(sermon.updated_at).toLocaleString()}`
  }, [sermon])

  const hasDraftContent = useMemo(
    () => Boolean(
      sermon.title.trim() || sermon.scripture.trim() ||
      sermon.series.trim() || sermon.outline.trim() || sermon.notes.trim()
    ),
    [sermon]
  )

  const loadDrafts = async (requestedDraftId = null, nextCurrentDraft = null) => {
    try {
      setLoadingDrafts(true)
      const response = await sermonsAPI.getDrafts()
      const nextDrafts = Array.isArray(response?.data) ? response.data : []
      setDrafts(nextDrafts)

      if (nextCurrentDraft) { setSermon(nextCurrentDraft); return }
      if (requestedDraftId) {
        const found = nextDrafts.find((d) => String(d.id) === String(requestedDraftId))
        if (found) { setSermon(found); return }
      }
      if (nextDrafts.length > 0) { setSermon(nextDrafts[0]); return }
      setSermon(createEmptySermonDraft({ speaker: [user?.first_name, user?.last_name].filter(Boolean).join(' ') }))
    } catch (error) {
      toast.error(error.message || 'Failed to load sermon drafts')
    } finally {
      setLoadingDrafts(false)
    }
  }

  const handleSave = async () => {
    if (!hasDraftContent) {
      toast.error('Add a title, outline, or notes before saving')
      return
    }
    setSaving(true)
    try {
      const response = await sermonsAPI.saveDraft({
        ...sermon,
        speaker: sermon.speaker.trim() || [user?.first_name, user?.last_name].filter(Boolean).join(' '),
        planned_date: sermon.planned_date || null,
      })
      const saved = response?.data || sermon
      await loadDrafts(null, saved)
      toast.success('Sermon draft saved')
    } catch (error) {
      toast.error(error.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDraft = async (draftId) => {
    const target = drafts.find((d) => d.id === draftId)
    if (!window.confirm(`Delete ${target?.title || 'this draft'}?`)) return
    try {
      await sermonsAPI.delete(draftId)
      toast.success('Draft deleted')
      await loadDrafts()
    } catch (error) {
      toast.error(error.message || 'Failed to delete draft')
    }
  }

  const handleExportCurrent = () => {
    if (!hasDraftContent) { toast.error('Nothing to export yet'); return }
    exportSermonDrafts([sermon], { title: sermon.title || 'Sermon Draft', subtitle: `${sermon.speaker || 'Pastor'} sermon prep draft` })
  }

  const handleSendToUpload = async () => {
    let saved = sermon
    if (hasDraftContent) {
      try {
        const response = await sermonsAPI.saveDraft({
          ...sermon,
          speaker: sermon.speaker.trim() || [user?.first_name, user?.last_name].filter(Boolean).join(' '),
          planned_date: sermon.planned_date || null,
        })
        saved = response?.data || sermon
        await loadDrafts(null, saved)
      } catch (error) {
        toast.error(error.message || 'Failed to save before upload')
        return
      }
    }
    navigate('/sermons/upload', { state: { draft: { ...saved, description: buildSermonDraftDescription(saved) } } })
  }

  const updateField = (field, value) =>
    setSermon((prev) => ({ ...prev, [field]: value }))

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">SERMON PREP</h1>
            <p className="mt-2 text-sm text-warm-muted">Prepare notes, save drafts, and send to upload.</p>
            <p className="mt-1 text-[10px] text-warm-muted">{currentDraftLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSermon(createEmptySermonDraft({ speaker: [user?.first_name, user?.last_name].filter(Boolean).join(' ') }))}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm"
            >
              <Plus size={13} />
              New Draft
            </button>
            <button
              onClick={handleExportCurrent}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold text-warm-muted transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal shadow-sm"
            >
              <Download size={13} />
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingDrafts}
              className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-4 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? 'SAVING...' : loadingDrafts ? 'LOADING...' : 'SAVE DRAFT'}
            </button>
            <button
              onClick={handleSendToUpload}
              className="inline-flex items-center gap-2 rounded-xl border border-warm-gold/20 bg-warm-gold/[0.06] px-4 py-2.5 text-xs font-bold tracking-[0.15em] text-warm-plum transition hover:bg-warm-gold/[0.1]"
            >
              <Send size={13} />
              SEND TO UPLOAD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr,0.7fr] gap-6">
          {/* Main form */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sermon Title</label>
                <input
                  type="text"
                  value={sermon.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className={inputCls}
                  placeholder="Enter sermon title"
                />
              </div>
              <div>
                <label className={labelCls}>Speaker</label>
                <input
                  type="text"
                  value={sermon.speaker}
                  onChange={(e) => updateField('speaker', e.target.value)}
                  className={inputCls}
                  placeholder="Speaker name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Scripture Reference</label>
                <input
                  type="text"
                  value={sermon.scripture}
                  onChange={(e) => updateField('scripture', e.target.value)}
                  className={inputCls}
                  placeholder="e.g., John 3:16"
                />
              </div>
              <div>
                <label className={labelCls}>Series</label>
                <input
                  type="text"
                  value={sermon.series}
                  onChange={(e) => updateField('series', e.target.value)}
                  className={inputCls}
                  placeholder="Series name"
                />
              </div>
              <div>
                <label className={labelCls}>Planned Date</label>
                <input
                  type="date"
                  value={sermon.planned_date}
                  onChange={(e) => updateField('planned_date', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Sermon Outline</label>
              <textarea
                value={sermon.outline}
                onChange={(e) => updateField('outline', e.target.value)}
                rows={6}
                className={inputCls}
                placeholder="Main structure, key points, transitions, and application."
              />
            </div>

            <div>
              <label className={labelCls}>Detailed Notes</label>
              <textarea
                value={sermon.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={10}
                className={inputCls}
                placeholder="Illustrations, pastoral notes, and full sermon notes."
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Draft Library */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">DRAFT LIBRARY</p>
                <button
                  onClick={() => exportSermonDrafts(drafts, { title: 'Sermon Draft Library', subtitle: 'Prepared for print and PDF export' })}
                  className="flex items-center gap-1.5 text-[10px] text-warm-muted transition hover:text-warm-gold"
                >
                  <Download size={11} />
                  Export All
                </button>
              </div>

              <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => setSermon(draft)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      sermon.id === draft.id
                        ? 'border-warm-gold/20 bg-warm-gold/[0.04]'
                        : 'border-warm-charcoal/[0.07] bg-white hover:border-warm-charcoal/[0.12] hover:bg-warm-ivory'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-warm-espresso truncate">
                          {draft.title || 'Untitled draft'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-warm-muted truncate">
                          {draft.scripture || 'No scripture reference'}
                        </p>
                        <p className="mt-1 text-[10px] text-warm-muted">
                          {draft.planned_date || 'No date'} · {draft.updated_at ? new Date(draft.updated_at).toLocaleDateString() : 'Not saved'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.id) }}
                        className="shrink-0 rounded p-1 text-warm-muted transition hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-warm-muted border-t border-warm-charcoal/[0.07] pt-2">
                      <span>{(draft.notes || '').trim().length} note chars</span>
                      <span>{(draft.outline || '').trim().length} outline chars</span>
                    </div>
                  </button>
                ))}

                {!drafts.length && (
                  <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4 text-xs text-warm-muted">
                    {loadingDrafts ? 'Loading drafts...' : 'No drafts saved yet. Fill out the form and save your first draft.'}
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="mb-4 text-[9px] font-bold tracking-[0.22em] text-warm-gold/70">DRAFT SUMMARY</p>
              <div className="space-y-3 text-xs">
                {[
                  ['Saved Drafts', drafts.length],
                  ['Current Title', sermon.title || 'Untitled'],
                  ['Series', sermon.series || 'Standalone'],
                  ['Planned Date', sermon.planned_date || 'Not scheduled'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-warm-charcoal/[0.07] pb-3">
                    <span className="text-warm-muted">{k}</span>
                    <span className="font-semibold text-warm-espresso truncate max-w-[60%] text-right">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-4">
                <div className="flex items-start gap-3">
                  <FileText size={14} className="shrink-0 text-warm-muted mt-0.5" />
                  <p className="text-[10px] text-warm-plum leading-relaxed">
                    "Send To Upload" carries the current draft into sermon media upload when you're ready to publish.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
