import { blogAPI, eventsAPI, sermonsAPI } from './api'

// ─── Static site pages / sections ────────────────────────────────────────────
// These are hardcoded pages and ministry sections the DB knows nothing about.
const STATIC_PAGES = [
  { id: 'home',       title: 'Home',                        description: 'Welcome to Eternal Love Church — a place of worship, community and purpose.',                url: '/',          keywords: ['home', 'welcome', 'eternal love', 'elc', 'church'] },
  { id: 'about',      title: 'About Us',                    description: 'Our story, values, beliefs, and the heart behind Eternal Love Church.',                        url: '/about',     keywords: ['about', 'history', 'mission', 'vision', 'values', 'beliefs', 'faith', 'who we are'] },
  { id: 'sermons',    title: 'Sermons & Messages',           description: 'Watch and listen to powerful messages from our pastoral team.',                               url: '/sermons',   keywords: ['sermon', 'message', 'preach', 'teaching', 'word', 'video', 'audio', 'podcast', 'watch'] },
  { id: 'blog',       title: 'Blog & Stories',               description: 'Testimonies, devotionals, and church news.',                                                  url: '/blog',      keywords: ['blog', 'story', 'testimony', 'devotional', 'news', 'article', 'read'] },
  { id: 'events',     title: 'Events & Gatherings',          description: 'Upcoming services, conferences, and special events.',                                         url: '/events',    keywords: ['event', 'gathering', 'conference', 'program', 'upcoming', 'calendar', 'dates'] },
  { id: 'give',       title: 'Give / Tithe Online',          description: 'Support the ministry through tithes, offerings and donations via SnapScan or card.',          url: '/give',      keywords: ['give', 'tithe', 'offering', 'donation', 'support', 'generosity', 'sow', 'seed', 'snapscan', 'payment', 'finance'] },
  { id: 'careers',    title: 'Careers & Ministry Openings',  description: 'Explore open volunteer and ministry positions and apply online.',                              url: '/careers',   keywords: ['career', 'volunteer', 'ministry', 'serve', 'position', 'job', 'apply', 'opening', 'join the team'] },
  { id: 'connect',    title: 'Connect With Us',              description: 'Get in touch, find our location, and connect with a community group.',                        url: '/connect',   keywords: ['connect', 'contact', 'location', 'address', 'directions', 'community', 'cell', 'group', 'find', 'visit', 'map'] },
  { id: 'bible',      title: 'Bible Reader',                 description: 'Read the Berean Standard Bible — daily verse, book and chapter navigation.',                  url: '/bible',     keywords: ['bible', 'scripture', 'verse', 'book', 'chapter', 'read', 'bsb', 'berean', 'word', 'devotion', 'daily verse'] },
  { id: 'prayer',     title: 'Prayer Requests',              description: 'Submit a prayer request and let our team pray with you.',                                     url: '/prayer',    keywords: ['prayer', 'pray', 'request', 'intercession', 'healing', 'supplication', 'need'] },
  { id: 'worship',    title: 'Worship & Arts Ministry',      description: 'Vocalists, musicians, sound engineers and creatives who lead our congregation in worship.',   url: '/careers',   keywords: ['worship', 'music', 'vocalist', 'musician', 'sound', 'arts', 'creative', 'keys', 'guitar', 'band', 'singer'] },
  { id: 'children',   title: "Children's Ministry",          description: 'Safe, fun and spiritually rich environments for the next generation.',                        url: '/careers',   keywords: ['children', 'kids', 'child', 'sunday school', 'junior', 'nursery', 'young'] },
  { id: 'outreach',   title: 'Outreach & Missions',          description: 'Taking the love of Christ into communities that need it most.',                               url: '/careers',   keywords: ['outreach', 'mission', 'community', 'evangelist', 'feeding', 'street', 'poverty'] },
  { id: 'media',      title: 'Media & Technology Team',      description: 'Livestreams, photography, social media and digital communications.',                          url: '/careers',   keywords: ['media', 'technology', 'tech', 'camera', 'livestream', 'photography', 'social', 'graphic', 'design', 'digital'] },
  { id: 'hospitality',title: 'Hospitality Team',             description: 'Warm, welcoming servants who ensure every person feels valued and at home.',                  url: '/careers',   keywords: ['hospitality', 'welcome', 'usher', 'greeter', 'host', 'events'] },
  { id: 'admin-min',  title: 'Administration Ministry',      description: 'Behind-the-scenes leaders handling records, communications and planning.',                    url: '/careers',   keywords: ['admin', 'administration', 'secretary', 'finance', 'office', 'planning', 'records'] },
  { id: 'sunday',     title: 'Sunday Service',               description: 'Join us every Sunday for worship, prayer and the Word.',                                     url: '/',          keywords: ['sunday', 'service', 'worship', 'gathering', 'attend', 'join', 'time', 'schedule', 'week'] },
  { id: 'login',      title: 'Member Login',                 description: 'Sign in to access your member dashboard.',                                                    url: '/login',     keywords: ['login', 'sign in', 'member', 'portal', 'account', 'dashboard', 'password'] },
  { id: 'register',   title: 'Register / Join',              description: 'Create a member account and join the Eternal Love Church community.',                         url: '/register',  keywords: ['register', 'sign up', 'join', 'create account', 'new member', 'membership'] },
]

