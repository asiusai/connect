import clsx from 'clsx'
import { Device, getDeviceName } from '../../types'
import { useEffect, useState } from 'react'
import type { IconName } from '../../components/Icon'
import { getFullAddress, getTileUrl } from '../../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { useDeviceLocation } from '../../api/queries'
import { IconButton } from '../../components/IconButton'
import { useParams } from '../../utils/hooks'

type Location = { lat: number; lng: number; label: string; address: string | null; iconName: IconName; iconClass?: string }

const SAN_DIEGO: [number, number] = [32.711483, -117.161052]

const usePosition = () => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)

  const requestPosition = () => {
    navigator.geolocation.getCurrentPosition(setPosition, (err) => {
      console.log("Error getting user's position", err)
      setPosition(null)
    })
  }

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

const FitBounds = ({ markers }: { markers: Location[] }) => {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50], animate: true })
  }, [markers, map])

  return null
}

export const Location = ({ device, className }: { device: Device; className?: string }) => {
  const { dongleId } = useParams()
  const { position, requestPosition } = usePosition()
  const [markers, setMarkers] = useState<Location[]>([])
  const [location] = useDeviceLocation(dongleId)

  useEffect(() => {
    const effect = async () => {
      const markers: Location[] = []
      if (location) {
        markers.push({
          address: await getFullAddress([location.lng, location.lat]),
          lat: location.lat,
          lng: location.lng,
          label: getDeviceName(device),
          iconName: 'directions_car',
        })
      }
      if (position) {
        markers.push({
          address: await getFullAddress([position.coords.longitude, position.coords.latitude]),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'You',
          iconName: 'person',
          iconClass: 'bg-primary',
        })
      }
      setMarkers(markers)
    }
    effect()
  }, [position, device, location])

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
            key={x.iconName}
            position={[x.lat, x.lng]}
            eventHandlers={{
              click: () => {
                window.open(`https://www.google.com/maps?q=${x!.lat},${x!.lng}`, '_blank')
              },
            }}
            icon={L.divIcon({
              className: 'border-none bg-none',
              html: `<div class="flex size-[40px] items-center justify-center rounded-full bg-primary-alt ${x.iconClass}"><span class="material-symbols-outlined flex icon-outline">${x.iconName}</span></div>`,
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
