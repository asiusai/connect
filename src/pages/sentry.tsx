import { useCallback, useEffect, useState } from 'react'
import { useRouteParams } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { HEIGHT, WIDTH } from '../templates/shared'
import { Loading } from '../components/Loading'
import { ButtonBase } from '../components/ButtonBase'
import { Icon } from '../components/Icon'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { IconButton } from '../components/IconButton'
import { saveFile } from '../utils/helpers'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [images, setImages] = useState<string[]>()
  const [params] = useSearchParams()
  const instant = params.get('instant')
  const [isLoading, setIsLoading] = useState(false)

  const shot = useCallback(async () => {
    setIsLoading(true)
    const res = await callAthena({ type: 'takeSnapshot', dongleId, params: undefined })
    if (res?.result) setImages([res.result.jpegFront, res.result.jpegBack].filter(Boolean).map((x) => `data:image/jpeg;base64,${x}`) as string[])
    else toast.error('Failed taking a picture')
    setIsLoading(false)
  }, [dongleId])

  useEffect(() => {
    if (instant && !images) shot()
  }, [instant, images, shot])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Sentry Mode</TopAppBar>

      <div className="flex flex-col gap-4 p-4 h-full">
        {isLoading && (
          <div className="w-full rounded-xl overflow-hidden bg-white/5 relative" style={{ aspectRatio: WIDTH / HEIGHT }}>
            <Loading className="absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon name="progress_activity" className="animate-spin text-4xl" />
            </div>
          </div>
        )}

        {images?.map((img, i) => (
          <div key={img} className="relative rounded-xl overflow-hidden border border-white/5 shadow-lg group">
            <img src={img} className="w-full" />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconButton
                className="p-2 rounded-full text-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                name="download"
                title="Download"
                onClick={() => saveFile(img, `snapshot${i + 1}.jpg`)}
              />
            </div>
          </div>
        ))}

        {!isLoading && !images && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 h-full">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
              <Icon name="camera" className="text-white/20 text-5xl" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-xl font-bold">Take a snapshot</h2>
              <p className="text-sm text-white/60">Capture a real-time view from your device's cameras.</p>
            </div>
            <ButtonBase onClick={shot} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors">
              Take Snapshot
            </ButtonBase>
          </div>
        )}
      </div>
    </div>
  )
}
