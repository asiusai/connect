import { callAthena, ParamValue } from '../../api/athena'
import { BackButton } from '../../components/BackButton'
import { TopAppBar } from '../../components/TopAppBar'
import { useAsyncMemo, useRouteParams } from '../../utils/hooks'
import { SettingCategory, SettingDefinition, SETTINGS } from './settings'
import { useStorage } from '../../utils/storage'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'

type Setting = SettingDefinition & { value?: ParamValue }

const decode = (v: string | null | undefined) => (v ? atob(v) : null)

// type: 0=string, 1=bool, 2=enum, 3=number, 5=json
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

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [category, setCategory] = useStorage('settingsCategory')
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedValues, setSavedValues] = useState<Record<string, string>>({})

  const res = useAsyncMemo(async () => await callAthena({ type: 'getAllParams', dongleId, params: {} }), [dongleId])

  const settings = useMemo(() => {
    if (!res?.result) return []
    const defined: Setting[] = SETTINGS.filter((x) => !x.hidden && x.category === category).map((s) => ({
      ...s,
      value: res.result?.find((x) => x.key === s.key),
    }))
    if (category !== 'other') return defined
    const leftOver = res.result?.filter((x) => !SETTINGS.some((s) => s.key === x.key)) ?? []
    return [
      ...defined,
      ...leftOver.map(
        (x): Setting => ({ key: x.key, label: x.metadata?.title ?? x.key, description: x.metadata?.description ?? '', category: 'other', value: x }),
      ),
    ]
  }, [res, category])

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
      // Keep the saved values locally so UI doesn't reset
      setSavedValues((prev) => ({ ...prev, ...changes }))
      toast.success(`Saved ${Object.keys(changes).length} parameter(s)`)
      setChanges({})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const editable = settings.filter((x) => !x.readonly)
  const readonly = settings.filter((x) => x.readonly)
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

      <div className="p-6 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {SettingCategory.options.map((x) => (
            <button
              key={x}
              onClick={() => setCategory(x)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg capitalize',
                category === x ? 'bg-primary text-primary-x' : 'bg-background-alt hover:bg-white/10',
              )}
            >
              {x}
            </button>
          ))}
        </div>

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

        {res?.result && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        {changed && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-x">Modified</span>}
                      </div>
                      {x.description && <span className="text-xs opacity-60">{x.description}</span>}
                    </div>
                    <SettingInput setting={x} value={getValue(x)} onChange={(v) => setChanges((p) => ({ ...p, [x.key]: v }))} />
                  </div>
                )
              })}
            </div>

            {readonly.length > 0 && (
              <>
                <p className="text-xl text-primary mt-4">Read-only</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readonly.map((x) => (
                    <div key={x.key} className="flex flex-col outline outline-white/5 rounded-lg p-4 gap-2 opacity-60">
                      <span className="font-medium">{x.label}</span>
                      {x.description && <span className="text-xs opacity-70">{x.description}</span>}
                      <span className="text-sm bg-white/5 p-2 rounded-md font-mono break-all">{decode(x.value?.value) ?? 'null'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
