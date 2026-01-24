import { WifiOffIcon } from 'lucide-react'
import { useOffline } from '../hooks/useOffline'

export const OfflineBanner = () => {
  const isOnline = useOffline((s) => s.isOnline)

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-2 bg-background text-background-x px-4 py-2 rounded-full shadow-lg">
      <WifiOffIcon className="size-4 text-error-alt" />
      <span className="text-sm">Offline - showing cached data</span>
    </div>
  )
}
