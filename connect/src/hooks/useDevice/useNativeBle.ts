import { useCallback, useEffect, useMemo } from 'react'
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../../shared/athena'
import { useRouteParams } from '../index'
import { AthenaStatus, UseAthenaType } from './useAthena'
import { create } from 'zustand'
import { ZustandType } from '../../../../shared/helpers'
import { useSettings } from '../useSettings'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

const getToken = (dongleId: string): string | null => localStorage.getItem(`ble_token_${dongleId}`)
const setToken = (dongleId: string, token: string) => localStorage.setItem(`ble_token_${dongleId}`, token)

const nativeBleInit = {
  status: 'disconnected' as AthenaStatus,
  voltage: undefined as string | undefined,
  deviceId: undefined as string | undefined,
  requestId: 0,
  pendingRequests: new Map<number, (value: any) => void>(),
  responseBuffer: '',
  dongleId: undefined as string | undefined,
}
const useNativeBleState = create<ZustandType<typeof nativeBleInit>>((set) => ({ set, ...nativeBleInit }))

export const useNativeBle = (): UseAthenaType => {
  const { dongleId } = useRouteParams()
  const usingAsiusPilot = useSettings((x) => x.usingAsiusPilot)
  const { status, voltage, set } = useNativeBleState()

  const call = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
      const { deviceId, requestId, pendingRequests } = useNativeBleState.getState()
      if (!deviceId) return undefined

      const id = requestId + 1
      set({ requestId: id })

      const token = getToken(dongleId)
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
          await BleClient.write(deviceId, SERVICE_UUID, RPC_REQUEST_UUID, new DataView(chunk.buffer))
        }
        return await responsePromise
      } catch (error) {
        pendingRequests.delete(id)
        if ((error as Error).message.includes('Unauthorized')) throw error
      }
    },
    [dongleId, set],
  )

  const pair = useCallback(async () => {
    set({ status: 'unauthorized' })
    const code = window.prompt('Insert pairing code')
    if (!code) throw new Error("User didn't insert code")

    const res = await call('blePair', { code, dongleId })
    if (!res) throw new Error(`Pairing failed, ${code}, ${dongleId}`)

    setToken(dongleId, res.token)
    set({ status: 'connected' })
  }, [dongleId, call, set])

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      try {
        set({ status: 'connecting', deviceId })

        await BleClient.connect(deviceId, () => {
          set({ status: 'disconnected', deviceId: undefined })
        })

        await BleClient.startNotifications(deviceId, SERVICE_UUID, RPC_RESPONSE_UUID, (value) => {
          const state = useNativeBleState.getState()
          const chunk = new TextDecoder('utf-8').decode(value)
          const buffer = state.responseBuffer + chunk

          try {
            const res = JSON.parse(buffer)
            set({ responseBuffer: '' })
            const resolve = state.pendingRequests.get(res.id)
            if (resolve) {
              if (res.error) {
                if (res.error.code === -32001) resolve(-32001)
                console.error(`Native BLE failed, res:`, res)
                resolve(undefined)
              } else resolve(res.result)
              state.pendingRequests.delete(res.id)
            }
          } catch {
            set({ responseBuffer: buffer })
          }
        })

        const token = getToken(dongleId)
        if (!token) await pair()

        let res = await call('getMessage', { service: 'peripheralState', timeout: 1000 })

        if (res === -32001) {
          await pair()
          res = await call('getMessage', { service: 'peripheralState', timeout: 1000 })
        }

        if (!res) return set({ status: 'disconnected', deviceId: undefined })

        console.log(`Native Bluetooth connected, voltage: ${res.peripheralState.voltage}`)
        set({ status: 'connected', voltage: res.peripheralState.voltage })
      } catch (e) {
        set({ status: 'disconnected', deviceId: undefined })
        console.error(e)
      }
    },
    [call, dongleId, pair, set],
  )

  const connect = useCallback(async () => {
    try {
      await BleClient.initialize()
      set({ status: 'connecting' })

      const device = await BleClient.requestDevice({
        services: [SERVICE_UUID],
        namePrefix: `comma-${dongleId}`,
      })

      await connectToDevice(device.deviceId)
    } catch (e) {
      set({ status: 'disconnected' })
      console.error(e)
    }
  }, [dongleId, connectToDevice, set])

  const autoConnect = useCallback(async () => {
    try {
      await BleClient.initialize()
      set({ status: 'connecting' })

      const connectedDevices = await BleClient.getConnectedDevices([SERVICE_UUID])
      const device = connectedDevices.find((d) => d.name?.startsWith(`comma-${dongleId}`))

      if (device) {
        await connectToDevice(device.deviceId)
        return
      }

      set({ status: 'disconnected' })
    } catch (e) {
      console.error('Native auto-connect failed', e)
      set({ status: 'disconnected' })
    }
  }, [dongleId, connectToDevice, set])

  const disconnect = useCallback(async () => {
    const { deviceId } = useNativeBleState.getState()
    if (deviceId) {
      try {
        await BleClient.disconnect(deviceId)
      } catch (e) {
        console.error('Disconnect error', e)
      }
    }
    set({ status: 'disconnected', deviceId: undefined, dongleId: undefined })
  }, [set])

  useEffect(() => {
    if (!usingAsiusPilot) return
    if (useNativeBleState.getState().dongleId === dongleId) return

    set({ dongleId })
    autoConnect()
  }, [usingAsiusPilot, autoConnect, set, dongleId])

  return useMemo(
    () => ({
      type: 'ble',
      status,
      init: autoConnect,
      call: status === 'connected' ? call : undefined,
      connect,
      disconnect,
      voltage,
      connected: status === 'connected',
    }),
    [status, autoConnect, call, connect, disconnect, voltage],
  )
}
