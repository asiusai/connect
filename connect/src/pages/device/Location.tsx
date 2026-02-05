import { Device, getDeviceName } from '../../../../shared/types'
import { useEffect } from 'react'
import { getTileUrl } from '../../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { usePosition, useRouteParams } from '../../hooks'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../../../shared/helpers'
import { api } from '../../api'
import { CarIcon, UserIcon, LucideIcon } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'

type MarkerType = {
  id: string
  lat: number
  lng: number
  label: string
  icon: LucideIcon
  iconClass?: string
  href?: string
}

const SAN_DIEGO: [number, number] = [32.711483, -117.161052]

const FitBounds = ({ markers }: { markers: MarkerType[] }) => {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50], animate: true })
  }, [markers, map])

  return null
}

export const Location = ({ className, device }: { className?: string; device?: Device }) => {
  const { dongleId } = useRouteParams()
  const { position } = usePosition()
  const navigate = useNavigate()

  const isOwner = useIsDeviceOwner()
  let [location] = api.device.location.useQuery({ params: { dongleId }, enabled: isOwner })
  if (!isOwner) location = { time: 0, dongle_id: dongleId, lat: SAN_DIEGO[0], lng: SAN_DIEGO[1] }

  const deviceMarker =
    device && location?.lat && location?.lng
      ? ({
          id: device.dongle_id,
          lat: location.lat,
          lng: location.lng,
          href: `/${device.dongle_id}`,
          label: getDeviceName(device),
          icon: CarIcon,
        } satisfies MarkerType)
      : undefined
  const userMarker = position
    ? ({
        id: 'you',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: 'You',
        icon: UserIcon,
        iconClass: 'bg-tertiary text-tertiary-x',
      } satisfies MarkerType)
    : undefined

  const markers = [deviceMarker, userMarker].filter(Boolean) as MarkerType[]
  return (
    <div className={cn(className)}>
      <MapContainer attributionControl={false} zoomControl={false} center={SAN_DIEGO} zoom={10} className="h-full w-full bg-background-alt!">
        <TileLayer url={getTileUrl()} />

        {markers.map((x) => {
          const IconComponent = x.icon
          return (
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
                html: `<div class="flex size-10 items-center justify-center rounded-full shadow-xl border-2 border-white/80 ${x.iconClass || 'bg-primary text-primary-x'}">${renderToStaticMarkup(<IconComponent className="text-2xl" />)}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              })}
            />
          )
        })}
        <FitBounds markers={markers} />
      </MapContainer>

      {!markers.length && (
        <div className="absolute left-1/2 top-1/2 z-5000 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-background-alt px-4 py-2 shadow">
          <div className="mr-2 size-4 animate-spin rounded-full border-2 border-background-alt-x border-t-transparent" />
          <span className="text-sm">Locating...</span>
        </div>
      )}
    </div>
  )
}
