import { useCallback, useEffect, useMemo } from 'react'
import { BleClient } from '@capacitor-community/bluetooth-le'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../../shared/athena'
import { useRouteParams } from '../index'
import { AthenaStatus, UseAthenaType } from './useAthena'
import { create } from 'zustand'
import { ZustandType } from '../../../../shared/helpers'
import { useSettings } from '../useSettings'
import { isNative } from '../../capacitor'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

const getLastDeviceId = (dongleId: string): string | null => localStorage.getItem(`ble_device_${dongleId}`)
const setLastDeviceId = (dongleId: string, deviceId: string) => localStorage.setItem(`ble_device_${dongleId}`, deviceId)
const getBleDeviceName = (dongleId: string): string | null => localStorage.getItem(`ble_name_${dongleId}`)
const saveBleDeviceName = (dongleId: string, name: string) => localStorage.setItem(`ble_name_${dongleId}`, name)

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

      const request = {
        jsonrpc: '2.0',
        method,
        params: params ?? {},
        id,
      }

      const responsePromise = new Promise<AthenaResponse<T>>((resolve) => {
        pendingRequests.set(id, resolve)
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
        console.error('Native BLE call error:', error)
      }
    },
    [set],
  )

  const connectToDevice = useCallback(
    async (deviceId: string, deviceName?: string) => {
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
                console.error('Native BLE error response:', res)
                resolve(undefined)
              } else resolve(res.result)
              state.pendingRequests.delete(res.id)
            }
          } catch {
            set({ responseBuffer: buffer })
          }
        })

        // Verify connection with getDeviceInfo (works even without openpilot)
        const info = await call('getDeviceInfo', undefined as any)
        if (!info) return set({ status: 'disconnected', deviceId: undefined })

        console.log(`Native BLE connected: serial=${info.serial}, op=${info.openpilot_installed}`)
        setLastDeviceId(dongleId, deviceId)
        if (deviceName) saveBleDeviceName(dongleId, deviceName)
        set({ status: 'connected' })
      } catch (e) {
        set({ status: 'disconnected', deviceId: undefined })
        console.error(e)
      }
    },
    [call, dongleId, set],
  )

  const connect = useCallback(async () => {
    try {
      await BleClient.initialize({ androidNeverForLocation: true })
      set({ status: 'connecting' })

      const device = await BleClient.requestDevice({
        services: [SERVICE_UUID],
      })

      console.log('Selected device:', device.name, device.deviceId)
      await connectToDevice(device.deviceId, device.name)
    } catch (e) {
      set({ status: 'disconnected' })
      console.error('BLE connect error:', e)
    }
  }, [connectToDevice, set])

  const autoConnect = useCallback(async () => {
    try {
      await BleClient.initialize({ androidNeverForLocation: true })
      set({ status: 'connecting' })

      // First check if we have a saved device ID
      const savedDeviceId = getLastDeviceId(dongleId)
      if (savedDeviceId) {
        console.log('Attempting to reconnect to saved device:', savedDeviceId)
        try {
          await connectToDevice(savedDeviceId)
          return
        } catch {
          console.log('Saved device not available, scanning...')
        }
      }

      // Then check already connected devices
      const connectedDevices = await BleClient.getConnectedDevices([SERVICE_UUID])
      const savedName = getBleDeviceName(dongleId)
      const device = savedName
        ? (connectedDevices.find((d) => d.name === savedName) ?? connectedDevices.find((d) => d.name?.startsWith('comma-')))
        : connectedDevices.find((d) => d.name?.startsWith('comma-'))

      if (device) {
        await connectToDevice(device.deviceId, device.name)
        return
      }

      // Scan for nearby devices
      let foundDevice: { deviceId: string; name?: string } | undefined
      await BleClient.requestLEScan({ services: [SERVICE_UUID] }, (result) => {
        const name = result.device.name
        if (name?.startsWith('comma-') && (!savedName || name === savedName)) {
          foundDevice = result.device
        }
      })

      await new Promise((r) => setTimeout(r, 3000))
      await BleClient.stopLEScan()

      if (foundDevice) {
        console.log('Found device via scan:', foundDevice.name)
        await connectToDevice(foundDevice.deviceId, foundDevice.name)
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
    if (!isNative) return set({ status: 'not-supported' })
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
