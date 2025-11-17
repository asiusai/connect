import { useEffect, useState } from 'react'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { useDongleId } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'

export const Component = () => {
  const dongleId = useDongleId()
  const [images, setImages] = useState<string[]>()
  const [params] = useSearchParams()
  const instant = params.get('instant')

  const shot = async () => {
    const res = await callAthena({ type: 'takeSnapshot', dongleId, params: undefined })
    if (res) setImages([res.jpegBack, res.jpegBack].filter(Boolean) as string[])
    else toast.error('Failed taking a picture')
  }

  useEffect(() => {
    if (instant && !images) shot()
  }, [instant])

  return (
    <>
      <TopAppBar
        trailing={<IconButton name="camera" onClick={shot} />}
        leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}`} />}
      >
        Sentry mode
      </TopAppBar>
      <div>
        {images?.map((src) => (
          <img key={src} src={src} />
        ))}
      </div>
    </>
  )
}
