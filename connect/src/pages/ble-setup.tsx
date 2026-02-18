import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '../../../shared/helpers'
import { BluetoothIcon, WifiIcon, DownloadIcon, CheckCircleIcon, RefreshCwIcon, LockIcon, LoaderIcon, AlertCircleIcon, ChevronLeftIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BleClient } from '@capacitor-community/bluetooth-le'
import { isNative } from '../capacitor'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

type Step = 'scan' | 'wifi' | 'install' | 'done'

type DeviceInfo = {
  serial: string
  agnos_version: string
  openpilot_installed: boolean
  ipc_connected: boolean
}

type WifiNetwork = {
  ssid: string
  strength: number
  security: string
  connected: boolean
}

type NetworkStatus = {
  wifi_ssid: string
  wifi_ip: string
  wifi_connected: boolean
  has_internet: boolean
}

type InstallStatus = {
  state: string
  progress: string
  error: string
}

// Simple BLE RPC client for the setup flow (not tied to dongleId or useDevice)
const useBleSetup = () => {
  const [connected, setConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const requestIdRef = useRef(0)
  const pendingRef = useRef(new Map<number, (value: any) => void>())

  // Web Bluetooth state
  const gattCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  // Native BLE state
  const nativeDeviceIdRef = useRef<string | null>(null)

  const call = useCallback(async (method: string, params: Record<string, any> = {}): Promise<any> => {
    const id = ++requestIdRef.current

    const request = JSON.stringify({ jsonrpc: '2.0', method, params, id })
    const data = new TextEncoder().encode(request)
    const MTU = 512

    const responsePromise = new Promise<any>((resolve) => {
      pendingRef.current.set(id, resolve)
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id)
          resolve(undefined)
        }
      }, 30000)
    })

    if (isNative && nativeDeviceIdRef.current) {
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU)
        await BleClient.write(nativeDeviceIdRef.current, SERVICE_UUID, RPC_REQUEST_UUID, new DataView(chunk.buffer))
      }
    } else if (gattCharRef.current) {
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU)
        await gattCharRef.current.writeValue(chunk)
      }
    }

    return responsePromise
  }, [])

  const handleResponse = useCallback((buffer: string) => {
    try {
      const res = JSON.parse(buffer)
      const resolve = pendingRef.current.get(res.id)
      if (resolve) {
        resolve(res.error ? undefined : res.result)
        pendingRef.current.delete(res.id)
      }
      return ''
    } catch {
      return buffer
    }
  }, [])

  const connectNative = useCallback(async () => {
    await BleClient.initialize({ androidNeverForLocation: true })

    const device = await BleClient.requestDevice({ services: [SERVICE_UUID] })
    nativeDeviceIdRef.current = device.deviceId

    await BleClient.connect(device.deviceId, () => {
      setConnected(false)
      setDeviceInfo(null)
      nativeDeviceIdRef.current = null
    })

    let buffer = ''
    await BleClient.startNotifications(device.deviceId, SERVICE_UUID, RPC_RESPONSE_UUID, (value) => {
      buffer += new TextDecoder('utf-8').decode(value)
      buffer = handleResponse(buffer)
    })

    setConnected(true)
    const info = await call('getDeviceInfo')
    if (info) setDeviceInfo(info)
  }, [call, handleResponse])

  const connectWeb = useCallback(async () => {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID], namePrefix: 'comma-' }],
      optionalServices: [SERVICE_UUID],
    })

    device.addEventListener('gattserverdisconnected', () => {
      setConnected(false)
      setDeviceInfo(null)
      gattCharRef.current = null
    })

    const server = await device.gatt!.connect()
    const service = await server.getPrimaryService(SERVICE_UUID)
    const requestChar = await service.getCharacteristic(RPC_REQUEST_UUID)
    const responseChar = await service.getCharacteristic(RPC_RESPONSE_UUID)
    await responseChar.startNotifications()

    let buffer = ''
    responseChar.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      buffer += new TextDecoder('utf-8').decode(target.value)
      buffer = handleResponse(buffer)
    })

    gattCharRef.current = requestChar
    setConnected(true)
    const info = await call('getDeviceInfo')
    if (info) setDeviceInfo(info)
  }, [call, handleResponse])

  const connect = useCallback(async () => {
    if (isNative) await connectNative()
    else await connectWeb()
  }, [connectNative, connectWeb])

  return { connected, deviceInfo, connect, call }
}

// ---------------------------------------------------------------------------
// Main setup page
// ---------------------------------------------------------------------------

