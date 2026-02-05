import { cn } from '../../../../shared/helpers'
import { TerminalIcon, KeyIcon, BugIcon, GamepadIcon, NavigationIcon, FlaskConicalIcon, LoaderIcon } from 'lucide-react'
import { SettingCategory, DeviceParam, DEVICE_PARAMS, DeviceParamKey } from '../../utils/params'
import { useMemo, useState } from 'react'
import { Card, Row, SectionLabel, NotConnected, ParamInput, BleBadge } from './ControlsTab'
import { useDevice } from '../../hooks/useDevice'
import { Toggle } from '../../components/Toggle'
import { toast } from 'sonner'

const QUICK_SETTING_KEYS = new Set([
  'OpenpilotEnabledToggle',
  'ExperimentalMode',
  'LongitudinalPersonality',
  'IsMetric',
  'IsLdwEnabled',
  'AlwaysOnDM',
  'RecordFront',
  'RecordAudio',
  'EnableWebRTC',
  'EnableBLE',
  'NetworkMetered',
  'LaneTurnDesire',
  'AdbEnabled',
  'SshEnabled',
  'GithubUsername',
  'ShowDebugInfo',
  'JoystickDebugMode',
  'LongitudinalManeuverMode',
  'AlphaLongitudinalEnabled',
])

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

const GithubSshKeys = ({ saveParams, currentUsername }: { saveParams: ReturnType<typeof useDevice>['saveParams']; currentUsername: string }) => {
  const [username, setUsername] = useState(currentUsername)
  const [loading, setLoading] = useState(false)
  const { ble } = useDevice()

  const fetchKeys = async () => {
    const name = username.trim()
    if (!name) return
    if (name === currentUsername) return
    setLoading(true)
    try {
      const res = await fetch(`https://github.com/${name}.keys`)
      if (!res.ok) throw new Error('User not found')
      const keys = (await res.text()).trim()
      if (!keys) throw new Error('No SSH keys found')
      await saveParams!({ GithubUsername: name, GithubSshKeys: keys })
      toast.success(`SSH keys set for ${name}`)
    } catch {
      toast.error(`No SSH keys found for '${name}'`)
      setUsername(currentUsername)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row icon={KeyIcon} iconColor="bg-amber-600" label="GitHub SSH Keys" disabled={!ble.connected}>
      <div className="flex items-center gap-2">
        {loading ? (
          <LoaderIcon className="w-4 h-4 animate-spin text-white/40" />
        ) : (
          <input
            type="text"
            value={username}
            placeholder="GitHub username"
            onChange={(e) => setUsername(e.target.value)}
            onBlur={fetchKeys}
            onKeyDown={(e) => e.key === 'Enter' && fetchKeys()}
            className="bg-background text-sm px-2.5 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono w-32 text-right"
          />
        )}
        {!ble.connected && <BleBadge />}
      </div>
    </Row>
  )
}

export const DeveloperTab = () => {
  const { params, saveParams, ble } = useDevice()

  const settingsByCategory = useMemo(() => {
    if (!params || !Object.keys(params).length) return null
    const result: Record<SettingCategory, { key: DeviceParamKey; param: DeviceParam; value: any }[]> = {
      models: [],
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
        .filter(([key, def]) => !def.hidden && def.category === cat && !QUICK_SETTING_KEYS.has(key))
        .map(([key, def]) => ({ key, param: def, value: params[key] }))
        .filter((x) => x.value !== undefined)
    }
    const knownKeys = new Set(Object.keys(DEVICE_PARAMS))
    const leftOver = Object.keys(params).filter((x) => !knownKeys.has(x))
    result.other = [
      ...result.other,
      ...leftOver.map((key) => ({
        key: key as DeviceParamKey,
        param: { label: key, description: '', category: 'other' as SettingCategory, icon: 'star' },
        value: params[key as DeviceParamKey],
      })),
    ]
    return result
  }, [params])

  if (!params || !saveParams) return <NotConnected />

  return (
    <div className={cn('flex flex-col gap-3')}>
      <Card>
        <Row icon={TerminalIcon} iconColor="bg-gray-600" label="ADB" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.AdbEnabled} onChange={(v) => saveParams({ AdbEnabled: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
        <Row icon={TerminalIcon} iconColor="bg-emerald-600" label="SSH" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.SshEnabled} onChange={(v) => saveParams({ SshEnabled: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
        <GithubSshKeys saveParams={saveParams} currentUsername={(params.GithubUsername as string) ?? ''} />
        <Row icon={BugIcon} iconColor="bg-yellow-600" label="UI Debug Mode" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.ShowDebugInfo} onChange={(v) => saveParams({ ShowDebugInfo: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
        <Row icon={GamepadIcon} iconColor="bg-indigo-600" label="Joystick Debug" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.JoystickDebugMode} onChange={(v) => saveParams({ JoystickDebugMode: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
        <Row icon={NavigationIcon} iconColor="bg-cyan-600" label="Maneuver Mode" description="Specialized maneuver handling" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.LongitudinalManeuverMode} onChange={(v) => saveParams({ LongitudinalManeuverMode: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
        <Row icon={FlaskConicalIcon} iconColor="bg-rose-600" label="Alpha Longitudinal" description="Alpha longitudinal control" disabled={!ble.connected}>
          <div className="flex items-center gap-2">
            <Toggle value={params.AlphaLongitudinalEnabled} onChange={(v) => saveParams({ AlphaLongitudinalEnabled: v })} />
            {!ble.connected && <BleBadge />}
          </div>
        </Row>
      </Card>
      {settingsByCategory &&
        SettingCategory.options
          .filter((cat) => cat !== 'models')
          .map((cat) => {
            const entries = settingsByCategory[cat]
            if (!entries.length) return null
            return (
              <div key={cat}>
                <SectionLabel>
                  {CATEGORY_LABELS[cat]} ({entries.length})
                </SectionLabel>
                <Card>
                  {entries.map(({ key, param, value }) => (
                    <Row key={key} label={param.label} description={param.description || undefined} disabled={param.readonly}>
                      <ParamInput name={key} param={param} value={value} onChange={(v) => saveParams({ [key]: v })} disabled={param.readonly} />
                    </Row>
                  ))}
                </Card>
              </div>
            )
          })}
    </div>
  )
}
