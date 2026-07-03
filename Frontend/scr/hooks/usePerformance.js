// src/hooks/usePerformance.js
import { useEffect, useRef } from 'react'

export const usePerformance = (componentName) => {
  const mountTime = useRef(performance.now())
  const renderCount = useRef(0)

  useEffect(() => {
    const loadTime = performance.now() - mountTime.current
    renderCount.current += 1

    console.log(`⚡ ${componentName} mounted in ${loadTime.toFixed(2)}ms`)

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timing_complete', {
        name: `${componentName.toLowerCase()}_mount`,
        value: Math.round(loadTime),
        event_category: 'Performance'
      })
    }

    // Warn if component takes too long to mount
    if (loadTime > 1000) {
      console.warn(`⚠️ ${componentName} took ${loadTime.toFixed(2)}ms to mount - Consider optimizing`)
    }

    return () => {
      const unmountTime = performance.now() - mountTime.current
      console.log(`🔁 ${componentName} rendered ${renderCount.current} times, lasted ${unmountTime.toFixed(2)}ms`)
    }
  }, [componentName])

  return {
    markRender: () => {
      renderCount.current += 1
    },
    getRenderCount: () => renderCount.current
  }
}

// Advanced performance monitoring
export const usePerformanceMetrics = (componentName) => {
  const metrics = useRef({
    mountTime: 0,
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  })

  useEffect(() => {
    metrics.current.mountTime = performance.now()
    
    return () => {
      const lifeTime = performance.now() - metrics.current.mountTime
      const avgRenderTime = metrics.current.totalRenderTime / Math.max(metrics.current.renderCount, 1)
      
      console.group(`📊 ${componentName} Performance Report`)
      console.log(`Total lifetime: ${lifeTime.toFixed(2)}ms`)
      console.log(`Render count: ${metrics.current.renderCount}`)
      console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms`)
      console.groupEnd()

      // Send detailed metrics to analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'component_metrics', {
          component_name: componentName,
          lifetime: Math.round(lifeTime),
          render_count: metrics.current.renderCount,
          avg_render_time: Math.round(avgRenderTime),
          event_category: 'Performance'
        })
      }
    }
  }, [componentName])

  const startRender = () => {
    metrics.current.lastRenderTime = performance.now()
  }

  const endRender = () => {
    const renderTime = performance.now() - metrics.current.lastRenderTime
    metrics.current.renderCount += 1
    metrics.current.totalRenderTime += renderTime

    if (renderTime > 16) { // 60fps threshold
      console.warn(`🐢 ${componentName} render took ${renderTime.toFixed(2)}ms (target: <16ms)`)
    }

    return renderTime
  }

  return {
    startRender,
    endRender,
    getMetrics: () => metrics.current
  }
}

export default usePerformance
