import { TopAppBar } from '../../components/TopAppBar'
import { useDevice } from '../../hooks/useDevice'
import { SettingCategory, DeviceParam, DEVICE_PARAMS, DeviceParamKey, ParamType, getParamType } from '../../utils/params'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '../../../../shared/helpers'
import { BluetoothIcon, WifiIcon as WifiLucideIcon } from 'lucide-react'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/Toggle'
import { Slider } from '../../components/Slider'
import { Select } from '../../components/Select'
import { useBle, type BleStatus } from '../../hooks/useBle'
import { type AthenaResult } from '../../../../shared/athena'

const QUICK_SETTING_KEYS = new Set([
  'OpenpilotEnabledToggle',
  'ExperimentalMode',
  'LongitudinalPersonality',
  'IsMetric',
  'IsLdwEnabled',
  'AlwaysOnDM',
  'RecordFront',
  'RecordAudio',
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

const TABS = ['Settings', 'Network', 'Device', 'Advanced'] as const
type Tab = (typeof TABS)[number]

const SectionCard = ({ children }: { children: React.ReactNode }) => <div className="bg-background-alt rounded-lg divide-y divide-white/5">{children}</div>

const Row = ({ label, description, children, disabled }: { label: string; description?: string; children: React.ReactNode; disabled?: boolean }) => (
  <div className={cn('flex items-center justify-between py-3 px-4 gap-3', disabled && 'opacity-40 pointer-events-none')}>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium">{label}</div>
      {description && <div className="text-xs text-white/40 mt-0.5">{description}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Row label={label}>
    <span className="text-sm text-white/60 font-mono truncate">{value}</span>
  </Row>
)

const WifiIcon = ({ strength, secured }: { strength: number; secured: boolean }) => {
  const bars = strength > 75 ? 3 : strength > 50 ? 2 : strength > 25 ? 1 : 0
  return (
    <div className="flex items-end gap-0.5 h-4 w-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`w-1 rounded-sm ${i <= bars ? 'bg-white' : 'bg-white/20'}`} style={{ height: `${(i + 1) * 5 + 2}px` }} />
      ))}
      {secured && <span className="text-[8px] ml-0.5">🔒</span>}
    </div>
  )
}

const BleBadge = () => (
  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
    <BluetoothIcon className="w-3 h-3" />
    BLE
  </span>
)

const StatusDot = ({ color }: { color: string }) => <div className={cn('w-2 h-2 rounded-full', color)} />

type WifiNetwork = AthenaResult<'getWifiNetworks'>[number]
type NetworkStatus = AthenaResult<'getNetworkStatus'>

const ParamInput = ({ param, value, onChange, disabled }: { param: DeviceParam; value: any; onChange: (v: any) => void; disabled?: boolean }) => {
  const type = param.type

  if (type === ParamType.BOOL) {
    return <Toggle value={!!value} onChange={onChange} disabled={disabled} />
  }
  if (type === ParamType.INT && param.options) {
    return (
      <Select
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(x) => onChange(Number(x))}
        options={param.options.map((o) => ({ value: o.value.toString(), label: o.label }))}
      />
    )
  }
  if (type === ParamType.INT || type === ParamType.FLOAT) {
    return (
      <input
        disabled={disabled}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(type === ParamType.INT ? parseInt(e.target.value, 10) : parseFloat(e.target.value))}
        min={param.min}
        max={param.max}
        step={param.step ?? (type === ParamType.FLOAT ? 0.01 : 1)}
        className="bg-background text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 w-24 text-right"
      />
    )
  }
  if (type === ParamType.STRING) {
    return (
      <input
        disabled={disabled}
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono w-40 text-right"
      />
    )
  }
  if (type === ParamType.TIME) {
    const date = value ? new Date(value * 1000) : null
    return <span className="text-sm text-white/60 font-mono">{date ? date.toLocaleString() : '-'}</span>
  }
  if (type === ParamType.JSON) {
    return <span className="text-sm text-white/40 font-mono truncate max-w-50">{value ? JSON.stringify(value) : '-'}</span>
  }
  return <span className="text-sm text-white/40">-</span>
}

