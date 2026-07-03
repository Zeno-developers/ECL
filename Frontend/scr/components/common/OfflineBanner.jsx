import { useEffect, useState } from 'react'
import { WifiOff, CloudOff, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function OfflineBanner() {
  const { offlineMode } = useAuth()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !offlineMode) return null

  const title = offlineMode ? 'Offline session active' : 'No internet connection'
  const description = offlineMode
    ? 'You are signed in from cached data. Read-only and previously cached areas can still work.'
    : 'The app is using cached pages and local data where available.'

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-amber-950 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-start gap-3 sm:items-center">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-800">
          {offlineMode ? <ShieldAlert size={16} /> : <WifiOff size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs leading-5 text-amber-900/80">{description}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm sm:flex">
          <CloudOff size={14} />
          PWA cache
        </div>
      </div>
    </div>
  )
}
