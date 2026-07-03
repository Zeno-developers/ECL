// src/hooks/usePageTracking.js
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { API_CONFIG } from '../config/api'

export const usePageTracking = () => {
  const location = useLocation()

  useEffect(() => {
    // Track page view with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: location.pathname,
      })
    }

    // Track page view for custom analytics
    const trackPageView = async () => {
      try {
        // Send to your analytics endpoint
        await fetch(`${API_CONFIG.BASE_URL}/analytics/pageview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: location.pathname,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
          }),
        })
      } catch (error) {
        console.error('Error tracking page view:', error)
      }
    }

    trackPageView()

    // Update meta tags for social sharing
    const updateMetaTags = () => {
      const canonicalLink = document.querySelector("link[rel='canonical']")
      if (canonicalLink) {
        canonicalLink.setAttribute('href', window.location.href)
      }
    }

    updateMetaTags()
  }, [location])
}

export default usePageTracking
