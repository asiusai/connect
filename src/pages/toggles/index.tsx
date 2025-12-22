import { BackButton } from '../../components/BackButton'
import { TopAppBar } from '../../components/TopAppBar'
import { useStorage } from '../../utils/storage'
import { useDeviceParams } from '../device/useDeviceParams'
import { SettingCategory, DeviceParam, DEVICE_PARAMS, DeviceParamKey, DeviceParamType } from './settings'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'
import { useEffect, useMemo, useRef, useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Icon, IconName, Icons } from '../../components/Icon'
import { useRouteParams } from '../../utils/hooks'
import { parse } from '../../utils/helpers'
import { useSuggestions } from '../device/Location'

type Setting = DeviceParam & { key: string; value: string | null | undefined; type: number | undefined }

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  models: 'Models',
  navigation: 'Navigation',
  device: 'Device',
  toggles: 'Toggles',
  steering: 'Steering',
  cruise: 'Cruise',
  visuals: 'Visuals',
  developer: 'Developer',
  other: 'Other',
}

const SectionHeader = ({ label, isOpen, onClick, count }: { label: string; isOpen: boolean; onClick: () => void; count?: number }) => (
  <button onClick={onClick} className="flex items-center gap-3 w-full py-3">
    <Icon name="keyboard_arrow_down" className={clsx('transition-transform', isOpen ? 'text-primary' : '-rotate-90 opacity-40')} />
    <h2 className="text-lg font-semibold">{label}</h2>
    {count !== undefined && <span className="text-sm opacity-40">{count}</span>}
  </button>
)

type ModelBundle = { index: number; display_name: string; environment: string; runner?: string; generation: number }

const parsePythonDict = <T,>(v: string | null | undefined): T | undefined => {
  if (!v) return undefined
  const json = v
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
  return parse(json)
}