export const Component = () => {
  const { connected, deviceInfo, connect, call } = useBleSetup()
  const [step, setStep] = useState<Step>('scan')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      await connect()
      setStep('wifi')
    } catch (e) {
      setError((e as Error).message || 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    if (!connected) setStep('scan')
  }, [connected])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <Link to="/">
            <ChevronLeftIcon className="text-xl" />
          </Link>
          <span className="text-lg font-bold">Device Setup</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <StepIndicator current={step} />

        <div className="w-full max-w-md mt-8">
          {step === 'scan' && <ScanStep connecting={connecting} error={error} onConnect={handleConnect} />}
          {step === 'wifi' && <WifiStep call={call} deviceInfo={deviceInfo} onNext={() => setStep(deviceInfo?.openpilot_installed ? 'done' : 'install')} />}
          {step === 'install' && <InstallStep call={call} onDone={() => setStep('done')} />}
          {step === 'done' && <DoneStep deviceInfo={deviceInfo} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS: { key: Step; label: string }[] = [
  { key: 'scan', label: 'Connect' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'install', label: 'Install' },
  { key: 'done', label: 'Done' },
]

const StepIndicator = ({ current }: { current: Step }) => {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < idx ? 'bg-green-500 text-white' : i === idx ? 'bg-white text-black' : 'bg-white/10 text-white/30',
            )}
          >
            {i < idx ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className={cn('w-8 h-0.5', i < idx ? 'bg-green-500' : 'bg-white/10')} />}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Scan & connect via BLE
// ---------------------------------------------------------------------------

const ScanStep = ({ connecting, error, onConnect }: { connecting: boolean; error: string; onConnect: () => void }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
      <BluetoothIcon className="w-10 h-10 text-indigo-400" />
    </div>
    <div>
      <h2 className="text-xl font-bold">Connect to your device</h2>
      <p className="text-sm text-white/50 mt-2">Make sure your comma device is powered on and nearby.</p>
    </div>
    {error && (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertCircleIcon className="w-4 h-4" />
        {error}
      </div>
    )}
    <button
      onClick={onConnect}
      disabled={connecting}
      className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {connecting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <BluetoothIcon className="w-5 h-5" />}
      {connecting ? 'Connecting...' : 'Scan for devices'}
    </button>
  </div>
)

// ---------------------------------------------------------------------------
// Step 2: WiFi setup
// ---------------------------------------------------------------------------

