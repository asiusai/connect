import { useEffect, useState } from 'react'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { useDongleId } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { HEIGHT, WIDTH } from '../../templates/shared'
import { Loading } from '../components/material/Loading'
import { Button } from '../components/material/Button'

export const Component = () => {
  const dongleId = useDongleId()
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
        leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}`} />}
        trailing={<IconButton name="camera" className={clsx(isLoading && 'animate-spin')} onClick={shot} disabled={isLoading} />}
      >
        Sentry mode
      </TopAppBar>
      <div className="flex flex-col gap-4">
        {isLoading && <Loading className="" style={{ aspectRatio: WIDTH / HEIGHT }} />}
        {images?.map((img, i) => (
          <div key={img} className="relative">
            <img src={img} />
            <IconButton
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
        {!images && !isLoading && <Button onClick={shot}>Take a picture</Button>}
      </div>
    </>
  )
}
