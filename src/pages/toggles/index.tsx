import { callAthena, ParamValue } from '../../api/athena'
import { BackButton } from '../../components/BackButton'
import { TopAppBar } from '../../components/TopAppBar'
import { useAsyncMemo, useRouteParams } from '../../utils/hooks'
import { SettingCategory, SettingDefinition, SETTINGS } from './settings'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Icon } from '../../components/Icon'

type Setting = SettingDefinition & { value?: ParamValue }

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

const decode = (v: string | null | undefined) => {
  if (!v) return null
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0)))
  } catch {
    return atob(v)
  }
}

const encode = (v: string) => btoa(String.fromCharCode(...new TextEncoder().encode(v)))

const parsePythonDict = <T,>(v: string | null | undefined): T | null => {
  if (!v) return null
  try {
    const json = atob(v)
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
    return JSON.parse(json)
  } catch {
    return null
  }
}

const ModelsSection = ({ params, dongleId }: { params: ParamValue[]; dongleId: string }) => {
  const [selectedIndex, setSelectedIndex] = useState('')
  const [sending, setSending] = useState(false)

  const modelsCache = parsePythonDict<{ bundles: ModelBundle[] }>(params.find((p) => p.key === 'ModelManager_ModelsCache')?.value)
  const activeBundle = parsePythonDict<{ index: number }>(params.find((p) => p.key === 'ModelManager_ActiveBundle')?.value)

  const models = [...(modelsCache?.bundles ?? [])].reverse()
  const isUsingDefault = activeBundle === null
  const activeIndex = activeBundle?.index?.toString() ?? 'default'
  const selected = selectedIndex || activeIndex
  const selectedModel = selected === 'default' ? null : models.find((m) => m.index.toString() === selected)
  const isAlreadyActive = selected === activeIndex

  const handleSend = async () => {
    if (isAlreadyActive) return
    setSending(true)
    try {
      const result = await callAthena({
        type: 'saveParams',
        dongleId,
        params: {
          params_to_update:
            selected === 'default' ? { ModelManager_ActiveBundle: null } : { ModelManager_DownloadIndex: btoa(selectedModel!.index.toString()) },
          compression: false,
        },
      })
      if (result?.error) throw new Error(result.error.message)
      const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) throw new Error(errors.map(([k, v]) => `${k}: ${v}`).join('\n'))
      toast.success(selected === 'default' ? 'Resetting to default model' : `Sending ${selectedModel!.display_name} to device`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send model')
    } finally {
      setSending(false)
    }
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
        <Button onClick={handleSend} disabled={sending || isAlreadyActive} className="w-full">
          {sending ? 'Sending...' : isAlreadyActive ? 'Already active' : 'Send to device'}
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

type MapboxFavoritesData = { home?: string; work?: string; favorites?: Record<string, string> }

const NavigationSection = ({
  params,
  dongleId,
  settings,
  changes,
  savedValues,
  getValue,
  setChanges,
}: {
  params: ParamValue[]
  dongleId: string
  settings: Setting[]
  changes: Record<string, string>
  savedValues: Record<string, string>
  getValue: (s: Setting) => string | null
  setChanges: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) => {
  const [navigating, setNavigating] = useState<string | null>(null)
  const [newFavName, setNewFavName] = useState('')
  const [newFavAddress, setNewFavAddress] = useState('')

  const favoritesParam = params.find((p) => p.key === 'MapboxFavorites')
  const favoritesRaw = savedValues.MapboxFavorites ?? decode(favoritesParam?.value)
  const favorites: MapboxFavoritesData = useMemo(() => {
    if (!favoritesRaw) return {}
    try {
      return JSON.parse(favoritesRaw)
    } catch {
      return {}
    }
  }, [favoritesRaw])

  const localFavorites: MapboxFavoritesData = useMemo(() => {
    if (!('MapboxFavorites' in changes)) return favorites
    try {
      return JSON.parse(changes.MapboxFavorites)
    } catch {
      return favorites
    }
  }, [changes, favorites])

  const updateFavorites = (updated: MapboxFavoritesData) => {
    setChanges((p) => ({ ...p, MapboxFavorites: JSON.stringify(updated) }))
  }

  const handleNavigate = async (address: string) => {
    if (!address) return
    setNavigating(address)
    try {
      const result = await callAthena({
        type: 'saveParams',
        dongleId,
        params: { params_to_update: { MapboxRoute: encode(address) }, compression: false },
      })
      if (result?.error) throw new Error(result.error.message)
      toast.success(`Navigating to ${address}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set route')
    } finally {
      setNavigating(null)
    }
  }

  const handleAddFavorite = () => {
    if (!newFavName.trim() || !newFavAddress.trim()) return
    const updated = { ...localFavorites, favorites: { ...localFavorites.favorites, [newFavName.trim()]: newFavAddress.trim() } }
    updateFavorites(updated)
    setNewFavName('')
    setNewFavAddress('')
  }

  const handleDeleteFavorite = (name: string) => {
    const { [name]: _, ...rest } = localFavorites.favorites ?? {}
    updateFavorites({ ...localFavorites, favorites: rest })
  }

  const tokenSetting = settings.find((s) => s.key === 'MapboxToken')
  const routeSetting = settings.find((s) => s.key === 'MapboxRoute')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 gap-4">
        {tokenSetting && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider opacity-60">Mapbox Token</label>
            <input
              type="text"
              value={getValue(tokenSetting) ?? ''}
              onChange={(e) => setChanges((p) => ({ ...p, MapboxToken: e.target.value }))}
              placeholder="pk.eyJ1..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
            />
          </div>
        )}
        {routeSetting && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider opacity-60">Current Route</label>
            <input
              type="text"
              value={getValue(routeSetting) ?? ''}
              onChange={(e) => setChanges((p) => ({ ...p, MapboxRoute: e.target.value }))}
              placeholder="Enter destination..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-wider opacity-60">Quick Destinations</label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex flex-col outline outline-white/10 rounded-lg p-4 gap-3">
            <span className="font-medium">Home</span>
            <input
              type="text"
              value={localFavorites.home ?? ''}
              onChange={(e) => updateFavorites({ ...localFavorites, home: e.target.value })}
              placeholder="Home address..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
            />
            <Button
              onClick={() => handleNavigate(localFavorites.home ?? '')}
              disabled={!localFavorites.home || navigating === localFavorites.home}
              className="w-full text-sm"
            >
              {navigating === localFavorites.home ? 'Setting...' : 'Navigate'}
            </Button>
          </div>

          <div className="flex flex-col outline outline-white/10 rounded-lg p-4 gap-3">
            <span className="font-medium">Work</span>
            <input
              type="text"
              value={localFavorites.work ?? ''}
              onChange={(e) => updateFavorites({ ...localFavorites, work: e.target.value })}
              placeholder="Work address..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
            />
            <Button
              onClick={() => handleNavigate(localFavorites.work ?? '')}
              disabled={!localFavorites.work || navigating === localFavorites.work}
              className="w-full text-sm"
            >
              {navigating === localFavorites.work ? 'Setting...' : 'Navigate'}
            </Button>
          </div>

          {Object.entries(localFavorites.favorites ?? {}).map(([name, address]) => (
            <div key={name} className="flex flex-col outline outline-white/10 rounded-lg p-4 gap-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{name}</span>
                <button onClick={() => handleDeleteFavorite(name)} className="text-red-400 hover:text-red-300 text-sm">
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => updateFavorites({ ...localFavorites, favorites: { ...localFavorites.favorites, [name]: e.target.value } })}
                className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
              />
              <Button onClick={() => handleNavigate(address)} disabled={!address || navigating === address} className="w-full text-sm">
                {navigating === address ? 'Setting...' : 'Navigate'}
              </Button>
            </div>
          ))}

          <div className="flex flex-col border border-dashed border-white/10 rounded-lg p-4 gap-3">
            <span className="font-medium opacity-60">Add Favorite</span>
            <input
              type="text"
              value={newFavName}
              onChange={(e) => setNewFavName(e.target.value)}
              placeholder="Name..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
            />
            <input
              type="text"
              value={newFavAddress}
              onChange={(e) => setNewFavAddress(e.target.value)}
              placeholder="Address..."
              className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
            />
            <Button onClick={handleAddFavorite} disabled={!newFavName.trim() || !newFavAddress.trim()} className="w-full text-sm">
              Add
            </Button>
          </div>
        </div>
      </div>

      {settings.filter((s) => s.key !== 'MapboxToken' && s.key !== 'MapboxRoute').length > 0 && (
        <SettingsGrid
          settings={settings.filter((s) => s.key !== 'MapboxToken' && s.key !== 'MapboxRoute')}
          changes={changes}
          getValue={getValue}
          setChanges={setChanges}
        />
      )}
    </div>
  )
}

const SettingInput = ({ setting, value, onChange }: { setting: Setting; value: string | null; onChange: (v: string) => void }) => {
  const type = setting.value?.type

  if (type === 2 && setting.options) {
    return <Select value={value ?? ''} onChange={onChange} options={setting.options.map((o) => ({ value: o.value.toString(), label: o.label }))} />
  }
  if (type === 3) {
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
  if (type === 1) {
    const bool = value === '1'
    return (
      <div className="flex items-center gap-2">
        <Toggle value={bool} onChange={(v) => onChange(v ? '1' : '0')} />
        <span className="text-sm">{bool ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
    />
  )
}

const SettingsGrid = ({
  settings,
  changes,
  getValue,
  setChanges,
}: {
  settings: Setting[]
  changes: Record<string, string>
  getValue: (s: Setting) => string | null
  setChanges: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) => {
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
                <SettingInput setting={x} value={getValue(x)} onChange={(v) => setChanges((p) => ({ ...p, [x.key]: v }))} />
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
              <span className="text-sm bg-white/5 p-2 rounded-md font-mono break-all">{decode(x.value?.value) ?? 'null'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedValues, setSavedValues] = useState<Record<string, string>>({})
  const [openSection, setOpenSection] = useState<SettingCategory | null>('models')

  const res = useAsyncMemo(() => callAthena({ type: 'getAllParams', dongleId, params: {} }), [dongleId])

  const settingsByCategory = useMemo(() => {
    if (!res?.result) return null
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

    for (const cat of SettingCategory.options) {
      const defined: Setting[] = SETTINGS.filter((x) => !x.hidden && x.category === cat)
        .map((s) => ({
          ...s,
          value: res.result?.find((x) => x.key === s.key),
        }))
        .filter((x) => x.value)
      result[cat] = defined
    }

    const leftOver = res.result?.filter((x) => !SETTINGS.some((s) => s.key === x.key)) ?? []
    result.other = [...result.other, ...leftOver.map((x): Setting => ({ key: x.key, label: x.key, description: '', category: 'other', value: x }))]
    return result
  }, [res])
  console.log(settingsByCategory)

  const getValue = (s: Setting) => {
    if (s.key in changes) return changes[s.key]
    if (s.key in savedValues) return savedValues[s.key]
    return decode(s.value?.value)
  }

  const handleSave = async () => {
    if (!Object.keys(changes).length) return
    setSaving(true)
    try {
      const params_to_update = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, encode(v)]))
      const result = await callAthena({ type: 'saveParams', dongleId, params: { params_to_update, compression: false } })
      if (result?.error) throw new Error(result.error.data?.message ?? result.error.message)

      const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) return errors.forEach(([k, v]) => toast.error(`${k}: ${v.replace('error: ', '')}`))

      setSavedValues((prev) => ({ ...prev, ...changes }))
      toast.success(`Saved ${Object.keys(changes).length} parameter(s)`)
      setChanges({})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
    setSaving(false)
  }

  const toggleSection = (cat: SettingCategory) => setOpenSection((prev) => (prev === cat ? null : cat))

  const changeCount = Object.keys(changes).length
  const isLoading = res === undefined
  const isError = res?.error || (res && !res.result)

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
              <Button onClick={handleSave} disabled={saving} className="text-sm px-3 py-1.5">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </TopAppBar>

      <div className="p-4 md:p-6 flex flex-col gap-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-sm opacity-60">Connecting to device...</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <span className="text-4xl opacity-40">:(</span>
            <span className="text-lg font-medium">Unable to load parameters</span>
            <span className="text-sm opacity-60">{res?.error?.data?.message ?? res.error?.message ?? 'Device offline or incompatible fork'}</span>
          </div>
        )}

        {settingsByCategory && res?.result && (
          <div className="flex flex-col divide-y divide-white/5">
            <div>
              <SectionHeader label={CATEGORY_LABELS.models} isOpen={openSection === 'models'} onClick={() => toggleSection('models')} />
              {openSection === 'models' && (
                <div className="pb-6">
                  <ModelsSection params={res.result} dongleId={dongleId} />
                </div>
              )}
            </div>

            <div>
              <SectionHeader label={CATEGORY_LABELS.navigation} isOpen={openSection === 'navigation'} onClick={() => toggleSection('navigation')} />
              {openSection === 'navigation' && (
                <div className="pb-6">
                  <NavigationSection
                    params={res.result}
                    dongleId={dongleId}
                    settings={settingsByCategory.navigation}
                    changes={changes}
                    savedValues={savedValues}
                    getValue={getValue}
                    setChanges={setChanges}
                  />
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
                        <SettingsGrid settings={settings} changes={changes} getValue={getValue} setChanges={setChanges} />
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
