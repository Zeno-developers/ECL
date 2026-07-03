// src/components/OptimizedImage.jsx
import { useState, useRef, useEffect } from 'react'

const OptimizedImage = ({ 
  src, 
  alt, 
  fallback = '/images/placeholder.jpg',
  className = '',
  width,
  height,
  priority = false,
  lazy = true,
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    if (!lazy && imgRef.current) {
      // Preload priority images
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
      
      return () => {
        document.head.removeChild(link)
      }
    }
  }, [src, lazy])

  useEffect(() => {
    if (lazy && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before element is in view
          threshold: 0.1
        }
      )

      observerRef.current.observe(imgRef.current)

      return () => {
        observerRef.current?.disconnect()
      }
    }
  }, [lazy])

  const handleLoad = () => {
    setImageLoaded(true)
    
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'image_loaded', {
        image_src: src,
        load_time: performance.now(),
        event_category: 'Performance'
      })
    }
  }

  const handleError = () => {
    setImageError(true)
    setImageLoaded(true)
    
    console.error(`Failed to load image: ${src}`)
  }

  const imageSrc = imageError ? fallback : (isInView ? src : '')

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || 'auto',
        aspectRatio: width && height ? width / height : 'auto'
      }}
    >
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse rounded">
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-300 ${
          imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        {...props}
      />
      
      {/* Accessibility enhancements */}
      {alt && (
        <span className="sr-only">{alt}</span>
      )}
    </div>
  )
}

// Progressive image loading with multiple sizes
export const ProgressiveImage = ({ 
  srcSet,
  sizes,
  src,
  alt,
  ...props 
}) => {
  const [currentSrc, setCurrentSrc] = useState(srcSet?.small || src)

  const handleLoad = () => {
    // Load larger version after small one is loaded
    if (srcSet?.large && currentSrc === srcSet.small) {
      const img = new Image()
      img.src = srcSet.large
      img.onload = () => setCurrentSrc(srcSet.large)
    }
  }

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      onLoad={handleLoad}
      {...props}
    />
  )
}

export default OptimizedImage
