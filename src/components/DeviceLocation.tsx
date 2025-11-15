import clsx from 'clsx'
import { Icon } from './material/Icon'
import { Button } from './material/Button'
import { Card } from '~/components/material/Card'
import type { IconName } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { getTileUrl } from '~/map'
import { getFullAddress } from '~/map/geocode'
import { useCallback, useEffect, useState } from 'react'
import { api } from '~/api'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { Device } from '~/api/types'

type Location = {
  lat: number
  lng: number
  label: string
  address: string | null
  iconName: IconName
  iconClass?: string
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
function FitBounds({ markers }: { markers: Location[] }) {
  const map = useMap()

  useEffect(() => {
    if (!markers.length) return

    if (markers.length === 1) {
      const { lat, lng } = markers[0]
      map.setView([lat, lng], 14, { animate: true })
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [50, 50], animate: true })
    }
  }, [markers, map])

  return null
}

export const DeviceLocation = ({ dongleId, device, className }: { dongleId: string; device: Device; className?: string }) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationInfo, setShowLocationInfo] = useState(false)
  const { position, requestPosition } = usePosition()
  const [markers, setMarkers] = useState<Location[]>([])

  const deviceLocation = api.devices.location.useQuery({ queryKey: ['location', dongleId], queryData: { params: { dongleId } } })
  const location = deviceLocation.data?.body

  useEffect(() => {
    const effect = async () => {
      const markers: Location[] = []
      if (location) {
        markers.push({
          address: await getFullAddress([location.lng, location.lat]),
          lat: location.lat,
          lng: location.lng,
          label: device.name,
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
  }, [position, device.name, location])

  return (
    <div className={clsx(className)}>
      <MapContainer
        attributionControl={false}
        zoomControl={false}
        center={SAN_DIEGO}
        zoom={10}
        className="h-full w-full !bg-surface-container-low"
      >
        <TileLayer url={getTileUrl()} />

        {markers.map((x) => (
          <Marker
            key={x.iconName}
            position={[x.lat, x.lng]}
            eventHandlers={{
              click: () => {
                setSelectedLocation(x)
                setShowLocationInfo(true)
              },
            }}
            icon={L.divIcon({
              className: 'border-none bg-none',
              html: `<div class="flex size-[40px] items-center justify-center rounded-full bg-primary-container ${x.iconClass}"><span class="material-symbols-outlined flex icon-outline">${x.iconName}</span></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          />
        ))}
        <FitBounds markers={markers} />
      </MapContainer>

      {/* {!position && !showLocationInfo && (
        <div className="absolute bottom-2 right-2 z-[9999] p-2 bg-surface-container-low rounded-full">
          <Icon name="my_location" size="20" className="text-on-surface-variant text-secondary" onClick={() => void requestPosition()} />
        </div>
      )} */}

      {!markers.length && (
        <div className="absolute left-1/2 top-1/2 z-[5000] flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-surface-variant px-4 py-2 shadow">
          <div className="mr-2 size-4 animate-spin rounded-full border-2 border-on-surface-variant border-t-transparent" />
          <span className="text-sm">Locating...</span>
        </div>
      )}

      <Card
        className={clsx(
          'absolute inset-2 top-auto z-[9999] flex !bg-surface-container-high p-4 pt-3 transition-opacity duration-150',
          showLocationInfo ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="mb-2 flex flex-row items-center justify-between gap-4">
          <span className="truncate text-md">{selectedLocation?.label}</span>
          <IconButton name="close" onClick={() => setShowLocationInfo(false)} />
        </div>
        <div className="flex flex-col items-end gap-3 xs:flex-row">
          <span className="text-sm text-on-surface-variant">{selectedLocation?.address}</span>
          <Button
            color="secondary"
            onClick={() => window.open(`https://www.google.com/maps?q=${selectedLocation!.lat},${selectedLocation!.lng}`, '_blank')}
            trailing={<Icon name="open_in_new" size="20" />}
          >
            Open in Maps
          </Button>
        </div>
      </Card>
    </div>
  )
}