export const Component = () => {
  const { isError, get, saved, save: athenaSave, set: setDeviceStore } = useDevice()
  const ble = useBle()

  const bleConnected = ble.status === 'connected'
  const athenaConnected = !isError && Object.keys(saved).length > 0
  const anyConnected = bleConnected || athenaConnected

  const [tab, setTab] = useState<Tab>('Settings')
  const [pairingCode, setPairingCode] = useState('')

  const [version, setVersion] = useState<AthenaResult<'getVersion'> | null>(null)
  const [githubUser, setGithubUser] = useState('')

  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([])
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [wifiPassword, setWifiPassword] = useState('')
  const [connectingSsid, setConnectingSsid] = useState<string | null>(null)
  const [tetheringPassword, setTetheringPassword] = useState('')
  const [showTetheringPassword, setShowTetheringPassword] = useState(false)

  useEffect(() => {
    if (!bleConnected) return
    const load = async () => {
      const [paramsRes, versionRes, ghRes] = await Promise.all([
        ble.call('getAllParams', undefined).catch(() => undefined),
        ble.call('getVersion', undefined).catch(() => undefined),
        ble.call('getGithubUsername', undefined).catch(() => undefined),
      ])
      if (paramsRes?.result) {
        setDeviceStore((x) => ({ saved: { ...x.saved, ...paramsRes.result }, isLoading: false, isError: false }))
      }
      if (versionRes?.result) setVersion(versionRes.result)
      if (ghRes?.result) setGithubUser(ghRes.result)
    }
    load()
  }, [bleConnected, ble, setDeviceStore])

  useEffect(() => {
    if (!bleConnected) return
    const poll = async () => {
      const [networks, netStatus] = await Promise.all([
        ble.call('getWifiNetworks', undefined).catch(() => undefined),
        ble.call('getNetworkStatus', undefined).catch(() => undefined),
      ])
      if (networks?.result) setWifiNetworks(networks.result)
      if (netStatus?.result) setNetworkStatus(netStatus.result)
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [bleConnected, ble])

  const saveParam = useCallback(
    async (key: string, value: any) => {
      const prev = (saved as Record<string, any>)[key]
      setDeviceStore((x) => ({ saved: { ...x.saved, [key]: value } }))
      try {
        if (bleConnected) {
          const res = await ble.call('saveParams', { params_to_update: { [key]: value } })
          if (res?.result?.[key] && !res.result[key].startsWith('ok')) {
            setDeviceStore((x) => ({ saved: { ...x.saved, [key]: prev } }))
          }
        } else {
          await athenaSave({ [key]: value })
        }
      } catch {
        setDeviceStore((x) => ({ saved: { ...x.saved, [key]: prev } }))
      }
    },
    [bleConnected, ble, athenaSave, saved, setDeviceStore],
  )

  const removeParams = useCallback(
    async (keys: string[]) => {
      const update: Record<string, null> = {}
      for (const k of keys) update[k] = null
      if (bleConnected) {
        await ble.call('saveParams', { params_to_update: update })
      } else {
        await athenaSave(update as any)
      }
    },
    [bleConnected, ble, athenaSave],
  )

  const pair = async () => {
    const result = await ble.pair(pairingCode)
    if (result.success) {
      setPairingCode('')
    } else {
      alert(result.error || 'Pairing failed')
    }
  }

  const handleWifiConnect = async (network: WifiNetwork) => {
    if (network.connected) return
    if (network.saved || network.security === 'open') {
      setConnectingSsid(network.ssid)
      await ble.call('connectWifi', { ssid: network.ssid, password: '' })
      setTimeout(() => setConnectingSsid(null), 5000)
    } else {
      setConnectingSsid(network.ssid)
      setWifiPassword('')
    }
  }

  const submitWifiPassword = async () => {
    if (!connectingSsid) return
    await ble.call('connectWifi', { ssid: connectingSsid, password: wifiPassword })
    setWifiPassword('')
    setTimeout(() => setConnectingSsid(null), 5000)
  }

  const handleForgetWifi = async (ssid: string) => {
    if (!confirm(`Forget "${ssid}"?`)) return
    await ble.call('forgetWifi', { ssid })
  }

  const ToggleRow = ({ label, description, paramKey, bleOnly }: { label: string; description?: string; paramKey: string; bleOnly?: boolean }) => {
    const disabled = !anyConnected || (bleOnly && !bleConnected)
    return (
      <Row label={label} description={description} disabled={disabled}>
        <div className="flex items-center gap-2">
          {bleOnly && <BleBadge />}
          <Toggle value={!!(saved as Record<string, any>)[paramKey]} onChange={(v) => saveParam(paramKey, v)} disabled={disabled} />
        </div>
      </Row>
    )
  }

  const settingsByCategory = useMemo(() => {
    if (!Object.keys(saved).length) return null
    const result: Record<SettingCategory, { key: string; param: DeviceParam; value: any }[]> = {
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
        .map(([key, def]) => ({ key, param: def, value: get(key) }))
        .filter((x) => x.value !== undefined)
    }

    const knownKeys = new Set(Object.keys(DEVICE_PARAMS))
    const leftOver = Object.keys(saved).filter((x) => !knownKeys.has(x))
    result.other = [
      ...result.other,
      ...leftOver.map((key) => ({
        key,
        param: {
          label: key,
          type: getParamType(get(key as DeviceParamKey)),
          description: '',
          category: 'other' as SettingCategory,
          icon: 'star',
        },
        value: get(key as DeviceParamKey),
      })),
    ]
    return result
  }, [saved, get])

  const needsPairing = ble.status === 'unauthorized'

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4">
      <TopAppBar className="z-10 bg-transparent">
        <div className="flex items-center gap-3 w-full">
          <span>Settings</span>
        </div>
      </TopAppBar>

      <div className="p-4 md:p-6 flex flex-col gap-4">
        <ConnectionBar
          athenaConnected={athenaConnected}
          bleStatus={ble.status}
          deviceName={ble.deviceName}
          onConnect={ble.connect}
          onDisconnect={ble.disconnect}
          needsPairing={needsPairing}
          pairingCode={pairingCode}
          onPairingCodeChange={setPairingCode}
          onPair={pair}
        />

        {!anyConnected && !isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm opacity-60">Connecting to device...</span>
          </div>
        )}
        {isError && !bleConnected && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <span className="text-4xl opacity-40">:(</span>
            <span className="text-lg font-medium">Unable to load parameters</span>
            <span className="text-sm opacity-60">Device offline or incompatible fork. Connect via Bluetooth for local access.</span>
          </div>
        )}

        {anyConnected && (
          <>
            <div className="flex gap-1 bg-background-alt rounded-lg p-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 text-sm py-2 rounded-md transition-colors font-medium',
                    tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'Settings' && (
              <div className="flex flex-col gap-3">
                <SectionCard>
                  <ToggleRow label="Enable Openpilot" paramKey="OpenpilotEnabledToggle" />
                  <ToggleRow label="Experimental Mode" paramKey="ExperimentalMode" />
                  <Row label="Driving Personality" disabled={!anyConnected}>
                    <Slider
                      options={Object.fromEntries(DEVICE_PARAMS.LongitudinalPersonality.options.map(({ label, value }) => [String(value), label]))}
                      value={String(saved.LongitudinalPersonality ?? 1)}
                      onChange={(v) => saveParam('LongitudinalPersonality', Number(v))}
                    />
                  </Row>
                  <ToggleRow label="Metric Units" paramKey="IsMetric" />
                  <ToggleRow label="Lane Departure Warnings" paramKey="IsLdwEnabled" />
                  <ToggleRow label="Always-On Driver Monitor" paramKey="AlwaysOnDM" />
                  <ToggleRow label="Record Driver Camera" paramKey="RecordFront" />
                  <ToggleRow label="Record Audio" paramKey="RecordAudio" />
                </SectionCard>
              </div>
            )}

            {tab === 'Network' && (
              <div className="flex flex-col gap-3">
                {!bleConnected ? (
                  <div className="flex items-center justify-center py-12 text-white/30 text-sm">Connect via Bluetooth to manage network</div>
                ) : (
                  <>
                    <SectionCard>
                      {wifiNetworks.length === 0 ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span className="text-white/40 text-sm">Scanning...</span>
                        </div>
                      ) : (
                        wifiNetworks.map((network) => (
                          <div key={network.ssid}>
                            <div className="flex items-center justify-between py-3 px-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <WifiIcon strength={network.strength} secured={network.security !== 'open'} />
                                <span className="text-sm truncate">{network.ssid}</span>
                                {network.connected && <span className="text-xs text-green-400 shrink-0">Connected</span>}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {network.saved && !network.connected && (
                                  <Button onClick={() => handleForgetWifi(network.ssid)} color="error" className="h-7 px-3 text-xs">
                                    Forget
                                  </Button>
                                )}
                                {!network.connected && (
                                  <Button
                                    onClick={() => handleWifiConnect(network)}
                                    color="secondary"
                                    className="h-7 px-3 text-xs"
                                    loading={connectingSsid === network.ssid}
                                  >
                                    Connect
                                  </Button>
                                )}
                              </div>
                            </div>
                            {connectingSsid === network.ssid && network.security !== 'open' && !network.saved && (
                              <div className="flex gap-2 px-4 pb-3">
                                <input
                                  type="password"
                                  value={wifiPassword}
                                  onChange={(e) => setWifiPassword(e.target.value)}
                                  placeholder="Password"
                                  className="flex-1 bg-background text-sm px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-white/40"
                                  onKeyDown={(e) => e.key === 'Enter' && submitWifiPassword()}
                                />
                                <Button onClick={submitWifiPassword} disabled={wifiPassword.length < 8} className="h-9 px-4 text-xs">
                                  Join
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </SectionCard>

                    <SectionCard>
                      <Row label="Enable Tethering" disabled={!bleConnected}>
                        <Toggle
                          value={networkStatus?.tethering_active ?? false}
                          onChange={(v) => ble.call('setTethering', { enabled: v })}
                          disabled={!bleConnected}
                        />
                      </Row>
                      <Row label="Tethering Password" description={networkStatus?.tethering_password || 'Not set'} disabled={!bleConnected}>
                        <Button
                          onClick={() => setShowTetheringPassword(!showTetheringPassword)}
                          color="secondary"
                          className="h-7 px-3 text-xs"
                          disabled={!bleConnected}
                        >
                          Change
                        </Button>
                      </Row>
                      {showTetheringPassword && (
                        <div className="flex gap-2 px-4 py-3">
                          <input
                            type="text"
                            value={tetheringPassword}
                            onChange={(e) => setTetheringPassword(e.target.value)}
                            placeholder="New password (min 8 chars)"
                            className="flex-1 bg-background text-sm px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-white/40"
                          />
                          <Button
                            onClick={async () => {
                              await ble.call('setTetheringPassword', { password: tetheringPassword })
                              setTetheringPassword('')
                              setShowTetheringPassword(false)
                            }}
                            disabled={tetheringPassword.length < 8}
                            className="h-9 px-4 text-xs"
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </SectionCard>

                    <SectionCard>
                      <InfoRow label="IP Address" value={networkStatus?.ip_address || 'Not connected'} />
                      <ToggleRow label="GSM Roaming" paramKey="GsmRoaming" />
                      <InfoRow label="APN" value={(saved.GsmApn as string) || 'Auto'} />
                      <ToggleRow label="Cellular Metered" paramKey="GsmMetered" />
                    </SectionCard>
                  </>
                )}
              </div>
            )}

            {tab === 'Device' && (
              <div className="flex flex-col gap-3">
                <SectionCard>
                  <InfoRow label="Dongle ID" value={(saved.DongleId as string) || '-'} />
                  <InfoRow label="Serial" value={(saved.HardwareSerial as string) || '-'} />
                  <InfoRow label="Version" value={version?.version || (saved.Version as string) || '-'} />
                  <InfoRow label="Branch" value={version?.branch || (saved.GitBranch as string) || '-'} />
                  <InfoRow label="Commit" value={version?.commit?.slice(0, 10) || (saved.GitCommit as string)?.slice(0, 10) || '-'} />
                </SectionCard>

                <SectionCard>
                  <ToggleRow label="Remote Live Streaming" description="WebRTC" paramKey="EnableWebRTC" />
                  <ToggleRow label="Remote Parameter Editing" paramKey="EnableRemoteParams" />
                  <ToggleRow label="Bluetooth" paramKey="EnableBLE" />
                </SectionCard>

                <SectionCard>
                  <ToggleRow label="Enable ADB" paramKey="AdbEnabled" />
                  <ToggleRow label="Enable SSH" paramKey="SshEnabled" />
                  <InfoRow label="GitHub Username" value={githubUser || (saved.GithubUsername as string) || 'Not set'} />
                  <ToggleRow label="UI Debug Mode" paramKey="ShowDebugInfo" />
                  <ToggleRow label="Joystick Debug Mode" paramKey="JoystickDebugMode" />
                </SectionCard>

                <SectionCard>
                  <Row label="Reset Calibration" description="Clear calibration and live parameters" disabled={!bleConnected}>
                    <div className="flex items-center gap-2">
                      <BleBadge />
                      <Button
                        onClick={async () => {
                          if (!confirm('Reset calibration? Device will need to recalibrate.')) return
                          await removeParams(['CalibrationParams', 'LiveTorqueParameters', 'LiveParameters', 'LiveParametersV2', 'LiveDelay'])
                        }}
                        color="secondary"
                        className="h-8 px-4 text-xs"
                        disabled={!bleConnected}
                      >
                        Reset
                      </Button>
                    </div>
                  </Row>
                  <Row label="Reboot Device" disabled={!bleConnected}>
                    <div className="flex items-center gap-2">
                      <BleBadge />
                      <Button
                        onClick={async () => {
                          if (!confirm('Reboot device?')) return
                          await saveParam('DoReboot', true)
                        }}
                        color="secondary"
                        className="h-8 px-4 text-xs"
                        disabled={!bleConnected}
                      >
                        Reboot
                      </Button>
                    </div>
                  </Row>
                  <Row label="Power Off" disabled={!bleConnected}>
                    <div className="flex items-center gap-2">
                      <BleBadge />
                      <Button
                        onClick={async () => {
                          if (!confirm('Power off device?')) return
                          await saveParam('DoShutdown', true)
                        }}
                        color="error"
                        className="h-8 px-4 text-xs"
                        disabled={!bleConnected}
                      >
                        Power Off
                      </Button>
                    </div>
                  </Row>
                </SectionCard>
              </div>
            )}

            {tab === 'Advanced' && settingsByCategory && (
              <div className="flex flex-col gap-4">
                {SettingCategory.options
                  .filter((cat) => cat !== 'models')
                  .map((cat) => {
                    const entries = settingsByCategory[cat]
                    if (!entries.length) return null
                    return (
                      <div key={cat} className="flex flex-col gap-2">
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">
                          {CATEGORY_LABELS[cat]} <span className="opacity-60">{entries.length}</span>
                        </h4>
                        <SectionCard>
                          {entries.map(({ key, param, value }) => (
                            <Row key={key} label={param.label} description={param.description || undefined} disabled={param.readonly}>
                              <ParamInput param={param} value={value} onChange={(v) => saveParam(key, v)} disabled={param.readonly} />
                            </Row>
                          ))}
                        </SectionCard>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const ConnectionBar = ({
  athenaConnected,
  bleStatus,
  deviceName,
  onConnect,
  onDisconnect,
  needsPairing,
  pairingCode,
  onPairingCodeChange,
  onPair,
}: {
  athenaConnected: boolean
  bleStatus: BleStatus
  deviceName?: string
  onConnect: () => void
  onDisconnect: () => void
  needsPairing: boolean
  pairingCode: string
  onPairingCodeChange: (code: string) => void
  onPair: () => void
}) => {
  const bleConnected = bleStatus === 'connected'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 bg-background-alt rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot color={athenaConnected ? 'bg-green-400' : 'bg-white/20'} />
          <WifiLucideIcon className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/60">Internet</span>
        </div>

        <div className="w-px h-5 bg-white/10" />

        <div className="flex items-center gap-2">
          <StatusDot
            color={bleConnected ? 'bg-indigo-400' : needsPairing ? 'bg-yellow-400' : bleStatus === 'connecting' ? 'bg-indigo-400 animate-pulse' : 'bg-white/20'}
          />
          <BluetoothIcon className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/60">
            {bleStatus === 'connected' && 'Bluetooth'}
            {bleStatus === 'connecting' && 'Connecting...'}
            {bleStatus === 'disconnected' && 'Bluetooth'}
            {bleStatus === 'unauthorized' && 'Pairing needed'}
            {bleStatus === 'not-supported' && 'Not supported'}
          </span>
          {deviceName && <span className="text-xs text-white/30 font-mono hidden md:inline">{deviceName}</span>}
        </div>

        <div className="flex-1" />

        {!bleConnected && !needsPairing && (
          <Button onClick={onConnect} color="secondary" className="h-8 px-3 text-xs">
            Connect BLE
          </Button>
        )}
        {(bleConnected || needsPairing) && (
          <Button onClick={onDisconnect} color="secondary" className="h-8 px-3 text-xs">
            Disconnect
          </Button>
        )}
      </div>

      {needsPairing && (
        <div className="bg-background-alt border border-yellow-500/40 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Device Pairing Required</h3>
            <p className="text-white/50 text-xs mt-1">Enter the 6-digit code displayed on your device</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pairingCode}
              onChange={(e) => onPairingCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="flex-1 bg-background border border-white/20 rounded-lg px-4 py-2 text-center text-xl tracking-widest"
              maxLength={6}
            />
            <Button onClick={onPair} disabled={pairingCode.length !== 6}>
              Pair
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
