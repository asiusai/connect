import clsx from 'clsx'

import { type GPSPathPoint, getCoords } from '../utils/derived'
import { Coord, getPathStaticMapUrl } from '../utils/map'
import type { Route } from '../types'

import { Icon } from '../components/material/Icon'
import { ReactNode, useEffect, useState } from 'react'

const loadImage = (url: string | undefined): Promise<string | undefined> => {
  if (!url) {
    return Promise.resolve(undefined)
  }
  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.src = url
    image.onload = () => resolve(url)
    image.onerror = (error) => reject(new Error('Failed to load image', { cause: error }))
  })
}

const getStaticMapUrl = (gpsPoints: GPSPathPoint[]): string | undefined => {
  if (gpsPoints.length === 0) {
    return undefined
  }
  const path: Coord[] = []
  gpsPoints.forEach(({ lng, lat }) => {
    path.push([lng, lat])
  })
  return getPathStaticMapUrl('dark', path, 512, 512, true)
}

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
    if (route)
      getCoords(route).then((coords) => {
        setCoords(coords)
        const url = getStaticMapUrl(coords)
        loadImage(url).then((image) => {
          setImage(image)
        })
      })
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
