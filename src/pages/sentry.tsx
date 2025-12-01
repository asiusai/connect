import { useEffect, useState } from 'react'
import { useParams } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { toast } from 'sonner'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { HEIGHT, WIDTH } from '../../templates/shared'
import { Loading } from '../components/material/Loading'
import { ButtonBase } from '../components/material/ButtonBase'
import { Icon } from '../components/material/Icon'
import { TopAppBar } from '../components/material/TopAppBar'
import { BackButton } from '../components/material/BackButton'

export const Component = () => {
  const { dongleId } = useParams()
  const navigate = useNavigate()
  const [images, setImages] = useState<string[]>()
  const [params] = useSearchParams()
  const instant = params.get('instant')
  const [isLoading, setIsLoading] = useState(false)

  const shot = async () => {
    setIsLoading(true)
    const res = await callAthena({ type: 'takeSnapshot', dongleId, params: undefined })
    if (res) setImages([res.jpegFront, res.jpegBack].filter(Boolean).map((x) => `data:image/jpeg;base64,${x}`) as string[])
    else toast.error('Failed taking a picture')
    setIsLoading(false)
  }

  useEffect(() => {
    if (instant && !images) shot()
  }, [instant])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton fallback={`/${dongleId}`} />}>Sentry Mode</TopAppBar>

      <div className="flex flex-col gap-4 p-4">
        {isLoading && (
          <div className="w-full rounded-xl overflow-hidden bg-white/5 relative" style={{ aspectRatio: WIDTH / HEIGHT }}>
            <Loading className="absolute inset-0" />
          </div>
        )}

        {images?.map((img, i) => (
          <div key={img} className="relative rounded-xl overflow-hidden border border-white/5 shadow-lg group">
            <img src={img} className="w-full" />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ButtonBase
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = img
                  link.download = `snapshot${i + 1}.jpg`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              >
                <Icon name="download" className="text-xl" />
              </ButtonBase>
            </div>
          </div>
        ))}

        {!isLoading && !images && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
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
