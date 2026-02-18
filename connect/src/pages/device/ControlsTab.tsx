import { useDevice } from '../../hooks/useDevice'
import { Toggle } from '../../components/Toggle'
import { Select } from '../../components/Select'

import { DeviceParam, DEVICE_PARAMS, ParamType, getParamType, DeviceParamKey } from '../../utils/params'
import { cn } from '../../../../shared/helpers'
import {
  WifiIcon,
  ShieldIcon,
  GaugeIcon,
  EyeIcon,
  VideoIcon,
  MicIcon,
  RulerIcon,
  RadioIcon,
  BluetoothIcon,
  RotateCcwIcon,
  PowerIcon,
  SignalIcon,
  NavigationIcon,
  RefreshCwIcon,
  LockIcon,
  TrashIcon,
  CheckIcon,
  LoaderIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import type { AthenaResponse } from '../../../../shared/athena'

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-background-alt rounded-xl divide-y divide-white/5', className)}>{children}</div>
)

export const IconBadge = ({ icon: Icon, color }: { icon: LucideIcon; color: string }) => (
  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
    <Icon className="w-4 h-4 text-white" />
  </div>
)

export const Row = ({
  icon,
  iconColor,
  label,
  description,
  children,
  disabled,
}: {
  icon?: LucideIcon
  iconColor?: string
  label: string
  description?: string
  children: React.ReactNode
  disabled?: boolean
}) => (
  <div className={cn('flex items-center gap-3 py-2.5 px-3', disabled && 'opacity-30 pointer-events-none')}>
    {icon && <IconBadge icon={icon} color={iconColor ?? 'bg-white/10'} />}
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{label}</div>
      {description && <div className="text-xs text-white/35 mt-0.5">{description}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

export const InfoRow = ({ icon, iconColor, label, value }: { icon?: LucideIcon; iconColor?: string; label: string; value: string }) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    {icon && <IconBadge icon={icon} color={iconColor ?? 'bg-white/10'} />}
    <span className="text-[13px] text-white/50 flex-1">{label}</span>
    <span className="text-[13px] text-white/80 font-mono truncate max-w-50">{value}</span>
  </div>
)

export const SectionLabel = ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-bold mt-4">{children}</h2>

export const BleBadge = () => <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">BLE</span>

export const ParamInput = ({
  param,
  value,
  onChange,
  disabled,
  name,
}: {
  name: DeviceParamKey
  param: DeviceParam
  value: any
  onChange: (v: any) => void
  disabled?: boolean
}) => {
  const type = getParamType(name, value)
  if (type === ParamType.BOOL) return <Toggle value={!!value} onChange={onChange} disabled={disabled} />
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
        className="bg-background text-sm px-2.5 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 w-20 text-right"
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
        className="bg-background text-sm px-2.5 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono w-36 text-right"
      />
    )
  }
  if (type === ParamType.TIME) {
    const date = value ? new Date(value * 1000) : null
    return <span className="text-xs text-white/50 font-mono">{date ? date.toLocaleString() : '-'}</span>
  }
  if (type === ParamType.JSON) {
    return <span className="text-xs text-white/35 font-mono truncate max-w-35">{value ? JSON.stringify(value) : '-'}</span>
  }
  return <span className="text-xs text-white/35">-</span>
}

export const NotConnected = ({ className }: { className?: string }) => (
  <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    <span className="text-xs text-white/40">Connecting to device...</span>
  </div>
)

