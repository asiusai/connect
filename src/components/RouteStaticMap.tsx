import clsx from 'clsx'

import { type GPSPathPoint, getCoords } from '~/api/derived'
import { type Coords, getPathStaticMapUrl } from '~/map'
import { getThemeId } from '~/theme'
import type { Route } from '~/api/types'

import { Icon } from '~/components/material/Icon'
import { ReactNode } from 'react'
import { createResource } from '~/fix'

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
  const path: Coords = []
  gpsPoints.forEach(({ lng, lat }) => {
    path.push([lng, lat])
  })
  const themeId = getThemeId()
  return getPathStaticMapUrl(themeId, path, 512, 512, true)
}

const State = (props: { children: ReactNode; trailing?: ReactNode; opaque?: boolean }) => {
  return (
    <div className={clsx('absolute flex size-full items-center justify-center gap-2', props.opaque && 'bg-surface text-on-surface')}>
      <span className="text-xs">{props.children}</span>
      {props.trailing}
    </div>
  )
}

type RouteStaticMapProps = {
  className?: string
  route: Route | undefined
}

export const RouteStaticMap = (props: RouteStaticMapProps) => {
  const [coords] = createResource(props.route, getCoords)
  const [url] = createResource(coords.data, getStaticMapUrl)
  const [loadedUrl] = createResource(url.data, loadImage)

  return (
    <div className={clsx('relative isolate flex h-full flex-col justify-end self-stretch bg-surface text-on-surface', props.className)}>
      {!!coords.error || !!url.error || !!loadedUrl.error ? (
        <State trailing={<Icon name="error" filled />}>Problem loading map</State>
      ) : coords.data?.length === 0 ? (
        <State trailing={<Icon name="satellite_alt" filled />}>No GPS data</State>
      ) : url.data && loadedUrl.data ? (
        <img className="pointer-events-none size-full object-cover" src={loadedUrl.data} alt="" />
      ) : (
        <></>
      )}
    </div>
  )
}
