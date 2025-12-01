import { useEffect, useState } from 'react'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { useParams } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { HEIGHT, WIDTH } from '../../templates/shared'
import { Loading } from '../components/material/Loading'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'
import { BackButton } from '../components/material/BackButton'

export const Component = () => {
  const { dongleId } = useParams()
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
    <>
      <TopAppBar
        leading={<BackButton fallback={`/${dongleId}`} />}
        trailing={
          <IconButton
            title="Take a photo"
            name="camera"
            className={clsx(isLoading && 'animate-spin')}
            onClick={shot}
            disabled={isLoading}
          />
        }
        removePadding
      >
        Sentry mode
      </TopAppBar>
      {isLoading && <Loading className="" style={{ aspectRatio: WIDTH / HEIGHT }} />}
      {images?.map((img, i) => (
        <div key={img} className="relative">
          <img src={img} />
          <IconButton
            title="Download"
            className="absolute top-0 right-0 "
            name="download"
            onClick={() => {
              const link = document.createElement('a')
              link.href = img
              link.download = `snapshot${i + 1}.jpg`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
          />
        </div>
      ))}

      {!isLoading && !images && (
        <div className="flex flex-col items-center justify-center h-screen gap-6 pb-20">
          <div className="w-24 h-24 rounded-full bg-background-alt flex items-center justify-center mb-4">
            <Icon name="camera" className="text-primary text-5xl" />
          </div>
          <div className="text-center space-y-2 max-w-xs">
            <h2 className="text-2xl font-bold">Take a snapshot</h2>
            <p className="text-sm text-background-alt-x">Capture a real-time view from your device's cameras.</p>
          </div>
          <Button onClick={shot} className="px-8">
            Take Snapshot
          </Button>
        </div>
      )}
    </>
  )
}