// Controls tab (toggles + connectivity + device actions)
export const ControlsTab = ({ className }: { className?: string }) => {
  const { params, saveParams, ble } = useDevice()
  if (!params || !saveParams) return <NotConnected className={className} />
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Card>
        <Row icon={ShieldIcon} iconColor="bg-green-600" label="Openpilot">
          <Toggle value={params.OpenpilotEnabledToggle} onChange={(v) => saveParams({ OpenpilotEnabledToggle: v })} />
        </Row>
        <Row icon={GaugeIcon} iconColor="bg-orange-600" label="Experimental Mode" description="Neural network for all decisions">
          <Toggle value={params.ExperimentalMode} onChange={(v) => saveParams({ ExperimentalMode: v })} />
        </Row>
        <Row icon={GaugeIcon} iconColor="bg-blue-600" label="Driving Personality">
          <Select
            options={DEVICE_PARAMS.LongitudinalPersonality.options!.map(({ label, value }) => ({ value: String(value), label }))}
            value={String(params.LongitudinalPersonality ?? 1)}
            onChange={(v) => saveParams({ LongitudinalPersonality: Number(v) })}
          />
        </Row>
        <Row icon={EyeIcon} iconColor="bg-yellow-600" label="Lane Departure Warnings">
          <Toggle value={params.IsLdwEnabled} onChange={(v) => saveParams({ IsLdwEnabled: v })} />
        </Row>
        <Row icon={EyeIcon} iconColor="bg-purple-600" label="Always-On Driver Monitor">
          <Toggle value={params.AlwaysOnDM} onChange={(v) => saveParams({ AlwaysOnDM: v })} />
        </Row>
        <Row icon={VideoIcon} iconColor="bg-red-600" label="Record Driver Camera">
          <Toggle value={params.RecordFront} onChange={(v) => saveParams({ RecordFront: v })} />
        </Row>
        <Row icon={MicIcon} iconColor="bg-pink-600" label="Record Audio">
          <Toggle value={params.RecordAudio} onChange={(v) => saveParams({ RecordAudio: v })} />
        </Row>
        <Row icon={RulerIcon} iconColor="bg-sky-600" label="Metric Units">
          <Toggle value={params.IsMetric} onChange={(v) => saveParams({ IsMetric: v })} />
        </Row>
        <Row icon={NavigationIcon} iconColor="bg-cyan-600" label="Lane Turn Desire" description="Model turn intention">
          <Toggle value={params.LaneTurnDesire} onChange={(v) => saveParams({ LaneTurnDesire: v })} />
        </Row>
      </Card>
      <SectionLabel>Connectivity</SectionLabel>
      <Card>
        <Row icon={RadioIcon} iconColor="bg-green-600" label="Remote Streaming" description="WebRTC live view">
          <Toggle value={params.EnableWebRTC} onChange={(v) => saveParams({ EnableWebRTC: v })} />
        </Row>
        <Row icon={BluetoothIcon} iconColor="bg-indigo-600" label="Bluetooth">
          <Toggle value={params.EnableBLE} onChange={(v) => saveParams({ EnableBLE: v })} />
        </Row>
        <Row icon={SignalIcon} iconColor="bg-teal-600" label="Network Usage" description="Metered connection type">
          <Toggle value={params.NetworkMetered} onChange={(v) => saveParams({ NetworkMetered: v })} />
        </Row>
      </Card>
      <WifiCard />
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={async () => {
            if (!confirm('Reboot device?')) return
            await saveParams({ DoReboot: true })
          }}
          disabled={!ble.connected}
          className={cn(
            'flex flex-col items-center gap-2 py-5 rounded-xl bg-background-alt hover:bg-white/5 transition-colors',
            !ble.connected && 'opacity-25 pointer-events-none',
          )}
        >
          <RotateCcwIcon className="w-5 h-5 text-white/60" />
          <span className="text-[11px] text-white/50">Reboot</span>
          {!ble.connected && <BleBadge />}
        </button>
        <button
          onClick={async () => {
            if (!confirm('Reset calibration?')) return
            await saveParams({ CalibrationParams: null, LiveTorqueParameters: null, LiveParameters: null, LiveParametersV2: null, LiveDelay: null })
          }}
          disabled={!ble.connected}
          className={cn(
            'flex flex-col items-center gap-2 py-5 rounded-xl bg-background-alt hover:bg-white/5 transition-colors',
            !ble.connected && 'opacity-25 pointer-events-none',
          )}
        >
          <RotateCcwIcon className="w-5 h-5 text-white/60" />
          <span className="text-[11px] text-white/50">Recalibrate</span>
          {!ble.connected && <BleBadge />}
        </button>
        <button
          onClick={async () => {
            if (!confirm('Power off device?')) return
            await saveParams({ DoShutdown: true })
          }}
          disabled={!ble.connected}
          className={cn(
            'flex flex-col items-center gap-2 py-5 rounded-xl bg-background-alt hover:bg-white/5 transition-colors',
            !ble.connected && 'opacity-25 pointer-events-none',
          )}
        >
          <PowerIcon className="w-5 h-5 text-red-400/60" />
          <span className="text-[11px] text-white/50">Power Off</span>
          {!ble.connected && <BleBadge />}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WiFi management card
// ---------------------------------------------------------------------------

type WifiNetwork = AthenaResponse<'getWifiNetworks'>[number]

const WifiCard = () => {
  const { ble, call } = useDevice()
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [passwordPrompt, setPasswordPrompt] = useState<{ ssid: string; security: string } | null>(null)
  const [password, setPassword] = useState('')

  const scan = useCallback(async () => {
    if (!call) return
    setScanning(true)
    try {
      const res = await call('getWifiNetworks', undefined as any)
      if (res) setNetworks(res)
    } finally {
      setScanning(false)
    }
  }, [call])

  const connectToNetwork = useCallback(
    async (ssid: string, pw?: string) => {
      if (!call) return
      setConnecting(ssid)
      setPasswordPrompt(null)
      try {
        await call('connectWifi', { ssid, password: pw })
        await scan()
      } finally {
        setConnecting(null)
      }
    },
    [call, scan],
  )

  const forget = useCallback(
    async (ssid: string) => {
      if (!call) return
      await call('forgetWifi', { ssid })
      await scan()
    },
    [call, scan],
  )

  if (!ble.connected) {
    return (
      <Card className="divide-y-0!">
        <div className="flex flex-col items-center gap-3 py-6">
          <WifiIcon className="w-8 h-8 text-white/15" />
          <span className="text-sm text-white/35">Connect via BLE to manage WiFi</span>
          <BleBadge />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <IconBadge icon={WifiIcon} color="bg-blue-600" />
          <span className="text-[13px] font-medium">WiFi</span>
        </div>
        <button onClick={scan} disabled={scanning} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCwIcon className={cn('w-4 h-4 text-white/50', scanning && 'animate-spin')} />
        </button>
      </div>

      {networks.length === 0 && !scanning && (
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="text-xs text-white/35">Tap refresh to scan for networks</span>
        </div>
      )}

      {scanning && networks.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-6">
          <LoaderIcon className="w-4 h-4 text-white/30 animate-spin" />
          <span className="text-xs text-white/35">Scanning...</span>
        </div>
      )}

      {networks.map((net) => (
        <div key={net.ssid} className="flex items-center gap-3 py-2 px-3">
          <WifiIcon className={cn('w-4 h-4 shrink-0', net.connected ? 'text-green-400' : 'text-white/25')} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] truncate">{net.ssid}</div>
            <div className="text-[10px] text-white/30 flex items-center gap-1.5">
              {net.security !== 'open' && <LockIcon className="w-2.5 h-2.5" />}
              <span>{net.strength}%</span>
            </div>
          </div>
          {connecting === net.ssid ? (
            <LoaderIcon className="w-4 h-4 text-white/30 animate-spin" />
          ) : net.connected ? (
            <div className="flex items-center gap-1">
              <CheckIcon className="w-4 h-4 text-green-400" />
              <button onClick={() => forget(net.ssid)} className="p-1 rounded hover:bg-white/5">
                <TrashIcon className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (net.security === 'open') connectToNetwork(net.ssid)
                else setPasswordPrompt({ ssid: net.ssid, security: net.security })
              }}
              className="text-[11px] text-indigo-400 font-medium px-2 py-1 rounded-lg hover:bg-white/5"
            >
              Connect
            </button>
          )}
        </div>
      ))}

      {passwordPrompt && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/3">
          <input
            autoFocus
            type="password"
            placeholder={`Password for ${passwordPrompt.ssid}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password) {
                connectToNetwork(passwordPrompt.ssid, password)
                setPassword('')
              }
              if (e.key === 'Escape') {
                setPasswordPrompt(null)
                setPassword('')
              }
            }}
            className="flex-1 bg-background text-sm px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={() => {
              if (password) {
                connectToNetwork(passwordPrompt.ssid, password)
                setPassword('')
              }
            }}
            disabled={!password}
            className="text-[11px] text-indigo-400 font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
          >
            Join
          </button>
        </div>
      )}
    </Card>
  )
}
