import { useState, useRef, useCallback } from 'react'

export function useSwipe() {
  const [swipeDirection, setSwipeDirection] = useState(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const touchEnd = useRef({ x: 0, y: 0 })

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e) => {
    touchEnd.current = { x: 0, y: 0 }
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current.x || !touchEnd.current.x) return

    const distanceX = touchStart.current.x - touchEnd.current.x
    const distanceY = touchStart.current.y - touchEnd.current.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe) {
        setSwipeDirection('left')
      } else if (isRightSwipe) {
        setSwipeDirection('right')
      }
    } else {
      // Vertical swipe
      if (isUpSwipe) {
        setSwipeDirection('up')
      } else if (isDownSwipe) {
        setSwipeDirection('down')
      }
    }

    // Reset after a short delay
    setTimeout(() => setSwipeDirection(null), 300)
  }, [minSwipeDistance])

  return {
    swipeDirection,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}