const ModelsSection = () => {
  const { dongleId, save, get, isSaving } = useDeviceParams()
  const [selectedIndex, setSelectedIndex] = useState('')

  const modelsCache = parsePythonDict<{ bundles: ModelBundle[] }>(get('ModelManager_ModelsCache'))
  const activeBundle = parsePythonDict<{ index: number }>(get('ModelManager_ActiveBundle'))

  const models = modelsCache?.bundles.toReversed() ?? []
  const isUsingDefault = activeBundle === null
  const activeIndex = activeBundle?.index?.toString() ?? 'default'
  const selected = selectedIndex || activeIndex
  const selectedModel = selected === 'default' ? null : models.find((m) => m.index.toString() === selected)
  const isAlreadyActive = selected === activeIndex

  const handleSend = async () => {
    if (isAlreadyActive || !dongleId) return
    const res = await save(selected === 'default' ? { ModelManager_ActiveBundle: null } : { ModelManager_DownloadIndex: selectedModel!.index.toString() })
    if (res?.error) toast.error(res.error.data?.message ?? res.error.message)
  }

  if (!models.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <span className="text-lg font-medium">No models available</span>
        <span className="text-sm opacity-60">Model cache not found on device</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider opacity-60">Available Models</label>
          <Select
            value={selected}
            onChange={setSelectedIndex}
            options={[{ value: 'default', label: 'Default model' }, ...models.map((m) => ({ value: m.index.toString(), label: m.display_name }))]}
            className="w-full"
          />
        </div>
        <Button onClick={handleSend} disabled={isSaving || isAlreadyActive} className="w-full">
          {isSaving ? 'Sending...' : isAlreadyActive ? 'Already active' : 'Send to device'}
        </Button>
      </div>

      <div className="flex-1 outline outline-white/10 rounded-lg p-5 bg-white/5">
        <p className="text-xs uppercase tracking-wider opacity-60 mb-2">Selected Model</p>
        {selected === 'default' ? (
          <>
            <h2 className="text-xl font-semibold">Default model</h2>
            <p className="text-sm opacity-60 mt-1">Uses the model bundled with openpilot</p>
            {isUsingDefault && <div className="mt-4 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 inline-block">Active</div>}
          </>
        ) : selectedModel ? (
          <>
            <h2 className="text-xl font-semibold">{selectedModel.display_name}</h2>
            <p className="text-sm opacity-60 mt-1">{selectedModel.environment}</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {selectedModel.runner && (
                <div className="flex justify-between">
                  <span className="opacity-60">Runner:</span>
                  <span>{selectedModel.runner}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-60">Generation:</span>
                <span>{selectedModel.generation}</span>
              </div>
            </div>
            {activeBundle && activeBundle.index === selectedModel.index && (
              <div className="mt-4 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 inline-block">Active</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

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

const NavigationSection = ({ settings }: { settings: Setting[] }) => {
  const { changes, setChanges, setMapboxRoute, get, favorites, route } = useDeviceParams()
  const [newFavName, setNewFavName] = useState('')
  const [newFavAddress, setNewFavAddress] = useState('')

  const updateFavorites = (updated: Record<string, string>) => setChanges({ ...changes, MapboxFavorites: JSON.stringify(updated) })

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
              onChange={(e) => setChanges({ ...changes, MapboxToken: e.target.value })}
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
              onChange={(v) => setChanges({ ...changes, MapboxRoute: v })}
              placeholder="Enter destination..."
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-wider opacity-60">Quick Destinations</label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(favorites ?? {}).map(([name, address]) => (
            <div key={name} className="flex items-center gap-2 outline outline-white/10 rounded-lg p-2 pr-1">
              <Icon name={Icons.includes(name as IconName) ? (name as IconName) : 'star'} className="text-white/60 shrink-0" />
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
        <SettingsGrid settings={settings.filter((s) => s.key !== 'MapboxToken' && s.key !== 'MapboxRoute')} />
      )}
    </div>
  )
}

const SettingInput = ({ setting, value, onChange }: { setting: Setting; value: string | null; onChange: (v: string) => void }) => {
  const type = setting.type

  if (type === DeviceParamType.Select && setting.options) {
    return <Select value={value ?? ''} onChange={onChange} options={setting.options.map((o) => ({ value: o.value.toString(), label: o.label }))} />
  }
  if (type === DeviceParamType.Number) {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        min={setting.min}
        max={setting.max}
        step={setting.step ?? 1}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
      />
    )
  }
  if (type === DeviceParamType.Boolean) {
    const bool = value === '1'
    return (
      <div className="flex items-center gap-2">
        <Toggle value={bool} onChange={(v) => onChange(v ? '1' : '0')} />
        <span className="text-sm">{bool ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  if (type === DeviceParamType.String)
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
      />
    )
  return <div>Invalid type: {type}</div>
}

const SettingsGrid = ({ settings }: { settings: Setting[] }) => {
  const { changes, setChanges, get } = useDeviceParams()
  const editable = settings.filter((x) => !x.readonly)
  const readonly = settings.filter((x) => x.readonly)

  if (!editable.length && !readonly.length) return null

  return (
    <div className="flex flex-col gap-4">
      {editable.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {editable.map((x) => {
            const changed = x.key in changes
            return (
              <div
                key={x.key}
                className={clsx('flex flex-col outline outline-white/5 rounded-lg p-4 gap-3', changed && 'outline-primary outline-2 bg-primary/5')}
              >
                <div className="flex flex-col gap-1" title={x.key}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{x.label}</span>
                    {x.advanced && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Advanced</span>}
                    {changed && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-x">Modified</span>}
                  </div>
                  {x.description && <span className="text-xs opacity-60">{x.description}</span>}
                </div>
                <SettingInput setting={x} value={get(x.key as DeviceParamKey) ?? null} onChange={(v) => setChanges({ ...changes, [x.key]: v })} />
              </div>
            )
          })}
        </div>
      )}

      {readonly.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {readonly.map((x) => (
            <div key={x.key} className="flex flex-col outline outline-white/5 rounded-lg p-4 gap-2 opacity-60">
              <div className="flex items-center gap-2">
                <span className="font-medium">{x.label}</span>
                {x.advanced && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Advanced</span>}
              </div>
              {x.description && <span className="text-xs opacity-70">{x.description}</span>}
              <span className="text-sm bg-white/5 p-2 rounded-md font-mono break-all">{x.value ?? 'null'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const { isError, load, save, isSaving, get, types, setChanges, changes } = useDeviceParams()
  const [usingCorrectFork] = useStorage('usingCorrectFork')
  const [openSection, setOpenSection] = useStorage('togglesOpenTab')

  useEffect(() => {
    if (usingCorrectFork && dongleId) load(dongleId)
  }, [dongleId, usingCorrectFork, load])

  const settingsByCategory = useMemo(() => {
    if (!Object.keys(types).length) return null
    const result: Record<SettingCategory, Setting[]> = {
      models: [],
      navigation: [],
      device: [],
      toggles: [],
      steering: [],
      cruise: [],
      visuals: [],
      developer: [],
      other: [],
    }

    const deviceParamEntries = Object.entries(DEVICE_PARAMS) as [DeviceParamKey, DeviceParam][]

    for (const cat of SettingCategory.options) {
      result[cat] = deviceParamEntries
        .filter(([_, def]) => !def.hidden && def.category === cat)
        .map(
          ([key, def]) =>
            ({
              ...def,
              key,
              value: get(key),
              type: types[key],
            }) satisfies Setting,
        )
        .filter((x) => x.value !== undefined)
    }

    const knownKeys = new Set(Object.keys(DEVICE_PARAMS))
    const leftOver = Object.keys(types).filter((x) => !knownKeys.has(x))
    result.other = [
      ...result.other,
      ...leftOver.map(
        (key): Setting => ({ key, label: key, description: '', category: 'other', value: get(key as DeviceParamKey), type: types[key as DeviceParamKey] }),
      ),
    ]
    return result
  }, [types, get])

  const changeCount = Object.keys(changes).length

  const handleSave = async () => {
    if (!changeCount) return
    const result = await save(changes)
    if (result?.error) toast.error(result.error.data?.message ?? result.error.message)
    else toast.success(`Saved ${changeCount} parameter(s)`)
  }

  const toggleSection = (cat: SettingCategory) => setOpenSection(openSection === cat ? null : cat)

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />} className="z-10 bg-transparent">
        <div className="flex items-center gap-3 w-full">
          <span>Toggles</span>
          {changeCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setChanges({})} className="text-xs opacity-50 hover:opacity-100" title="Discard changes">
                {changeCount} unsaved
              </button>
              <Button onClick={handleSave} disabled={isSaving} className="text-sm px-3 py-1.5">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </TopAppBar>

      <div className="p-4 md:p-6 flex flex-col gap-2">
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <span className="text-4xl opacity-40">:(</span>
            <span className="text-lg font-medium">Unable to load parameters</span>
            <span className="text-sm opacity-60">Device offline or incompatible fork</span>
          </div>
        )}
        {!settingsByCategory && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-sm opacity-60">Connecting to device...</span>
          </div>
        )}
        {settingsByCategory && (
          <div className="flex flex-col divide-y divide-white/5">
            <div>
              <SectionHeader label={CATEGORY_LABELS.models} isOpen={openSection === 'models'} onClick={() => toggleSection('models')} />
              {openSection === 'models' && (
                <div className="pb-6">
                  <ModelsSection />
                </div>
              )}
            </div>

            <div>
              <SectionHeader label={CATEGORY_LABELS.navigation} isOpen={openSection === 'navigation'} onClick={() => toggleSection('navigation')} />
              {openSection === 'navigation' && (
                <div className="pb-6">
                  <NavigationSection settings={settingsByCategory.navigation} />
                </div>
              )}
            </div>

            {SettingCategory.options
              .filter((cat) => cat !== 'models' && cat !== 'navigation')
              .map((cat) => {
                const settings = settingsByCategory[cat]
                if (!settings.length) return null
                const isOpen = openSection === cat
                return (
                  <div key={cat}>
                    <SectionHeader label={CATEGORY_LABELS[cat]} isOpen={isOpen} onClick={() => toggleSection(cat)} count={settings.length} />
                    {isOpen && (
                      <div className="pb-6">
                        <SettingsGrid settings={settings} />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
