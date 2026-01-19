import { useDevice } from '../device/useDevice'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../components/IconButton'
import clsx from 'clsx'
import { Icon, IconName, Icons } from '../../components/Icon'
import { useSuggestions } from '../device/Location'
import { Setting, Settings } from './Settings'
import { AddToActionBar } from '../device/ActionBar'

type MapboxSuggestion = { place_name: string; center: [number, number] }

const AddressAutocomplete = ({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading, updateSuggestions } = useSuggestions()

  const handleSelect = (suggestion: MapboxSuggestion) => {
    onChange(suggestion.place_name)
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          updateSuggestions(e.target.value)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={clsx('bg-background-alt text-sm px-3 py-1.5 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 w-full', className)}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg border border-white/10 shadow-xl z-50 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 truncate">
              {s.place_name}
            </button>
          ))}
        </div>
      )}
      {isLoading && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50">...</div>}
    </div>
  )
}

export const Navigation = ({ settings }: { settings: Setting[] }) => {
  const { changes, set, setMapboxRoute, get, favorites, route } = useDevice()
  const [newFavName, setNewFavName] = useState('')
  const [newFavAddress, setNewFavAddress] = useState('')

  const updateFavorites = (updated: Record<string, string>) => set({ changes: { ...changes, MapboxFavorites: JSON.stringify(updated) } })

  const handleNavigate = async (address: string) => (address ? await setMapboxRoute(address) : undefined)

  const handleAddFavorite = () => {
    if (!newFavName.trim() || !newFavAddress.trim()) return
    updateFavorites({ ...(favorites ?? {}), [newFavName.trim()]: newFavAddress.trim() })
    setNewFavName('')
    setNewFavAddress('')
  }

  const handleDeleteFavorite = (name: string) => {
    const { [name]: _, ...rest } = favorites ?? {}
    updateFavorites(rest)
  }

  const hasToken = settings.some((s) => s.key === 'MapboxToken')
  const hasRoute = settings.some((s) => s.key === 'MapboxRoute')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 gap-4">
        {hasToken && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider opacity-60">Mapbox Token</label>
            <input
              type="text"
              value={get('MapboxToken') ?? ''}
              onChange={(e) => set({ changes: { ...changes, MapboxToken: e.target.value } })}
              placeholder="pk.eyJ1..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
            />
          </div>
        )}
        {hasRoute && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider opacity-60">Current Route</label>
            <AddressAutocomplete
              value={get('MapboxRoute') ?? ''}
              onChange={(v) => set({ changes: { ...changes, MapboxRoute: v } })}
              placeholder="Enter destination..."
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-wider opacity-60">Quick Destinations</label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(favorites ?? {}).map(([name, address]) => (
            <div key={name} className="flex items-center gap-2 outline outline-white/10 rounded-lg p-2 pr-1 relative group">
              <AddToActionBar
                action={{
                  type: 'navigation',
                  icon: Icons.includes(name as IconName) ? (name as IconName) : 'location_on',
                  location: name,
                  title: `Navigate to ${name}`,
                }}
              />
              <Icon name={Icons.includes(name as IconName) ? (name as IconName) : 'location_on'} className="text-white/60 shrink-0" />
              <AddressAutocomplete value={address} onChange={(v) => updateFavorites({ ...favorites, [name]: v })} placeholder={name} />
              <IconButton
                name="navigation"
                title="Navigate"
                onClick={() => handleNavigate(address)}
                disabled={!address || route === address}
                className="shrink-0"
              />
              {!['work', 'home'].includes(name) && (
                <IconButton name="delete" title="Remove" onClick={() => handleDeleteFavorite(name)} className="shrink-0 text-red-400" />
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 border border-dashed border-white/10 rounded-lg p-2 pr-1">
            <Icon name="add" className="text-white/40 shrink-0" />
            <input
              type="text"
              value={newFavName}
              onChange={(e) => setNewFavName(e.target.value)}
              placeholder="Name..."
              className="bg-background-alt text-sm px-3 py-1.5 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 w-20"
            />
            <AddressAutocomplete value={newFavAddress} onChange={setNewFavAddress} placeholder="Address..." />
            <IconButton name="add" title="Add" onClick={handleAddFavorite} disabled={!newFavName.trim() || !newFavAddress.trim()} className="shrink-0" />
          </div>
        </div>
      </div>

      {settings.filter((s) => s.key !== 'MapboxToken' && s.key !== 'MapboxRoute').length > 0 && (
        <Settings settings={settings.filter((s) => s.key !== 'MapboxToken' && s.key !== 'MapboxRoute')} />
      )}
    </div>
  )
}
