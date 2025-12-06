import clsx from 'clsx'
import { Device, getDeviceName } from '../../types'
import { useCallback, useEffect, useState } from 'react'
import type { IconName } from '../../components/Icon'
import { getTileUrl } from '../../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { IconButton } from '../../components/IconButton'
import { useAsyncMemo } from '../../utils/hooks'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

type MarkerType = {
  id: string
  lat: number
  lng: number
  label: string
  iconName: IconName
  iconClass?: string
  href?: string
}

const SAN_DIEGO: [number, number] = [32.711483, -117.161052]

const usePosition = () => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)

  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(setPosition, (err) => {
      console.log("Error getting user's position", err)
      setPosition(null)
    })
  }, [])

  useEffect(() => {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        permission.addEventListener('change', requestPosition)

        if (permission.state === 'granted') requestPosition()
      })
      .catch(() => setPosition(null))
  }, [requestPosition])
  return { position, requestPosition }
}

const FitBounds = ({ markers }: { markers: MarkerType[] }) => {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50], animate: true })
  }, [markers, map])

  return null
}

export const Location = ({ className, devices }: { className?: string; devices?: Device[] }) => {
  const { position, requestPosition } = usePosition()
  const navigate = useNavigate()

  const deviceMarkers = useAsyncMemo(
    async () => {
      if (!devices) return []

      const markers: (MarkerType | undefined)[] = await Promise.all(
        devices.map(async (x) => {
          const res = await api.devices.location.query({ params: { dongleId: x.dongle_id } })
          if (res.status !== 200) return
          return {
            id: x.dongle_id,
            lat: res.body.lat,
            lng: res.body.lng,
            href: `/${x.dongle_id}`,
            label: getDeviceName(x),
            iconName: 'directions_car',
          }
        }),
      )
      return markers.filter((x) => x) as MarkerType[]
    },
    [devices],
    [],
  )

  const markers: MarkerType[] = [
    ...deviceMarkers,
    (position
      ? {
          id: 'you',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'You',
          iconName: 'person',
          iconClass: 'bg-tertiary text-tertiary-x',
        }
      : undefined) as MarkerType,
  ].filter(Boolean)
  return (
    <div className={clsx(className)}>
      <MapContainer
        attributionControl={false}
        zoomControl={false}
        center={SAN_DIEGO}
        zoom={10}
        className="h-full w-full !bg-background-alt"
      >
        <TileLayer url={getTileUrl()} />

        {markers.map((x) => (
          <Marker
            key={x.id}
            title={x.label}
            position={[x.lat, x.lng]}
            eventHandlers={{
              click: () => {
                if (x.href) navigate(x.href)
              },
            }}
            icon={L.divIcon({
              className: 'border-none bg-none',
              html: `<div class="flex size-[40px] items-center justify-center rounded-full shadow-xl border-2 border-white/80 ${x.iconClass || 'bg-primary text-primary-x'}"><span class="material-symbols-outlined flex icon-filled">${x.iconName}</span></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          />
        ))}
        <FitBounds markers={markers} />
      </MapContainer>
      {!position && (
        <IconButton
          name="my_location"
          title="Request location"
          className="absolute bottom-4 right-2 bg-background p-2 z-[999]"
          onClick={() => requestPosition()}
        />
      )}
      {!markers.length && (
        <div className="absolute left-1/2 top-1/2 z-[5000] flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-background-alt px-4 py-2 shadow">
          <div className="mr-2 size-4 animate-spin rounded-full border-2 border-background-alt-x border-t-transparent" />
          <span className="text-sm">Locating...</span>
        </div>
      )}
    </div>
  )
}
