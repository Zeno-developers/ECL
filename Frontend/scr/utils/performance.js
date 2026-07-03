// src/utils/performance.js
// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = []
  }

  startMeasurement(name) {
    this.metrics.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    })
  }

  endMeasurement(name) {
    const metric = this.metrics.get(name)
    if (metric) {
      metric.endTime = performance.now()
      metric.duration = metric.endTime - metric.startTime
      
      this.notifyObservers(name, metric)
      
      return metric.duration
    }
    return null
  }

  addObserver(callback) {
    this.observers.push(callback)
  }

  removeObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback)
  }

  notifyObservers(name, metric) {
    this.observers.forEach(observer => {
      try {
        observer(name, metric)
      } catch (error) {
        console.error('Performance observer error:', error)
      }
    })
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).reduce((acc, [name, metric]) => {
      acc[name] = metric
      return acc
    }, {})
  }

  clear() {
    this.metrics.clear()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React performance optimization utilities
export const optimizeComponent = (Component) => {
  return React.memo(Component, (prevProps, nextProps) => {
    // Custom shallow comparison for common prop types
    const keys = Object.keys(prevProps)
    if (keys.length !== Object.keys(nextProps).length) return false

    return keys.every(key => {
      const prevVal = prevProps[key]
      const nextVal = nextProps[key]
      
      // Handle different data types
      if (prevVal === nextVal) return true
      if (typeof prevVal !== typeof nextVal) return false
      
      // Handle arrays
      if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
        if (prevVal.length !== nextVal.length) return false
        return prevVal.every((item, index) => item === nextVal[index])
      }
      
      // Handle objects
      if (typeof prevVal === 'object' && prevVal !== null) {
        return JSON.stringify(prevVal) === JSON.stringify(nextVal)
      }
      
      return false
    })
  })
}

// Debounce hook for performance
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for performance
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = React.useState(value)
  const lastRan = React.useRef(Date.now())

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

// Memory usage monitoring
export const monitorMemory = () => {
  if ('memory' in performance) {
    const memory = performance.memory
    console.log(`Memory usage: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`)
    return memory
  }
  return null
}

// Export utilities
export default {
  PerformanceMonitor,
  performanceMonitor,
  optimizeComponent,
  useDebounce,
  useThrottle,
  monitorMemory
}
