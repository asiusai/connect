import { useState, useEffect } from 'react'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../../shared/athena'
import { useRouteParams } from '../../hooks'
import { Button } from '../../components/Button'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'not-supported' | 'unauthorized'

const getToken = (dongleId: string): string | null => {
  return localStorage.getItem(`ble_token_${dongleId}`)
}

const setToken = (dongleId: string, token: string) => {
  localStorage.setItem(`ble_token_${dongleId}`, token)
}

class BluetoothConnection {
  status: ConnectionStatus = 'disconnected'
  device?: BluetoothDevice
  server?: BluetoothRemoteGATTServer
  requestChar?: BluetoothRemoteGATTCharacteristic
  responseChar?: BluetoothRemoteGATTCharacteristic
  responseBuffer = ''
  requestId = 0
  pendingRequests = new Map<number, (value: any) => void>()
  token: string | null = null
  dongleId: string
  onStatusChange?: (status: ConnectionStatus) => void

  constructor(dongleId: string) {
    this.dongleId = dongleId
    this.token = getToken(dongleId)
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.onStatusChange?.(status)
  }

  autoConnect = async () => {
    if (!navigator.bluetooth) {
      this.setStatus('not-supported')
      return
    }

    try {
      this.setStatus('connecting')
      const devices = await navigator.bluetooth.getDevices()
      const device = devices.find((d) => d.name?.startsWith('comma-'))

      if (!device) {
        this.setStatus('disconnected')
        return
      }

      this.device = device
      await this.connectToDevice()
    } catch (e) {
      console.error('Auto-connect failed', e)
      this.setStatus('disconnected')
    }
  }

