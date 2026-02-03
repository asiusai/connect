import { useCallback, useEffect, useState } from 'react'
import { useRouteParams } from '../hooks'
import { AthenaResponse } from '../../../shared/athena'
import { toast } from 'sonner'
import { HEIGHT, WIDTH } from '../templates/shared'
import { CameraIcon, CarIcon, DownloadIcon, LayoutGridIcon, LoaderIcon, UserIcon } from 'lucide-react'
import { IconButton } from '../components/IconButton'
import { cn, saveFile } from '../../../shared/helpers'
import { ControlButton } from './live'
import { useSettings } from '../hooks/useSettings'
import { TopAppBar } from '../components/TopAppBar'
import { useAthena } from '../hooks/useAthena'

const toB64 = (x?: string | null) => (x ? `data:image/jpeg;base64,${x}` : undefined)

const SnapshotView = () => {
  const { cameraView, set } = useSettings()
  const { dongleId } = useRouteParams()
  const [images, setImages] = useState<AthenaResponse<'takeSnapshot'>['result']>()
  const [isLoading, setIsLoading] = useState(false)
  const athena = useAthena()
  const shot = useCallback(async () => {
    setIsLoading(true)
    setImages(undefined)
    const res = await athena('takeSnapshot', undefined)
    if (res?.result) setImages(res.result)
    else toast.error('Failed taking a picture')
    setIsLoading(false)
  }, [dongleId])

  useEffect(() => {
    if (!images && !isLoading) shot()
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className={cn('flex-1 flex flex-col gap-4 p-4 relative overflow-hidden items-start justify-start md:flex-row w-full h-full')}>
        {[
          { src: toB64(images?.jpegFront), hidden: cameraView === 'road' },
          { src: toB64(images?.jpegBack), hidden: cameraView === 'driver' },
        ].map(({ src, hidden }, i) => (
          <div
            key={i}
            className={cn('relative rounded-xl overflow-hidden border border-white/5 group w-full', hidden && 'hidden')}
            style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
          >
            {!isLoading ? (
              <>
                {src ? (
                  <img src={src} className="object-contain h-full w-full" />
                ) : (
                  <div className="flex items-center justify-center h-full text-red-500">Failed taking an image</div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {src && (
                    <IconButton
                      className="p-2 rounded-full text-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                      icon={DownloadIcon}
                      title="Download"
                      onClick={() => saveFile(src, `snapshot${i + 1}.jpg`)}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center bg-background-alt/80 backdrop-blur-sm h-full w-fulll">
                <div className="flex items-center gap-3">
                  <LoaderIcon className="animate-spin text-2xl text-white/40" />
                  <span className="text-sm text-white/60">Taking snapshot...</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-background-alt border-t border-white/5 p-3 flex items-center justify-center gap-2">
        <ControlButton
          onClick={() => set({ cameraView: cameraView === 'both' ? 'driver' : cameraView === 'driver' ? 'road' : 'both' })}
          icon={cameraView === 'both' ? LayoutGridIcon : cameraView === 'driver' ? UserIcon : CarIcon}
          label={cameraView === 'both' ? 'Both' : cameraView === 'driver' ? 'Driver' : 'Road'}
        />
        <ControlButton onClick={shot} disabled={isLoading} icon={CameraIcon} label="Retake" spin={isLoading} />
      </div>
    </div>
  )
}

export const Component = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopAppBar>Snapshot</TopAppBar>

      <SnapshotView />
    </div>
  )
}
