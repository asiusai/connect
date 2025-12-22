import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { Device, getDeviceName } from '../../types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon, IconName, Icons } from '../../components/Icon'
import { getTileUrl } from '../../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { IconButton } from '../../components/IconButton'
import { useRouteParams } from '../../utils/hooks'
import { useNavigate } from 'react-router-dom'
import { useStorage } from '../../utils/storage'
import { env } from '../../utils/env'
import { toast } from 'sonner'
import { useDeviceParams } from './useDeviceParams'
import { create } from 'zustand'
import { truncate } from '../../utils/helpers'
import { useLocation } from '../../api/queries'

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

type MapboxSuggestion = { place_name: string; center: [number, number] }

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

const fetchSuggestions = async (query: string, marker?: MarkerType): Promise<MapboxSuggestion[]> => {
  if (!query.trim()) return []
  try {
    const proximity = marker ? `${marker.lng},${marker.lat}` : ''
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${env.MAPBOX_TOKEN}&autocomplete=true&limit=5${proximity ? `&proximity=${proximity}` : ''}`
    const res = await fetch(url)
    if (res.ok) return (await res.json().then((x) => x.features)) ?? []
  } catch {}
  return []
}

export const useSuggestions = () => {
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const updateSuggestions = (query: string, marker?: MarkerType) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (!query.trim()) {
      timeoutRef.current = undefined
      setSuggestions([])
      return
    }
    setIsLoading(true)
    timeoutRef.current = setTimeout(async () => {
      setSuggestions(await fetchSuggestions(query, marker))
      setIsLoading(false)
    }, 300)
  }
  return { suggestions, isLoading, updateSuggestions }
}

type Navigation = {
  query: string
  setQuery: (x: string) => void
  isSearchOpen: boolean
  setIsSearchOpen: (x: boolean) => void
}

export const useSearch = create<Navigation>((set) => ({
  query: '',
  setQuery: (query: string) => set({ query }),
  isSearchOpen: false,
  setIsSearchOpen: (x) => set({ isSearchOpen: x }),
}))

export const Location = ({ className, device }: { className?: string; device?: Device }) => {
  const { dongleId } = useRouteParams()
  const { setMapboxRoute, getMapboxFavorites } = useDeviceParams()
  const { position, requestPosition } = usePosition()
  const navigate = useNavigate()
  const [usingCorrectFork] = useStorage('usingCorrectFork')
  const [isSendingNav, setIsSendingNav] = useState(false)
  const { isSearchOpen, setIsSearchOpen, query, setQuery } = useSearch()

  const searchInputRef = useRef<HTMLInputElement>(null)
  const [location] = useLocation(dongleId)

  const deviceMarker =
    device && location
      ? ({
          id: device.dongle_id,
          lat: location.lat,
          lng: location.lng,
          href: `/${device.dongle_id}`,
          label: getDeviceName(device),
          iconName: 'directions_car',
        } satisfies MarkerType)
      : undefined
  const userMarker = position
    ? ({
        id: 'you',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: 'You',
        iconName: 'person' as IconName,
        iconClass: 'bg-tertiary text-tertiary-x',
      } satisfies MarkerType)
    : undefined
  const { suggestions, isLoading, updateSuggestions } = useSuggestions()
  const search = (query: string) => {
    setQuery(query)
    updateSuggestions(query, deviceMarker)
  }
  const favorites = Object.entries(getMapboxFavorites() ?? {}).map(([key, address]) => ({
    name: `${key} (${truncate(address, 25)})`,
    address,
    icon: Icons.includes(key as IconName) ? (key as IconName) : 'star',
  }))
  const nav = async (address: string) => {
    if (!device || !address) return
    setIsSendingNav(true)
    const res = await setMapboxRoute(address)
    setIsSearchOpen(false)
    search('')
    if (res?.error) toast.error(res.error.data?.message ?? res.error.message)
    setIsSendingNav(false)
  }

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  const markers = [deviceMarker, userMarker].filter(Boolean) as MarkerType[]
  return (
    <div className={clsx(className)}>
      <MapContainer attributionControl={false} zoomControl={false} center={SAN_DIEGO} zoom={10} className="h-full w-full !bg-background-alt">
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

      {usingCorrectFork &&
        device &&
        isSearchOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/60"
              onClick={() => {
                setIsSearchOpen(false)
                search('')
              }}
            />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-md flex flex-col bg-background rounded-xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Icon name="search" className="text-xl opacity-50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  placeholder="Search destination..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
                />
                {isLoading && <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />}
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                {!query && favorites.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-wider opacity-40 mb-2 px-1">Favorites</p>
                    <div className="flex flex-col">
                      {favorites.map((fav) => (
                        <button
                          key={fav.name}
                          onClick={() => nav(fav.address)}
                          disabled={isSendingNav}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left disabled:opacity-50"
                        >
                          <Icon name={fav.icon} className="text-lg opacity-60" />
                          <span className="text-sm capitalize">{fav.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="flex flex-col p-2">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => nav(suggestion.place_name)}
                        disabled={isSendingNav}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg transition-colors text-left disabled:opacity-50"
                      >
                        <Icon name="location_on" className="text-lg opacity-60" />
                        <span className="text-sm leading-snug">{suggestion.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {query && !isLoading && suggestions.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 opacity-50">
                    <Icon name="search_off" className="text-xl" />
                    <span className="text-sm">No results found</span>
                  </div>
                )}

                {!query && favorites.length === 0 && (
                  <div className="flex items-center justify-center py-8 opacity-40">
                    <span className="text-sm">Type to search for a destination</span>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

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
