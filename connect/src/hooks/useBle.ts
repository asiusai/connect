import { useState, useEffect, useCallback, useRef } from 'react'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../shared/athena'
import { useRouteParams } from './index'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

export type BleStatus = 'disconnected' | 'connecting' | 'connected' | 'not-supported' | 'unauthorized'

const getToken = (dongleId: string): string | null => localStorage.getItem(`ble_token_${dongleId}`)
const setToken = (dongleId: string, token: string) => localStorage.setItem(`ble_token_${dongleId}`, token)

class BluetoothConnection {
  status: BleStatus = 'disconnected'
  device?: BluetoothDevice
  server?: BluetoothRemoteGATTServer
  requestChar?: BluetoothRemoteGATTCharacteristic
  responseChar?: BluetoothRemoteGATTCharacteristic
  responseBuffer = ''
  requestId = 0
  pendingRequests = new Map<number, (value: any) => void>()
  token: string | null = null
  onStatusChange?: (status: BleStatus) => void
  onDeviceChange?: (deviceName: string | undefined) => void

  constructor(public dongleId: string) {
    this.token = getToken(dongleId)
  }

  private setStatus(status: BleStatus) {
    this.status = status
    this.onStatusChange?.(status)
  }

  private setDevice(device: BluetoothDevice | undefined) {
    this.device = device
    this.onDeviceChange?.(device?.name)
  }

  autoConnect = async () => {
    if (!navigator.bluetooth) {
      this.setStatus('not-supported')
      return
    }
    try {
      this.setStatus('connecting')
      const devices = await navigator.bluetooth.getDevices()
      const device = devices.find((d) => d.name?.startsWith(`comma-${this.dongleId}`))
      if (!device) {
        this.setStatus('disconnected')
        return
      }
      this.setDevice(device)
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
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID], namePrefix: `comma-${this.dongleId}` }],
        optionalServices: [SERVICE_UUID],
      })
      this.setDevice(device)
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
        const result = response.error ? { error: response.error } : { result: response.result }
        resolve(result)
        this.pendingRequests.delete(response.id)
      }
    } catch {
      // Incomplete JSON, wait for more
    }
  }

  disconnect = async () => {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect()
    this.setDevice(undefined)
    this.setStatus('disconnected')
  }

  reconnect = async () => {
    if (!this.device) return
    await this.connectToDevice()
  }

  call = async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
    if (!this.requestChar) return undefined

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
      if ((error as Error).message.includes('Unauthorized')) throw error
    }
  }

  pair = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await this.call('blePair', { code, dongleId: this.dongleId })
      if (result?.result?.token) {
        this.token = result.result.token
        setToken(this.dongleId, result.result.token)
        this.setStatus('connected')
        return { success: true }
      }
      if (result?.error) {
        const errorMsg = (result.error as any).data?.message || result.error.message || String(result.error)
        return { success: false, error: errorMsg }
      }
      return { success: false, error: 'Unknown error' }
    } catch (error) {
      console.error('blePair exception:', error)
      return { success: false, error: (error as Error).message }
    }
  }
}

export const useBle = () => {
  const { dongleId } = useRouteParams()
  const bleRef = useRef<BluetoothConnection>(null!)
  if (!bleRef.current) bleRef.current = new BluetoothConnection(dongleId)
  const ble = bleRef.current

  const [status, setStatus] = useState<BleStatus>('disconnected')
  const [deviceName, setDeviceName] = useState<string | undefined>()

  useEffect(() => {
    ble.onStatusChange = setStatus
    ble.onDeviceChange = setDeviceName
    ble.autoConnect()
  }, [ble])

  const call = useCallback(async <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => ble.call(method, params), [ble])

  const pair = useCallback(async (code: string) => ble.pair(code), [ble])

  return {
    status,
    deviceName,
    connect: ble.connect,
    reconnect: ble.reconnect,
    disconnect: ble.disconnect,
    pair,
    call,
  }
}
