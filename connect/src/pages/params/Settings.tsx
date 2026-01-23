import { useDevice } from '../../hooks/useDevice'
import { DeviceParam, DeviceParamKey, DeviceParamType } from '../../utils/params'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'
import { AddToActionBar } from '../device/ActionBar'
import { cn } from '../../../../shared/helpers'

export type Setting = DeviceParam & { key: string; value: string | null | undefined; type: number | undefined }

const SettingInput = ({
  setting,
  value,
  onChange,
  disabled,
}: {
  disabled?: boolean
  setting: Setting
  value: string | null
  onChange: (v: string) => void
}) => {
  const type = setting.type

  if (type === DeviceParamType.SelectOrInt && setting.options) {
    return (
      <Select
        value={value ?? ''}
        disabled={disabled}
        onChange={onChange}
        options={setting.options.map((o) => ({ value: o.value.toString(), label: o.label }))}
      />
    )
  }
  if (type === DeviceParamType.Number || type === DeviceParamType.SelectOrInt) {
    return (
      <input
        disabled={disabled}
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
        <Toggle value={bool} disabled={disabled} onChange={(v) => onChange(v ? '1' : '0')} />
        <span className="text-sm">{bool ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  if (type === DeviceParamType.String)
    return (
      <input
        type="text"
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
      />
    )
  if (type === DeviceParamType.JSON || type === DeviceParamType.Date)
    return (
      <textarea
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
      />
    )
  return <div>Invalid type: {type}</div>
}

export const Settings = ({ settings }: { settings: Setting[] }) => {
  const { changes, set, get } = useDevice()
  const editable = settings.filter((x) => !x.readonly)
  const readonly = settings.filter((x) => x.readonly)

  if (!editable.length && !readonly.length) return null

  return (
    <div className="flex flex-col gap-4">
      {[editable, readonly]
        .filter((x) => x.length)
        .map((editable, i) => (
          <div key={i} className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {editable.map((x) => {
              const changed = x.key in changes
              const readonly = i === 1
              return (
                <div
                  key={x.key}
                  className={cn(
                    'flex flex-col outline outline-white/5 rounded-lg p-4 gap-3 relative group',
                    readonly && 'opacity-60',
                    changed && 'outline-primary outline-2 bg-primary/5',
                  )}
                >
                  {x.type === 1 && (
                    <AddToActionBar
                      action={{
                        type: 'toggle',
                        title: x.label,
                        toggleKey: x.key,
                        toggleType: x.type!,
                        disabled: readonly,
                        icon: x.icon ?? 'star',
                      }}
                    />
                  )}
                  <div className="flex flex-col gap-1" title={x.key}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{x.label}</span>
                      {x.advanced && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Advanced</span>}
                      {changed && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-x">Modified</span>}
                    </div>
                    {x.description && <span className="text-xs opacity-60">{x.description}</span>}
                  </div>
                  <SettingInput
                    disabled={readonly}
                    setting={x}
                    value={get(x.key as DeviceParamKey) ?? null}
                    onChange={(v) => set({ changes: { ...changes, [x.key]: v } })}
                  />
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
