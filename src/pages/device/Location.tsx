import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { Device, getDeviceName } from '../../types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, IconName } from '../../components/Icon'
import { getTileUrl } from '../../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { IconButton } from '../../components/IconButton'
import { useAsyncMemo } from '../../utils/hooks'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useStorage } from '../../utils/storage'
import { callAthena } from '../../api/athena'
import { env } from '../../utils/env'
import { toast } from 'sonner'
import { useDeviceParams } from './DeviceParamsContext'

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

const encode = (v: string) => btoa(String.fromCharCode(...new TextEncoder().encode(v)))

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

export const navigateTo = async (address: string | null, dongleId: string) => {
  const result = await callAthena({
    type: 'saveParams',
    dongleId: dongleId,
    params: { params_to_update: { MapboxRoute: address ? encode(address) : '' }, compression: false },
  })
  if (result?.error) throw new Error(result.error.message)
  toast.success(address ? `Navigating to ${address}` : 'Navigation cleared')

  return result
}

export const Location = ({
  className,
  device,
  searchOpen: controlledSearchOpen,
  onSearchOpenChange,
}: {
  className?: string
  device?: Device
  searchOpen?: boolean
  onSearchOpenChange?: (open: boolean) => void
}) => {
  const { dongleId, favorites, setCurrentRoute } = useDeviceParams()
  const { position, requestPosition } = usePosition()
  const navigate = useNavigate()
  const [usingCorrectFork] = useStorage('usingCorrectFork')

  const [internalSearchOpen, setInternalSearchOpen] = useState(false)
  const isSearchOpen = controlledSearchOpen ?? internalSearchOpen
  const setIsSearchOpen = onSearchOpenChange ?? setInternalSearchOpen
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([])
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [isSendingNav, setIsSendingNav] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const deviceMarker = useAsyncMemo(
    async (): Promise<MarkerType | undefined> => {
      if (!device) return undefined
      const res = await api.devices.location.query({ params: { dongleId: device.dongle_id } })
      if (res.status !== 200) return undefined
      return {
        id: device.dongle_id,
        lat: res.body.lat,
        lng: res.body.lng,
        href: `/${device.dongle_id}`,
        label: getDeviceName(device),
        iconName: 'directions_car',
      }
    },
    [device],
    undefined,
  )

  const favoritesItems = useMemo(() => {
    const items: { name: string; address: string; icon: IconName }[] = []
    const truncate = (s: string, len: number) => (s.length > len ? s.slice(0, len) + '...' : s)
    for (const [key, address] of Object.entries(favorites)) {
      const icon: IconName = key === 'home' ? 'home' : key === 'work' ? 'work' : 'star'
      items.push({ name: `${key} (${truncate(address, 25)})`, address, icon })
    }
    return items
  }, [favorites])

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSuggestions([])
        return
      }
      setIsLoadingSearch(true)
      try {
        const proximity = deviceMarker ? `${deviceMarker.lng},${deviceMarker.lat}` : ''
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${env.MAPBOX_TOKEN}&autocomplete=true&limit=5${proximity ? `&proximity=${proximity}` : ''}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.features ?? [])
        }
      } catch {
        setSuggestions([])
      } finally {
        setIsLoadingSearch(false)
      }
    },
    [deviceMarker],
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const handleNavigate = async (address: string) => {
    if (!device || !address) return
    setIsSendingNav(true)
    setCurrentRoute(address)
    try {
      await navigateTo(address, dongleId)
      setIsSearchOpen(false)
      setSearchQuery('')
      setSuggestions([])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set destination')
    } finally {
      setIsSendingNav(false)
    }
  }

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  const markers: MarkerType[] = [
    deviceMarker,
    position
      ? {
          id: 'you',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'You',
          iconName: 'person' as IconName,
          iconClass: 'bg-tertiary text-tertiary-x',
        }
      : undefined,
  ].filter((x): x is MarkerType => Boolean(x))
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
                setSearchQuery('')
                setSuggestions([])
              }}
            />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-md flex flex-col bg-background rounded-xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Icon name="search" className="text-xl opacity-50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search destination..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
                />
                {isLoadingSearch && <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />}
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                {!searchQuery && favoritesItems.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-wider opacity-40 mb-2 px-1">Favorites</p>
                    <div className="flex flex-col">
                      {favoritesItems.map((fav) => (
                        <button
                          key={fav.name}
                          onClick={() => handleNavigate(fav.address)}
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
                        onClick={() => handleNavigate(suggestion.place_name)}
                        disabled={isSendingNav}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg transition-colors text-left disabled:opacity-50"
                      >
                        <Icon name="location_on" className="text-lg opacity-60" />
                        <span className="text-sm leading-snug">{suggestion.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && !isLoadingSearch && suggestions.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 opacity-50">
                    <Icon name="search_off" className="text-xl" />
                    <span className="text-sm">No results found</span>
                  </div>
                )}

                {!searchQuery && favoritesItems.length === 0 && (
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
