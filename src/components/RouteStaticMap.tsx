import clsx from 'clsx'
import { type GPSPathPoint, getCoords } from '../utils/derived'
import { Coord, getPathStaticMapUrl } from '../utils/map'
import type { Route } from '../types'
import { Icon } from '../components/material/Icon'
import { ReactNode, useEffect, useState } from 'react'

const State = (props: { children: ReactNode; trailing?: ReactNode; opaque?: boolean }) => {
  return (
    <div className={clsx('absolute flex size-full items-center justify-center gap-2', props.opaque && 'bg-surface text-on-surface')}>
      <span className="text-xs">{props.children}</span>
      {props.trailing}
    </div>
  )
}

export const RouteStaticMap = ({ route, className }: { className?: string; route?: Route }) => {
  const [coords, setCoords] = useState<GPSPathPoint[]>()
  const [image, setImage] = useState<string>()

  useEffect(() => {
    if (!route) return
    const fn = async () => {
      const coords = await getCoords(route)
      if (!coords.length) return
      setCoords(coords)
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
      {!coords || !image ? (
        <State trailing={<Icon name="error" filled />}>Problem loading map</State>
      ) : coords?.length === 0 ? (
        <State trailing={<Icon name="satellite_alt" filled />}>No GPS data</State>
      ) : image ? (
        <img className="pointer-events-none size-full object-cover" src={image} alt="" />
      ) : null}
    </div>
  )
}
