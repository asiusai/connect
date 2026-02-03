import { useCallback, useEffect } from 'react'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../../shared/athena'
import { useRouteParams } from '../index'
import { AthenaStatus, UseAthenaType } from './useAthena'
import { create } from 'zustand'
import { ZustandType } from '../../../../shared/helpers'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

const getToken = (dongleId: string): string | null => localStorage.getItem(`ble_token_${dongleId}`)
const setToken = (dongleId: string, token: string) => localStorage.setItem(`ble_token_${dongleId}`, token)

const bleInit = {
  status: 'disconnected' as AthenaStatus,
  voltage: undefined as string | undefined,
  device: undefined as undefined | BluetoothDevice,
  requestChar: undefined as undefined | BluetoothRemoteGATTCharacteristic,
  requestId: 0,
  token: null as null | string,
  pendingRequests: new Map<number, (value: any) => void>(),
  initialized: false,
}
const useBleState = create<ZustandType<typeof bleInit>>((set) => ({ set, ...bleInit }))

export const useBle = (): UseAthenaType => {
  const { dongleId } = useRouteParams()
  const { status, voltage, device, requestChar, set, token, initialized } = useBleState()

  const connectToDevice = useCallback(async () => {
    if (!device) return

    try {
      set({ status: 'connecting' })
      device.addEventListener('gattserverdisconnected', () => set({ status: 'disconnected' }))
      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(SERVICE_UUID)
      const requestChar = await service.getCharacteristic(RPC_REQUEST_UUID)
      const responseChar = await service.getCharacteristic(RPC_RESPONSE_UUID)
      await responseChar.startNotifications()

      let buffer = ''
      responseChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        buffer += new TextDecoder('utf-8').decode(target.value)
        try {
          const response = JSON.parse(buffer)
          buffer = ''
          const { pendingRequests } = useBleState.getState()
          const resolve = pendingRequests.get(response.id)
          if (resolve) {
            resolve(response.error ? { error: response.error } : { result: response.result })
            pendingRequests.delete(response.id)
          }
        } catch {
          // incomplete JSON, wait for more chunks
        }
      })
      set({ requestChar })

      if (!token) {
        set({ status: 'unauthorized' })
        const code = window.prompt('Insert pairing code')
        if (!code) return console.error("user didn't insert code")

        const res = await call('blePair', { code, dongleId: dongleId })
        if (!res) throw new Error('Pairing failed')

        setToken(dongleId, res.token)
        set({ status: 'connected', token: res.token })
      }

      const res = await call('getMessage', { service: 'peripheralState', timeout: 5000 })
      if (!res) return set({ status: 'disconnected' })

      set({ status: 'connected', voltage: res.peripheralState.voltage })
    } catch (e) {
      set({ status: 'disconnected' })
      console.error(e)
    }
  }, [device])

  const autoConnect = useCallback(async () => {
    if (!navigator.bluetooth) return set({ status: 'not-supported' })
    try {
      set({ status: 'connecting' })
      const devices = await navigator.bluetooth.getDevices()
      const device = devices.find((d) => d.name?.startsWith(`comma-${dongleId}`))
      if (!device) return set({ status: 'disconnected' })

      set({ device })
      await connectToDevice()
    } catch (e) {
      console.error('Auto-connect failed', e)
      set({ status: 'disconnected' })
    }
  }, [dongleId])

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) return set({ status: 'not-supported' })
    try {
      set({ status: 'connecting' })
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID], namePrefix: `comma-${dongleId}` }],
        optionalServices: [SERVICE_UUID],
      })
      set({ device })
      await connectToDevice()
    } catch (e) {
      set({ status: 'disconnected' })
      console.error(e)
    }
  }, [dongleId])

  const disconnect = useCallback(async () => {
    if (device?.gatt?.connected) device.gatt.disconnect()

    set({ status: 'disconnected', device: undefined, initialized: false })
  }, [device])

  // const reconnect = useCallback(async () => {
  //   if (!device) return
  //   await connectToDevice()
  // }, [device])

  const call = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
      if (!requestChar) return undefined

      const { requestId, pendingRequests } = useBleState.getState()
      const id = requestId + 1
      set({ requestId: id })

      const paramsWithToken = typeof params === 'object' && params !== null ? { ...params, token } : { token }

      const request = {
        jsonrpc: '2.0',
        method,
        params: paramsWithToken,
        id,
      }

      const responsePromise = new Promise<AthenaResponse<T>>((resolve, reject) => {
        pendingRequests.set(id, (response: any) => {
          if (response?.error?.code === -32001) {
            set({ status: 'unauthorized' })
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
          await requestChar.writeValue(chunk)
        }
        return await responsePromise
      } catch (error) {
        pendingRequests.delete(id)
        if ((error as Error).message.includes('Unauthorized')) throw error
      }
    },
    [requestChar],
  )

  const init = useCallback(async () => {
    set({ token: getToken(dongleId), initialized: true })
    autoConnect()
  }, [dongleId, autoConnect])

  useEffect(() => {
    if (!initialized) init()
  }, [])

  return { type: 'ble', status, init, call, connect, disconnect, voltage }
}