  connect = async () => {
    if (!navigator.bluetooth) {
      this.setStatus('not-supported')
      return
    }

    try {
      this.setStatus('connecting')
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { namePrefix: 'comma-' }],
        optionalServices: [SERVICE_UUID],
      })

      await this.connectToDevice()
    } catch (e) {
      this.setStatus('disconnected')
      console.error(e)
    }
  }

  connectToDevice = async () => {
    if (!this.device) return

    try {
      this.setStatus('connecting')

      this.device.addEventListener('gattserverdisconnected', () => {
        this.setStatus('disconnected')
      })

      this.server = await this.device.gatt!.connect()

      const service = await this.server.getPrimaryService(SERVICE_UUID)
      this.requestChar = await service.getCharacteristic(RPC_REQUEST_UUID)
      this.responseChar = await service.getCharacteristic(RPC_RESPONSE_UUID)

      await this.responseChar.startNotifications()
      this.responseChar.addEventListener('characteristicvaluechanged', this.handleResponse)

      // If we have no token, show pairing UI immediately
      if (!this.token) {
        this.setStatus('unauthorized')
      } else {
        this.setStatus('connected')
      }
    } catch (e) {
      this.setStatus('disconnected')
      console.error(e)
    }
  }

  handleResponse = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const decoder = new TextDecoder('utf-8')
    const chunk = decoder.decode(target.value)

    this.responseBuffer += chunk

    try {
      const response = JSON.parse(this.responseBuffer)
      this.responseBuffer = ''

      const resolve = this.pendingRequests.get(response.id)
      if (resolve) {
        resolve(response.error ? { error: response.error } : { result: response.result })
        this.pendingRequests.delete(response.id)
      }
    } catch {
      // Incomplete JSON, wait for more
    }
  }

  disconnect = async () => {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect()
    this.device = undefined
    this.setStatus('disconnected')
  }

  call = async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
    if (!this.requestChar) return

    this.requestId++
    const paramsWithToken = typeof params === 'object' && params !== null ? { ...params, token: this.token } : { token: this.token }

    const request = {
      jsonrpc: '2.0',
      method,
      params: paramsWithToken,
      id: this.requestId,
    }

    const responsePromise = new Promise<AthenaResponse<T>>((resolve, reject) => {
      this.pendingRequests.set(this.requestId, (response: any) => {
        if (response?.error?.code === -32001) {
          this.setStatus('unauthorized')
          reject(new Error('Unauthorized: pair with device first'))
        } else {
          resolve(response)
        }
      })
    })

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(request))

      const MTU = 512
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU)
        await this.requestChar.writeValue(chunk)
      }

      return await responsePromise
    } catch (error) {
      this.pendingRequests.delete(this.requestId)
      if ((error as Error).message.includes('Unauthorized')) {
        throw error
      }
    }
  }

  pair = async (code: string): Promise<boolean> => {
    try {
      const result = await this.call('blePair', { code, dongleId: this.dongleId })
      if (result?.result?.token) {
        this.token = result.result.token
        setToken(this.dongleId, result.result.token)
        this.setStatus('connected')
        return true
      }
      return false
    } catch {
      return false
    }
  }
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [ble] = useState(() => new BluetoothConnection(dongleId))
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [pairingCode, setPairingCode] = useState('')
  const [response, setResponse] = useState('-')

  useEffect(() => {
    ble.onStatusChange = setStatus
    const init = async () => {
      await ble.autoConnect()
    }
    init()
  }, [ble])

  const connect = async () => {
    await ble.connect()
  }

  const disconnect = async () => {
    await ble.disconnect()
  }

  const call: typeof ble.call = async (method, params) => {
    try {
      const res = await ble.call(method, params)
      setResponse(JSON.stringify(res, null, 2))
      return res
    } catch (error) {
      if ((error as Error).message.includes('Unauthorized')) {
        // Status already set by ble.call
      }
      throw error
    }
  }

  const pair = async () => {
    const success = await ble.pair(pairingCode)
    if (success) {
      setPairingCode('')
    } else {
      alert('Invalid pairing code')
    }
  }

  const isConnected = status === 'connected'
  const needsPairing = status === 'unauthorized'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Bluetooth Control</h1>
        <p className="text-white/60">Connect to your device via Bluetooth Low Energy</p>
      </div>

      <div className="bg-background-alt rounded-lg p-4">
        <div className="text-sm text-white/60 mb-2">Status</div>
        <div className="flex items-center gap-2">
          {status === 'connecting' && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
          <div className="text-lg font-medium">
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && 'Connected'}
            {status === 'disconnected' && 'Disconnected'}
            {status === 'unauthorized' && 'Connected - Pairing Required'}
            {status === 'not-supported' && 'Bluetooth Not Supported'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={connect} disabled={isConnected}>
          New Device
        </Button>
        <Button onClick={disconnect} disabled={!isConnected} color="secondary">
          Disconnect
        </Button>
      </div>

      {needsPairing && (
        <div className="bg-background-alt border-2 border-green-500 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Device Pairing Required</h3>
            <p className="text-white/60 text-sm">Enter the 6-digit pairing code displayed on your device</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="flex-1 bg-background border border-white/20 rounded-lg px-4 py-3 text-center text-2xl tracking-widest"
              maxLength={6}
            />
            <Button onClick={pair} disabled={pairingCode.length !== 6}>
              Pair
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Device Info</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call('getVersion', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getVersion
          </Button>
          <Button onClick={() => call('getNetworkType', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getNetworkType
          </Button>
          <Button onClick={() => call('getNetworkMetered', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getNetworkMetered
          </Button>
          <Button onClick={() => call('getNetworks', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getNetworks
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Device</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call('getPublicKey', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getPublicKey
          </Button>
          <Button onClick={() => call('getGithubUsername', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getGithubUsername
          </Button>
          <Button onClick={() => call('getSimInfo', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
            getSimInfo
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Params</h3>
        <Button onClick={() => call('getAllParams', undefined)} disabled={!isConnected} color="secondary" className="h-8 px-4 text-xs">
          getAllParams
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Response</h3>
        <pre className="bg-background-alt p-4 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap break-all">{response}</pre>
      </div>
    </div>
  )
}