const WifiStep = ({ call, deviceInfo, onNext }: { call: (m: string, p?: any) => Promise<any>; deviceInfo: DeviceInfo | null; onNext: () => void }) => {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [passwordPrompt, setPasswordPrompt] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const scan = useCallback(async () => {
    setScanning(true)
    const res = await call('getWifiNetworks')
    if (res) setNetworks(res)
    setScanning(false)
  }, [call])

  const checkStatus = useCallback(async () => {
    const res = await call('getNetworkStatus')
    if (res) setNetworkStatus(res)
  }, [call])

  const connectToNetwork = useCallback(
    async (ssid: string, pw?: string) => {
      setConnecting(ssid)
      setPasswordPrompt(null)
      await call('connectWifi', { ssid, password: pw })
      await scan()
      await checkStatus()
      setConnecting(null)
    },
    [call, scan, checkStatus],
  )

  useEffect(() => {
    scan()
    checkStatus()
  }, [scan, checkStatus])

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Connect to WiFi</h2>
        <p className="text-sm text-white/50 mt-1">{deviceInfo?.serial && <span className="font-mono text-white/30">{deviceInfo.serial.slice(0, 8)}</span>}</p>
      </div>

      {networkStatus?.wifi_connected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <div className="text-sm font-medium text-green-400">Connected to {networkStatus.wifi_ssid}</div>
            <div className="text-xs text-white/40">
              {networkStatus.wifi_ip} {networkStatus.has_internet ? '— internet ok' : '— no internet'}
            </div>
          </div>
        </div>
      )}

      <div className="bg-background-alt rounded-xl divide-y divide-white/5">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[13px] font-medium">Networks</span>
          <button onClick={scan} disabled={scanning} className="p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCwIcon className={cn('w-4 h-4 text-white/50', scanning && 'animate-spin')} />
          </button>
        </div>

        {scanning && networks.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <LoaderIcon className="w-4 h-4 text-white/30 animate-spin" />
            <span className="text-xs text-white/35">Scanning...</span>
          </div>
        )}

        {networks.map((net) => (
          <div key={net.ssid} className="flex items-center gap-3 py-2.5 px-3">
            <WifiIcon className={cn('w-4 h-4 shrink-0', net.connected ? 'text-green-400' : 'text-white/25')} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate">{net.ssid}</div>
              <div className="text-[10px] text-white/30 flex items-center gap-1">
                {net.security !== 'open' && <LockIcon className="w-2.5 h-2.5" />}
                <span>{net.strength}%</span>
              </div>
            </div>
            {connecting === net.ssid ? (
              <LoaderIcon className="w-4 h-4 text-white/30 animate-spin" />
            ) : net.connected ? (
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
            ) : (
              <button
                onClick={() => {
                  if (net.security === 'open') connectToNetwork(net.ssid)
                  else setPasswordPrompt(net.ssid)
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
              placeholder={`Password for ${passwordPrompt}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password) {
                  connectToNetwork(passwordPrompt, password)
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
                connectToNetwork(passwordPrompt, password)
                setPassword('')
              }}
              disabled={!password}
              className="text-[11px] text-indigo-400 font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
            >
              Join
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!networkStatus?.has_internet}
        className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {deviceInfo?.openpilot_installed ? 'Done' : 'Next: Install openpilot'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Install openpilot
// ---------------------------------------------------------------------------

const FORKS = [
  { label: 'comma.ai (stock)', url: 'https://github.com/commaai/openpilot.git', branch: 'release3' },
  { label: 'asius', url: 'https://github.com/asiusai/openpilot.git', branch: 'release' },
]

const InstallStep = ({ call, onDone }: { call: (m: string, p?: any) => Promise<any>; onDone: () => void }) => {
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<InstallStatus | null>(null)
  const [selectedFork, setSelectedFork] = useState(0)

  const startInstall = useCallback(async () => {
    const fork = FORKS[selectedFork]
    setInstalling(true)
    await call('installOpenpilot', { url: fork.url, branch: fork.branch })
  }, [call, selectedFork])

  // Poll install status
  useEffect(() => {
    if (!installing) return
    const interval = setInterval(async () => {
      const res = await call('getInstallStatus')
      if (res) {
        setStatus(res)
        if (res.state === 'error') setInstalling(false)
        if (res.state === 'idle' && res.progress === '') {
          // install finished and device rebooted (or never started)
        }
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [installing, call])

  if (installing) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <DownloadIcon className="w-10 h-10 text-indigo-400 animate-bounce" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Installing openpilot</h2>
          <p className="text-sm text-white/50 mt-2">{status?.progress || 'Starting...'}</p>
          {status?.state === 'error' && <p className="text-sm text-red-400 mt-2">{status.error}</p>}
        </div>
        <LoaderIcon className="w-6 h-6 text-white/30 animate-spin" />
        <p className="text-xs text-white/30">The device will reboot when installation is complete.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">Install openpilot</h2>
        <p className="text-sm text-white/50 mt-1">Choose which version to install.</p>
      </div>

      <div className="bg-background-alt rounded-xl divide-y divide-white/5">
        {FORKS.map((fork, i) => (
          <button
            key={fork.url}
            onClick={() => setSelectedFork(i)}
            className={cn('w-full flex items-center gap-3 py-3 px-4 text-left transition-colors', selectedFork === i ? 'bg-white/5' : 'hover:bg-white/3')}
          >
            <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', selectedFork === i ? 'border-indigo-400' : 'border-white/20')}>
              {selectedFork === i && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
            </div>
            <div>
              <div className="text-sm font-medium">{fork.label}</div>
              <div className="text-[11px] text-white/30 font-mono">{fork.branch}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={startInstall}
        className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
      >
        <DownloadIcon className="w-5 h-5" />
        Install
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Done
// ---------------------------------------------------------------------------

const DoneStep = ({ deviceInfo }: { deviceInfo: DeviceInfo | null }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
      <CheckCircleIcon className="w-10 h-10 text-green-400" />
    </div>
    <div>
      <h2 className="text-xl font-bold">Setup complete</h2>
      <p className="text-sm text-white/50 mt-2">
        Your device {deviceInfo?.serial && <span className="font-mono">({deviceInfo.serial.slice(0, 8)})</span>} is ready.
      </p>
      {deviceInfo?.openpilot_installed ? (
        <p className="text-sm text-white/50 mt-1">openpilot is installed and running.</p>
      ) : (
        <p className="text-sm text-white/50 mt-1">The device will reboot after installation.</p>
      )}
    </div>
    <Link to="/" className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors text-center block">
      Go to dashboard
    </Link>
  </div>
)
