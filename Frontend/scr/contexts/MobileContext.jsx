import { createContext, useContext, useState, useEffect } from 'react'

// Create and export the context
export const MobileContext = createContext()

export function MobileProvider({ children }) {
  const [isMobile, setIsMobile] = useState(false)
  const [touchEnabled, setTouchEnabled] = useState(false)
  const [orientation, setOrientation] = useState('portrait')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // ✅ Run ONLY ONCE (no resize listeners)
    const mobile = window.innerWidth <= 768

    setIsMobile(mobile)

    // Touch detection
    setTouchEnabled('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Orientation detection
    setOrientation(
      window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    )

    setIsReady(true)

    // ❌ NO resize / orientation listeners → prevents flicker
  }, [])

  const value = {
    isMobile,
    touchEnabled,
    orientation,
    isReady,
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280
    }
  }

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  )
}

// Hook
export function useMobile() {
  const context = useContext(MobileContext)

  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider')
  }

  return context
}