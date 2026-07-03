const HTML_BLOCK_PATTERN = /<\/?(p|div|section|article|header|footer|blockquote|ul|ol|li|h[1-6]|pre|table|thead|tbody|tr|td|th|figure|figcaption|img|hr|br)\b/i

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const looksLikeHtml = (content = '') => HTML_BLOCK_PATTERN.test(String(content))

export const normalizeBlogContent = (content = '') => {
  const value = String(content ?? '').trim()

  if (!value) {
    return ''
  }

  if (looksLikeHtml(value)) {
    return value
  }

  const paragraphs = value
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return ''
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}

export const renderBlogContent = (content = '') => normalizeBlogContent(content)
