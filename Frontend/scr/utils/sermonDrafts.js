import { downloadPdfReport } from './pdfReport'

const SERMON_DRAFTS_KEY = 'elc-sermon-drafts-v1'

const defaultDraft = {
  title: '',
  scripture: '',
  series: '',
  speaker: '',
  planned_date: '',
  outline: '',
  notes: '',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function createEmptySermonDraft(overrides = {}) {
  return {
    id: overrides.id || `draft-${Date.now()}`,
    ...defaultDraft,
    ...overrides,
  }
}

export function getSermonDrafts() {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(SERMON_DRAFTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      : []
  } catch (error) {
    console.error('Failed to read sermon drafts:', error)
    return []
  }
}

export function getSermonDraftById(id) {
  return getSermonDrafts().find((draft) => draft.id === id) || null
}

export function saveSermonDraft(draft) {
  if (!canUseStorage()) {
    return draft
  }

  const drafts = getSermonDrafts()
  const timestamp = new Date().toISOString()
  const normalized = {
    ...defaultDraft,
    ...draft,
    id: draft.id || `draft-${Date.now()}`,
    created_at: draft.created_at || timestamp,
    updated_at: timestamp,
  }

  const nextDrafts = drafts.filter((item) => item.id !== normalized.id)
  nextDrafts.unshift(normalized)
  window.localStorage.setItem(SERMON_DRAFTS_KEY, JSON.stringify(nextDrafts))

  return normalized
}

export function deleteSermonDraft(id) {
  if (!canUseStorage()) {
    return []
  }

  const nextDrafts = getSermonDrafts().filter((draft) => draft.id !== id)
  window.localStorage.setItem(SERMON_DRAFTS_KEY, JSON.stringify(nextDrafts))
  return nextDrafts
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function exportSermonDrafts(drafts = getSermonDrafts(), options = {}) {
  const normalizedDrafts = Array.isArray(drafts) ? drafts : []
  const title = options.title || 'Sermon Draft Export'
  const subtitle = options.subtitle || `${normalizedDrafts.length} draft${normalizedDrafts.length === 1 ? '' : 's'} prepared`
  const lines = [
    title,
    subtitle,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    ...(normalizedDrafts.length
      ? normalizedDrafts.flatMap((draft, index) => [
          `Draft ${index + 1}`,
          `Updated: ${draft.updated_at || draft.created_at || new Date().toISOString()}`,
          `Title: ${draft.title || 'Untitled sermon draft'}`,
          `Scripture: ${draft.scripture || 'No scripture reference recorded'}`,
          `Speaker: ${draft.speaker || 'Not assigned'}`,
          `Series: ${draft.series || 'Not assigned'}`,
          `Planned Date: ${draft.planned_date || 'Not scheduled'}`,
          `Outline: ${draft.outline || 'No outline captured'}`,
          `Notes: ${draft.notes || 'No notes captured'}`,
          '',
        ])
      : ['No sermon drafts were available to export.']),
  ]

  downloadPdfReport(
    `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
    lines
  )

  return lines.join('\n')
}

export function buildSermonDraftDescription(draft = {}) {
  const sections = [
    draft.scripture ? `Scripture: ${draft.scripture}` : '',
    draft.outline ? `Outline:\n${draft.outline}` : '',
    draft.notes ? `Notes:\n${draft.notes}` : '',
  ].filter(Boolean)

  return sections.join('\n\n')
}
