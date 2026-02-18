import { useCallback, useEffect, useMemo } from 'react'
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

// Map dongleId <-> BLE device name for reconnection
const getBleDeviceName = (dongleId: string): string | null => localStorage.getItem(`ble_name_${dongleId}`)
const saveBleDeviceName = (dongleId: string, name: string) => localStorage.setItem(`ble_name_${dongleId}`, name)

const bleInit = {
  status: 'disconnected' as AthenaStatus,
  voltage: undefined as string | undefined,
  device: undefined as undefined | BluetoothDevice,
  requestChar: undefined as undefined | BluetoothRemoteGATTCharacteristic,
  requestId: 0,
  pendingRequests: new Map<number, (value: any) => void>(),
  dongleId: undefined as string | undefined,
}
const useBleState = create<ZustandType<typeof bleInit>>((set) => ({ set, ...bleInit }))

export const useBle = (): UseAthenaType => {
  const { dongleId } = useRouteParams()
  const usingAsiusPilot = useSettings((x) => x.usingAsiusPilot)
  const { status, voltage, set } = useBleState()

  const call = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
      const requestChar = useBleState.getState().requestChar
      if (!requestChar) return undefined

      const { requestId, pendingRequests } = useBleState.getState()
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
          await requestChar.writeValue(chunk)
        }
        return await responsePromise
      } catch (error) {
        pendingRequests.delete(id)
        console.error('BLE call error:', error)
      }
    },
    [set],
  )

  const connectToDevice = useCallback(async () => {
    const device = useBleState.getState().device
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
      responseChar.addEventListener('characteristicvaluechanged', async (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        buffer += new TextDecoder('utf-8').decode(target.value)
        try {
          const res = JSON.parse(buffer)
          buffer = ''
          const { pendingRequests } = useBleState.getState()
          const resolve = pendingRequests.get(res.id)
          if (resolve) {
            if (res.error) {
              console.error('BLE error response:', res)
              resolve(undefined)
            } else resolve(res.result)
            pendingRequests.delete(res.id)
          }
        } catch {
          // incomplete JSON, wait for more chunks
        }
      })
      set({ requestChar })

      const info = await call('getDeviceInfo', undefined as any)
      if (!info) return set({ status: 'disconnected' })

      // Save the BLE device name so we can find it again for this dongleId
      if (device.name) saveBleDeviceName(dongleId, device.name)

      console.log(`BLE connected: ${device.name}, serial: ${info.serial}, op: ${info.openpilot_installed}`)
      set({ status: 'connected' })
    } catch (e) {
      set({ status: 'disconnected' })
      console.error(e)
    }
  }, [call, dongleId, set])

  const autoConnect = useCallback(async () => {
    try {
      set({ status: 'connecting' })
      const devices = await navigator.bluetooth.getDevices()

      // Try to find by saved BLE device name, fall back to any comma- device
      const savedName = getBleDeviceName(dongleId)
      const device = savedName
        ? (devices.find((d) => d.name === savedName) ?? devices.find((d) => d.name?.startsWith('comma-')))
        : devices.find((d) => d.name?.startsWith('comma-'))
      if (!device) return set({ status: 'disconnected' })

      set({ device })

      const abort = new AbortController()
      const timeout = setTimeout(() => abort.abort(), 30_000)
      await new Promise<void>((resolve, reject) => {
        const onAdvert = () => {
          clearTimeout(timeout)
          device.removeEventListener('advertisementreceived', onAdvert)
          resolve()
        }
        device.addEventListener('advertisementreceived', onAdvert)
        abort.signal.addEventListener('abort', () => {
          device.removeEventListener('advertisementreceived', onAdvert)
          reject(new Error('Auto-connect timed out'))
        })
        device.watchAdvertisements({ signal: abort.signal }).catch(reject)
      })

      await connectToDevice()
    } catch (e) {
      console.error('Auto-connect failed', e)
      set({ status: 'disconnected' })
    }
  }, [dongleId, connectToDevice, set])

  const connect = useCallback(async () => {
    try {
      set({ status: 'connecting' })
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID], namePrefix: 'comma-' }],
        optionalServices: [SERVICE_UUID],
      })
      set({ device })
      await connectToDevice()
    } catch (e) {
      set({ status: 'disconnected' })
      console.error(e)
    }
  }, [connectToDevice, set])

  const disconnect = useCallback(async () => {
    const device = useBleState.getState().device
    if (device?.gatt?.connected) device.gatt.disconnect()

    set({ status: 'disconnected', device: undefined, dongleId: undefined })
  }, [set])

  useEffect(() => {
    if (isNative) return set({ status: 'not-supported' })
    if (!navigator.bluetooth) return set({ status: 'not-supported' })
    if (!usingAsiusPilot) return
    if (useBleState.getState().dongleId === dongleId) return

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