function searchStatic(term) {
  return STATIC_PAGES.filter(page =>
    page.title.toLowerCase().includes(term) ||
    page.description.toLowerCase().includes(term) ||
    page.keywords.some(k => k.includes(term) || term.includes(k))
  ).map(page => ({
    id: page.id,
    type: 'page',
    title: page.title,
    description: page.description,
    url: page.url,
    matchType: page.title.toLowerCase().includes(term) ? 'title' : 'content',
  }))
}

// ─── Main search ──────────────────────────────────────────────────────────────

export const searchAllContent = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return { results: [], total: 0 }

  const term = searchTerm.toLowerCase().trim()

  const [blogRes, eventsRes, sermonsRes] = await Promise.allSettled([
    blogAPI.getPosts({ limit: 50 }),
    eventsAPI.getPublicEvents(),
    sermonsAPI.getPublicSermons(),
  ])

  const results = []

  // Pages (static)
  results.push(...searchStatic(term))

  // Blog posts
  if (blogRes.status === 'fulfilled') {
    const posts = Array.isArray(blogRes.value)
      ? blogRes.value
      : Array.isArray(blogRes.value?.posts) ? blogRes.value.posts : []
    posts.forEach(post => {
      const titleMatch   = post.title?.toLowerCase().includes(term)
      const contentMatch = post.content?.toLowerCase().includes(term)
      const excerptMatch = post.excerpt?.toLowerCase().includes(term)
      const catMatch     = post.category?.toLowerCase().includes(term)
      if (titleMatch || contentMatch || excerptMatch || catMatch) {
        results.push({
          id: post._id || post.id,
          type: 'blog',
          title: post.title,
          description: post.excerpt || post.content?.substring(0, 150),
          url: `/blog/${post.slug || post._id}`,
          image: post.featuredImage,
          date: post.createdAt,
          matchType: titleMatch ? 'title' : 'content',
        })
      }
    })
  }

  // Events
  if (eventsRes.status === 'fulfilled') {
    const events = Array.isArray(eventsRes.value)
      ? eventsRes.value
      : Array.isArray(eventsRes.value?.data) ? eventsRes.value.data : []
    events.forEach(event => {
      const titleMatch = event.title?.toLowerCase().includes(term)
      const descMatch  = event.description?.toLowerCase().includes(term)
      if (titleMatch || descMatch) {
        results.push({
          id: event._id || event.id,
          type: 'event',
          title: event.title,
          description: event.description,
          url: `/events/${event._id || event.id}`,
          image: event.imageUrl,
          date: event.date || event.startDate,
          matchType: titleMatch ? 'title' : 'content',
        })
      }
    })
  }

  // Sermons
  if (sermonsRes.status === 'fulfilled') {
    const sermons = Array.isArray(sermonsRes.value)
      ? sermonsRes.value
      : Array.isArray(sermonsRes.value?.data) ? sermonsRes.value.data : []
    sermons.forEach(sermon => {
      const titleMatch   = sermon.title?.toLowerCase().includes(term)
      const speakerMatch = sermon.speaker?.toLowerCase().includes(term)
      const descMatch    = sermon.description?.toLowerCase().includes(term)
      const seriesMatch  = sermon.series?.toLowerCase().includes(term)
      if (titleMatch || speakerMatch || descMatch || seriesMatch) {
        results.push({
          id: sermon._id || sermon.id,
          type: 'sermon',
          title: sermon.title,
          description: sermon.description,
          url: `/sermons/${sermon._id || sermon.id}`,
          image: sermon.thumbnailUrl,
          date: sermon.date,
          speaker: sermon.speaker,
          matchType: titleMatch ? 'title' : 'content',
        })
      }
    })
  }

  // Sort: title matches first, then pages before DB content, then by date
  results.sort((a, b) => {
    if (a.matchType === 'title' && b.matchType !== 'title') return -1
    if (a.matchType !== 'title' && b.matchType === 'title') return 1
    if (a.type === 'page' && b.type !== 'page') return -1
    if (a.type !== 'page' && b.type === 'page') return 1
    return new Date(b.date || 0) - new Date(a.date || 0)
  })

  return { results, total: results.length }
}

export const getSearchSuggestions = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return []
  const term = searchTerm.toLowerCase().trim()
  const suggestions = new Set()

  // Suggest from static pages first
  STATIC_PAGES.forEach(page => {
    if (page.title.toLowerCase().includes(term)) suggestions.add(page.title)
    page.keywords.forEach(k => { if (k.includes(term) && k.length < 30) suggestions.add(k) })
  })

  try {
    const [blogRes, sermonsRes] = await Promise.allSettled([
      blogAPI.getPosts({ limit: 20 }),
      sermonsAPI.getPublicSermons(),
    ])
    if (blogRes.status === 'fulfilled') {
      const posts = Array.isArray(blogRes.value) ? blogRes.value : []
      posts.forEach(post => {
        if (post.title?.toLowerCase().includes(term)) suggestions.add(post.title)
        if (post.category?.toLowerCase().includes(term)) suggestions.add(post.category)
      })
    }
    if (sermonsRes.status === 'fulfilled') {
      const sermons = Array.isArray(sermonsRes.value) ? sermonsRes.value : []
      sermons.forEach(sermon => {
        if (sermon.speaker?.toLowerCase().includes(term)) suggestions.add(sermon.speaker)
        if (sermon.series?.toLowerCase().includes(term)) suggestions.add(sermon.series)
      })
    }
  } catch {}

  return Array.from(suggestions).slice(0, 6)
}
