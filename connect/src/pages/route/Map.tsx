import clsx from 'clsx'
import { Route } from '../../types'
import { getCoords, GPSPathPoint } from '../../utils/derived'
import { useAsyncMemo } from '../../utils/hooks'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { getTileUrl } from '../../utils/map'
import { useEffect, useMemo, useRef, useState } from 'react'
import L, { LatLngBounds } from 'leaflet'
import { toSeconds } from '../../templates/shared'
import { DateTime } from 'luxon'
import { usePlayerStore } from '../../components/VideoPlayer'

const FitBounds = ({ coords }: { coords: GPSPathPoint[] }) => {
  const map = useMap()
  useEffect(() => {
    if (!coords.length) return
    const bounds = new LatLngBounds(coords.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [20, 20] })
  }, [coords, map])
  return null
}

const CurrentPositionMarker = ({ route, coords }: { route: Route; coords: GPSPathPoint[] }) => {
  const markerRef = useRef<L.CircleMarker>(null)
  const startTime = useMemo(() => (route.start_time ? DateTime.fromISO(route.start_time).toMillis() : 0), [route])
  const playerRef = usePlayerStore((x) => x.playerRef)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  useEffect(() => {
    if (!playerRef?.current) {
      const interval = setInterval(() => {
        if (playerRef?.current) {
          clearInterval(interval)
          setIsPlayerReady(true)
        }
      }, 100)
      return () => clearInterval(interval)
    } else {
      setIsPlayerReady(true)
    }
  }, [])

  useEffect(() => {
    const player = playerRef?.current
    if (!player || !startTime || !coords.length) return

    const updatePosition = () => {
      const frame = player.getCurrentFrame()
      const relativeVideoTime = toSeconds(frame)
      const time = relativeVideoTime

      const idx = coords.findIndex((p) => p.t >= time)

      let point = coords[coords.length - 1]
      if (idx === 0) point = coords[0]
      else if (idx > 0) {
        const p1 = coords[idx - 1]
        const p2 = coords[idx]
        point = Math.abs(p1.t - time) < Math.abs(p2.t - time) ? p1 : p2
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([point.lat, point.lng])
      }
    }

    let animationFrameId: number
    const loop = () => {
      updatePosition()
      animationFrameId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [playerRef, startTime, coords, isPlayerReady])

  if (!coords.length) return null
  const start = coords[0]

  return (
    <CircleMarker
      ref={markerRef}
      center={[start.lat, start.lng]}
      radius={6}
      pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
    />
  )
}

export const DynamicMap = ({ route, className }: { className?: string; route: Route }) => {
  const coords = useAsyncMemo(async () => await getCoords(route), [route])

  return (
    <div className={clsx('relative rounded-xl overflow-hidden shrink-0 bg-background-alt isolate h-full aspect-square md:aspect-auto', className)}>
      {!coords?.length && <div className="size-full bg-white/5 animate-pulse" />}
      {coords?.length && (
        <MapContainer center={[coords[0].lat, coords[0].lng]} zoom={13} zoomControl={false} attributionControl={false} className="size-full z-0">
          <TileLayer url={getTileUrl()} />
          <Polyline positions={coords.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }} />
          <CurrentPositionMarker route={route} coords={coords} />
          <FitBounds coords={coords} />
        </MapContainer>
      )}
    </div>
  )
}
