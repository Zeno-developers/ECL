// src/config/api.js
const DEFAULT_BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:5000'

const normalizeApiBaseUrl = (value) => {
  const fallback = '/api'
  const raw = (value || fallback).trim()

  if (raw.startsWith('/')) {
    return raw.replace(/\/+$/, '') || fallback
  }

  try {
    const url = new URL(raw)
    const pathname = url.pathname.replace(/\/+$/, '')

    if (!pathname || pathname === '/') {
      url.pathname = '/api'
    } else if (!pathname.endsWith('/api')) {
      url.pathname = `${pathname}/api`
    } else {
      url.pathname = pathname
    }

    return url.toString().replace(/\/$/, '')
  } catch {
    const trimmed = raw.replace(/\/+$/, '')
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }
}

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://api.elchurch.site/api'
  : '/api'

const DEFAULT_WS_URL = import.meta.env.PROD
  ? 'wss://api.elchurch.site/api'
  : DEFAULT_BACKEND_ORIGIN.replace(/^http/i, 'ws')

export const API_CONFIG = {
  BASE_URL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL),
  WS_URL: import.meta.env.VITE_WS_URL || DEFAULT_WS_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
}

export { normalizeApiBaseUrl }

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE: '/auth/profile',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout'
  },
  MEMBERS: {
    BASE: '/members',
    SEARCH: '/members/search',
    STATS: '/members/stats',
    PROFILE: '/members/profile'
  },
  EVENTS: {
    BASE: '/events',
    PUBLIC: '/events/public',
    REGISTER: '/events/:id/register',
    STATS: '/events/stats'
  },
  SERMONS: {
    BASE: '/sermons',
    PUBLIC: '/sermons/public',
    SERIES: '/sermons/series',
    STATS: '/sermons/stats'
  },
  PRAYER: {
    BASE: '/prayers',
    ALL: '/prayers/all',
    STATS: '/prayers/stats'
  },
  GIVING: {
    BASE: '/giving',
    REPORTS: '/giving/reports',
    USER_STATS: '/giving/user-stats',
    USER_HISTORY: '/giving/user-history',
    GOALS: '/giving/goals',
    FUNDS: '/giving/funds',
    DONATIONS: '/giving/donations',
    SUMMARY: '/giving/summary',
    SNAPSCAN_CREATE: '/giving/snapscan/create',
    RECEIPT: '/giving/receipt/:donationId',
    RECEIPT_RESEND: '/giving/receipt/:donationId/resend',
    OFFLINE: '/giving/offline',
    WEBHOOK: '/snapscan/webhook',
  },
  SETTINGS: {
    BASE: '/settings',
    PUBLIC: '/settings/public',
    CHURCH_INFO: '/settings/church-info'
  },
  CONTACT: {
    BASE: '/contact',
    INFO: '/contact/info'
  },
  VISITOR: {
    BASE: '/visitors',
    STATS: '/visitors/stats',
    RECENT: '/visitors/recent'
  },
  ANALYTICS: {
    WEBSITE: '/analytics/website',
    ENGAGEMENT: '/analytics/engagement',
    GROWTH: '/analytics/growth'
  },
  BIBLE: {
    BASE: '/bible',
    BOOKS: '/bible/books',
    VERSES: '/bible/verses',
    CHAPTER: '/bible/chapter',
    SEARCH: '/bible/search',
    RANDOM: '/bible/random'
  }
}

// Request cache
const requestCache = new Map()

const getCacheKey = (url, options = {}) => {
  return `${url}-${JSON.stringify(options)}`
}

const isCacheValid = (timestamp, ttl = API_CONFIG.CACHE_TTL) => {
  return Date.now() - timestamp < ttl
}

// Enhanced fetch with caching and retry logic
export const createApiRequest = async (endpoint, options = {}, useCache = false) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`
  const token = localStorage.getItem('token')
  const cacheKey = getCacheKey(url, options)

  // Check cache for GET requests
  if (useCache && options.method === 'GET' && requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey)
    if (isCacheValid(cached.timestamp)) {
      console.log(`📦 Serving from cache: ${endpoint}`)
      return cached.data
    } else {
      requestCache.delete(cacheKey)
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
    timeout: API_CONFIG.TIMEOUT
  }

  let lastError
  for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await handleResponse(response)

      // Cache successful GET responses
      if (useCache && options.method === 'GET' && response.ok) {
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        })
      }

      return data

    } catch (error) {
      lastError = error
      
      if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
        console.warn(`Request failed (attempt ${attempt}/${API_CONFIG.RETRY_ATTEMPTS}), retrying...`)
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt)
        )
      }
    }
  }

  throw await handleError(lastError)
}

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: `HTTP error! status: ${response.status}` }
    }
    
    const error = new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`)
    error.status = response.status
    error.data = errorData
    throw error
  }

  return response.json()
}

const handleError = async (error) => {
  console.error('API Error:', error)
  
  // Enhanced error reporting
  if (typeof gtag !== 'undefined') {
    gtag('event', 'api_error', {
      error_name: error.name,
      error_message: error.message,
      error_status: error.status,
      event_category: 'API'
    })
  }

  // User-friendly error messages
  if (error.name === 'AbortError') {
    throw new Error('Request timeout. Please check your internet connection and try again.')
  }
  
  if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
    throw new Error('Network error. Please check your internet connection and try again.')
  }

  throw error
}

// Cache management utilities
export const apiCache = {
  clear: (pattern = null) => {
    if (pattern) {
      for (const [key] of requestCache) {
        if (key.includes(pattern)) {
          requestCache.delete(key)
        }
      }
    } else {
      requestCache.clear()
    }
  },

  getSize: () => requestCache.size,

  getStats: () => {
    const stats = {
      total: requestCache.size,
      keys: Array.from(requestCache.keys())
    }
    return stats
  }
}

export default {
  config: API_CONFIG,
  endpoints: ENDPOINTS,
  request: createApiRequest,
  cache: apiCache
}
