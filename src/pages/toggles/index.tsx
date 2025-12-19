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

const decode = (v: string | null | undefined) => (v ? atob(v) : null)

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

const SettingInput = ({ setting, value, onChange }: { setting: Setting; value: string | null; onChange: (v: string) => void }) => {
  const type = setting.value?.type
  const meta = setting.value?.metadata

  if (type === 2 && meta?.options) {
    return <Select value={value ?? ''} onChange={onChange} options={meta.options.map((o) => ({ value: o.value.toString(), label: o.label }))} />
  }
  if (type === 3) {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        min={meta?.min}
        max={meta?.max}
        step={meta?.step ?? 1}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
      />
    )
  }
  if (type === 1) {
    const bool = value === '1' || value === 'true'
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
    result.other = [
      ...result.other,
      ...leftOver.map(
        (x): Setting => ({ key: x.key, label: x.metadata?.title ?? x.key, description: x.metadata?.description ?? '', category: 'other', value: x }),
      ),
    ]
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
      const params_to_update = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, btoa(v)]))
      const result = await callAthena({ type: 'saveParams', dongleId, params: { params_to_update, compression: false } })
      if (result?.error) throw new Error(result.error.message)
      const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) {
        errors.forEach(([k, v]) => toast.error(`${k}: ${v.replace('error: ', '')}`))
        return
      }
      setSavedValues((prev) => ({ ...prev, ...changes }))
      toast.success(`Saved ${Object.keys(changes).length} parameter(s)`)
      setChanges({})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (cat: SettingCategory) => setOpenSection((prev) => (prev === cat ? null : cat))

  const changeCount = Object.keys(changes).length
  const isLoading = res === undefined
  const isError = res?.error || (res && !res.result)
  const errorMessage = res?.error?.message || 'Device offline or incompatible fork'

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
            <span className="text-sm opacity-60">{errorMessage}</span>
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

            {SettingCategory.options
              .filter((cat) => cat !== 'models')
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
