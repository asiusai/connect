import { useSettings } from '../../hooks/useSettings'
import { cn, ZustandType } from '../../../../shared/helpers'
import { LoaderIcon } from 'lucide-react'
import { useWebRTC } from '../../hooks/useWebRTC'
import { create } from 'zustand'

const init = { liveView: false }
export const useLiveView = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

export const LiveCamera = () => {
  const liveCamera = useSettings((s) => s.liveCamera)
  const { status, driverRef, roadRef } = useWebRTC()

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <video autoPlay playsInline muted ref={driverRef} className={cn('h-full w-full object-contain', liveCamera !== 'driver' && 'hidden')} />
      <video autoPlay playsInline muted ref={roadRef} className={cn('h-full w-full object-contain', liveCamera !== 'road' && 'hidden')} />
      {status && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <LoaderIcon className="w-6 h-6 animate-spin text-white/40" />
          <span className="text-sm text-white/50">{status}</span>
        </div>
      )}
    </div>
  )
}
