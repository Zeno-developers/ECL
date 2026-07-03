// src/utils/config.js
export const IS_DEVELOPMENT = import.meta.env.DEV
export const IS_PRODUCTION = import.meta.env.PROD
export const IS_TEST = import.meta.env.MODE === 'test'

// API Configuration
export const API_BASE_URL = IS_PRODUCTION 
  ? 'https://api.elchurch.site/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api')

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_PWA: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_PUSH_NOTIFICATIONS: false, // Coming soon
}

// SEO Defaults
export const SEO_DEFAULTS = {
  SITE_TITLE: 'Eternal Love Church',
  SITE_DESCRIPTION: 'Christian church in Mtubatuba, South Africa offering worship services, Bible study, and prayer meetings',
  SITE_URL: 'https://elchurch.site',
  SITE_IMAGE: 'https://elchurch.site/images/logo-social.jpg',
  TWITTER_HANDLE: '@EternalLoveChurch',
}

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  GOOGLE_ANALYTICS_ID: 'GA_MEASUREMENT_ID', // Replace with actual ID
  ENABLE_PAGE_VIEW_TRACKING: true,
  ENABLE_EVENT_TRACKING: true,
}

export default {
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  API_BASE_URL,
  FEATURE_FLAGS,
  SEO_DEFAULTS,
  ANALYTICS_CONFIG,
}
