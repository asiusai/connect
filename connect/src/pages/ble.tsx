import { useState, useEffect, useRef } from 'react'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export const Component = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [statusText, setStatusText] = useState('Not connected')
  const [logs, setLogs] = useState<string[]>([])
  const [response, setResponse] = useState('-')
  const [reconnectDevice, setReconnectDevice] = useState<string | null>(null)

  const deviceRef = useRef<BluetoothDevice | null>(null)
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null)
  const requestCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const responseCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const responseBufferRef = useRef('')
  const requestIdRef = useRef(0)
  const autoReconnectRef = useRef(true)

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${time}] ${msg}`, ...prev])
    console.log(msg)
  }

  const updateReconnectButton = async () => {
    if (!navigator.bluetooth?.getDevices) {
      setReconnectDevice(null)
      return
    }

    const devices = await navigator.bluetooth.getDevices()
    const athenaDevice = devices.find((d) => d.name?.startsWith('comma-'))

    if (athenaDevice && !deviceRef.current) {
      setReconnectDevice(athenaDevice.name || null)
    } else {
      setReconnectDevice(null)
    }
  }

  const onDisconnected = () => {
    log('Device disconnected')
    setStatus('disconnected')
    setStatusText('Disconnected')
    updateReconnectButton()

    if (autoReconnectRef.current && deviceRef.current) {
      log('Attempting to reconnect in 2s...')
      setTimeout(async () => {
        if (deviceRef.current && !deviceRef.current.gatt?.connected) {
          try {
            await connectToDevice()
          } catch (e) {
            log(`Reconnect failed: ${(e as Error).message}`)
          }
        }
      }, 2000)
    }
  }

  const connectToDevice = async () => {
    try {
      log('Connecting to GATT server...')
      serverRef.current = await deviceRef.current!.gatt!.connect()

      log('Getting Athena service...')
      const service = await serverRef.current.getPrimaryService(SERVICE_UUID)

      log('Getting characteristics...')
      requestCharRef.current = await service.getCharacteristic(RPC_REQUEST_UUID)
      responseCharRef.current = await service.getCharacteristic(RPC_RESPONSE_UUID)

      log('Starting notifications...')
      await responseCharRef.current.startNotifications()
      responseCharRef.current.addEventListener('characteristicvaluechanged', handleResponse)

      log('Connected!')
      setStatus('connected')
      setStatusText(`Connected to ${deviceRef.current!.name}`)
      updateReconnectButton()

      // Auto-fetch device info
      callMethod('getVersion', {})
    } catch (error) {
      log(`Connection error: ${(error as Error).message}`)
      setStatus('disconnected')
      setStatusText('Connection failed')
    }
  }

  const reconnect = async () => {
    try {
      const devices = await navigator.bluetooth.getDevices()
      const athenaDevice = devices.find((d) => d.name?.startsWith('comma-'))

      if (!athenaDevice) {
        log('No paired device found, use New Device')
        return
      }

      log(`Reconnecting to ${athenaDevice.name}...`)
      setStatus('connecting')
      setStatusText('Connecting...')

      deviceRef.current = athenaDevice
      deviceRef.current.addEventListener('gattserverdisconnected', onDisconnected)

      await connectToDevice()
    } catch (error) {
      log(`Reconnect error: ${(error as Error).message}`)
      setStatus('disconnected')
      setStatusText('Connection failed')
    }
  }

  const connect = async () => {
    try {
      log('Requesting BLE device...')

      deviceRef.current = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { namePrefix: 'comma-' }],
        optionalServices: [SERVICE_UUID],
      })

      log(`Found device: ${deviceRef.current.name}`)
      localStorage.setItem('ble_last_device', deviceRef.current.name || '')

      deviceRef.current.addEventListener('gattserverdisconnected', onDisconnected)

      await connectToDevice()
    } catch (error) {
      log(`Error: ${(error as Error).message}`)
      setStatus('disconnected')
      setStatusText('Connection failed')
    }
  }

  const disconnect = () => {
    autoReconnectRef.current = false
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }
    deviceRef.current = null
    setStatus('disconnected')
    setStatusText('Disconnected')
    updateReconnectButton()
    setTimeout(() => {
      autoReconnectRef.current = true
    }, 1000)
  }

  const handleResponse = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const decoder = new TextDecoder('utf-8')
    const chunk = decoder.decode(target.value)

    responseBufferRef.current += chunk

    try {
      const response = JSON.parse(responseBufferRef.current)
      log('Response received')
      setResponse(JSON.stringify(response, null, 2))
      responseBufferRef.current = ''
    } catch {
      // Incomplete JSON, wait for more
    }
  }

  const saveParamsPrompt = () => {
    const key = prompt('Parameter key:')
    if (!key) return

    const valueStr = prompt('Value (use true/false for bools, numbers for ints/floats, or JSON for objects):')
    if (valueStr === null) return

    let value: any
    if (valueStr === 'true') value = true
    else if (valueStr === 'false') value = false
    else if (valueStr === '' || valueStr === 'null') value = null
    else if (!Number.isNaN(Number(valueStr))) value = Number(valueStr)
    else {
      try {
        value = JSON.parse(valueStr)
      } catch {
        value = valueStr
      }
    }

    callMethod('saveParams', { params_to_update: { [key]: value } })
  }

  const callMethod = async (method: string, params: any) => {
    if (!requestCharRef.current) {
      log('Not connected')
      return
    }

    requestIdRef.current++
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestIdRef.current,
    }

    const json = JSON.stringify(request)
    log(`Calling ${method}...`)

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(json)

      const MTU = 512
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU)
        await requestCharRef.current.writeValue(chunk)
      }
    } catch (error) {
      log(`Error: ${(error as Error).message}`)
    }
  }

  useEffect(() => {
    if (!navigator.bluetooth) {
      log('Web Bluetooth not supported - use Chrome on desktop or Android')
      setStatusText('Web Bluetooth not supported')
    } else {
      updateReconnectButton()
    }
  }, [])

  const isConnected = status === 'connected'
  const isBluetoothSupported = !!navigator.bluetooth

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-5">
      <div className="max-w-150 mx-auto">
        <h1 className="text-[#4ade80] text-3xl font-bold mb-4">BLE Athena</h1>

        <div className={`p-2.5 rounded-lg mb-2.5 ${isConnected ? 'bg-[#166534]' : 'bg-[#7f1d1d]'}`}>{statusText}</div>

        <div className="mb-5">
          {reconnectDevice && (
            <button onClick={reconnect} className="bg-[#4ade80] text-black border-none px-6 py-3 text-base rounded-lg cursor-pointer m-1.5 hover:bg-[#22c55e]">
              Reconnect ({reconnectDevice})
            </button>
          )}
          <button
            onClick={connect}
            disabled={isConnected || !isBluetoothSupported}
            className="bg-[#4ade80] text-black border-none px-6 py-3 text-base rounded-lg cursor-pointer m-1.5 hover:bg-[#22c55e] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
          >
            New Device
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="bg-[#4ade80] text-black border-none px-6 py-3 text-base rounded-lg cursor-pointer m-1.5 hover:bg-[#22c55e] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Device Info</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getVersion', {})}
            disabled={!isConnected}
          >
            getVersion
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getNetworkType', {})}
            disabled={!isConnected}
          >
            getNetworkType
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getNetworkMetered', {})}
            disabled={!isConnected}
          >
            getNetworkMetered
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getNetworks', {})}
            disabled={!isConnected}
          >
            getNetworks
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Device</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getPublicKey', {})}
            disabled={!isConnected}
          >
            getPublicKey
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getGithubUsername', {})}
            disabled={!isConnected}
          >
            getGithubUsername
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getSimInfo', {})}
            disabled={!isConnected}
          >
            getSimInfo
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Params</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => callMethod('getAllParams', {})}
            disabled={!isConnected}
          >
            getAllParams
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={saveParamsPrompt}
            disabled={!isConnected}
          >
            saveParams
          </button>
        </div>

        <h3 className="mt-5 mb-2.5">Response</h3>
        <div className="bg-[#1e3a5f] p-4 rounded-lg font-mono text-xs my-2.5 whitespace-pre-wrap break-all max-h-37.5 overflow-y-auto">{response}</div>

        <h3 className="mt-5 mb-2.5">Log</h3>
        <div className="bg-black p-4 rounded-lg font-mono text-xs max-h-50 overflow-y-auto whitespace-pre-wrap break-all">{logs.join('\n')}</div>
      </div>
    </div>
  )
}
