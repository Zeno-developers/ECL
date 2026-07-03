// hooks/useSwipe.js
import { useState, useRef, useCallback } from 'react'

export function useSwipe(options = {}) {
  const {
    minSwipeDistance = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enableVertical = true,
    enableHorizontal = true
  } = options;

  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeDistance, setSwipeDistance] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0, time: 0 });

  const onTouchStart = useCallback((e) => {
    touchEnd.current = { x: 0, y: 0, time: 0 };
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };
  }, []);

  const onTouchMove = useCallback((e) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };

    // Calculate current swipe distance for real-time feedback
    const currentX = touchStart.current.x - touchEnd.current.x;
    const currentY = touchStart.current.y - touchEnd.current.y;
    setSwipeDistance({ x: currentX, y: currentY });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current.x || !touchEnd.current.x) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const timeDiff = touchEnd.current.time - touchStart.current.time;
    const velocity = Math.sqrt(distanceX * distanceX + distanceY * distanceY) / timeDiff;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    let direction = null;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (enableHorizontal) {
        if (isLeftSwipe) {
          direction = 'left';
          onSwipeLeft?.({ distance: distanceX, velocity });
        } else if (isRightSwipe) {
          direction = 'right';
          onSwipeRight?.({ distance: Math.abs(distanceX), velocity });
        }
      }
    } else {
      // Vertical swipe
      if (enableVertical) {
        if (isUpSwipe) {
          direction = 'up';
          onSwipeUp?.({ distance: distanceY, velocity });
        } else if (isDownSwipe) {
          direction = 'down';
          onSwipeDown?.({ distance: Math.abs(distanceY), velocity });
        }
      }
    }

    setSwipeDirection(direction);
    setSwipeDistance({ x: 0, y: 0 });

    // Reset after a short delay
    setTimeout(() => setSwipeDirection(null), 300);
  }, [minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, enableVertical, enableHorizontal]);

  return {
    swipeDirection,
    swipeDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwiping: swipeDirection !== null
  };
}