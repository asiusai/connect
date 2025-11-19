import clsx from 'clsx'
import { getCoords } from '../utils/derived'
import { Coord, getPathStaticMapUrl } from '../utils/map'
import type { Route } from '../types'
import { useEffect, useState } from 'react'
import { Loading } from './material/Loading'

export const RouteStaticMap = ({ route, className }: { className?: string; route?: Route }) => {
  const [image, setImage] = useState<string>()

  useEffect(() => {
    if (!route) return
    const fn = async () => {
      const coords = await getCoords(route)
      if (!coords.length) return
      const paths: Coord[] = coords.map(({ lng, lat }) => [lng, lat])
      const url = getPathStaticMapUrl('dark', paths, 512, 512, true)
      const image = await new Promise<string>((resolve, reject) => {
        const image = new Image()
        image.src = url
        image.onload = () => resolve(url)
        image.onerror = (error) => reject(new Error('Failed to load image', { cause: error }))
      })
      setImage(image)
    }
    fn()
  }, [route])

  return (
    <div className={clsx('relative isolate flex h-full flex-col justify-end self-stretch bg-surface text-on-surface', className)}>
      {image ? <img className="pointer-events-none size-full object-cover" src={image} /> : <Loading className="size-full" />}
    </div>
  )
}
