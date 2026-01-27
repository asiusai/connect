import { useDevice } from '../../hooks/useDevice'
import { DeviceParam, DeviceParamKey, ParamType } from '../../utils/params'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'
import { AddToActionBar } from '../device/ActionBar'
import { cn, parse } from '../../../../shared/helpers'

export type Setting = DeviceParam & { key: string; value: string | null | undefined; type: number | undefined }

const SettingInput = ({ setting, value, onChange, disabled }: { disabled?: boolean; setting: Setting; value: any | null; onChange: (v: any) => void }) => {
  const type = setting.type

  if (type === ParamType.INT && setting.options && (typeof value === 'number' || value === null)) {
    return (
      <Select
        value={value.toString() ?? ''}
        disabled={disabled}
        onChange={(x) => onChange(Number(x))}
        options={setting.options.map((o) => ({ value: o.value.toString(), label: o.label }))}
      />
    )
  }
  if ((type === ParamType.FLOAT || type === ParamType.INT) && (typeof value === 'number' || value === null)) {
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
  if (type === ParamType.BOOL && (typeof value === 'boolean' || value === null)) {
    return (
      <div className="flex items-center gap-2">
        <Toggle value={value} disabled={disabled} onChange={(v) => onChange(v)} />
        <span className="text-sm">{value ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  if (type === ParamType.STRING && (typeof value === 'string' || value === null))
    return (
      <input
        type="text"
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
      />
    )
  if (type === ParamType.TIME && (typeof value === 'number' || value === null)) {
    const date = value ? new Date(value * 1000) : null
    const localIsoValue = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      : ''

    return (
      <input
        type="datetime-local"
        disabled={disabled}
        value={localIsoValue}
        onChange={(e) => {
          const newDate = new Date(e.target.value)
          if (!Number.isNaN(newDate.getTime())) onChange(newDate.getTime() / 1000)
        }}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20"
      />
    )
  }
  if (type === ParamType.JSON && (typeof value === 'object' || value === null))
    return (
      <textarea
        disabled={disabled}
        value={value ? JSON.stringify(value, null, 2) : ''}
        onChange={(e) => {
          const res = parse(e.currentTarget.value)
          if (res) onChange(res)
        }}
        className="bg-background-alt text-sm px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 font-mono"
      />
    )
  return (
    <div className="text-red-500">
      Invalid type: {type}, value: {value}
    </div>
  )
}

export const Settings = ({ settings }: { settings: Setting[] }) => {
  const { save, get } = useDevice()
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
              const readonly = i === 1
              return (
                <div key={x.key} className={cn('flex flex-col outline outline-white/5 rounded-lg p-4 gap-3 relative group', readonly && 'opacity-60')}>
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
                    </div>
                    {x.description && <span className="text-xs opacity-60">{x.description}</span>}
                  </div>
                  <SettingInput disabled={readonly} setting={x} value={get(x.key as DeviceParamKey) ?? null} onChange={(v) => save({ [x.key]: v })} />
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
