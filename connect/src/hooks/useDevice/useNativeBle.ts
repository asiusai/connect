import { useCallback, useEffect, useMemo } from 'react'
import { BleClient } from '@capacitor-community/bluetooth-le'
import { encode, decode } from '@msgpack/msgpack'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../../shared/athena'
import { useRouteParams } from '../index'
import { AthenaStatus } from './useAthena'
import { create } from 'zustand'
import { ZustandType } from '../../../../shared/helpers'
import { useSettings } from '../useSettings'
import { isNative } from '../../capacitor'

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const UART_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e' // write to device
const UART_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // notify from device

const CHUNK_SIZE = 240
const CHANNEL_SETTINGS = 0x02
const REQUEST_TIMEOUT = 10000

/** Reassemble chunked Nordic UART messages */
class ChunkAssembler {
  private active = new Map<number, { chunks: (Uint8Array | undefined)[]; missing: number; time: number }>()

  feed(data: DataView): { channel: number; payload: Uint8Array } | undefined {
    if (data.byteLength < 4) return

    const channel = data.getUint8(0)
    const msgId = data.getUint8(1)
    const totalSegments = data.getUint8(2)
    const segIdx = data.getUint8(3)
    if (totalSegments === 0 || segIdx >= totalSegments) return

    const chunk = new Uint8Array(data.buffer, data.byteOffset + 4, data.byteLength - 4)
    const key = (channel << 8) | msgId

    let entry = this.active.get(key)
    if (!entry) {
      entry = { chunks: new Array(totalSegments).fill(undefined), missing: totalSegments, time: Date.now() }
      this.active.set(key, entry)
    }
    if (entry.chunks.length !== totalSegments) {
      entry.chunks = new Array(totalSegments).fill(undefined)
      entry.missing = totalSegments
    }

    if (entry.chunks[segIdx] === undefined) entry.missing--
    entry.chunks[segIdx] = chunk
    entry.time = Date.now()

    if (entry.missing === 0) {
      const full = new Uint8Array(entry.chunks.reduce((s, c) => s + (c?.length ?? 0), 0))
      let offset = 0
      for (const c of entry.chunks) {
        if (c) {
          full.set(c, offset)
          offset += c.length
        }
      }
      this.active.delete(key)
      return { channel, payload: full }
    }

    // Cleanup stale entries
    const now = Date.now()
    for (const [k, v] of this.active) {
      if (now - v.time > 1000) this.active.delete(k)
    }
  }
}

const nativeBleInit = {
  status: 'disconnected' as AthenaStatus,
  voltage: undefined as string | undefined,
  deviceId: undefined as string | undefined,
  uartMsgId: 0,
  requestId: 0,
  pendingRequests: new Map<number, { resolve: (value: any) => void; timer: ReturnType<typeof setTimeout> }>(),
  dongleId: undefined as string | undefined,
  assembler: new ChunkAssembler(),
  streamData: undefined as Record<string, unknown> | undefined,
}
const useNativeBleState = create<ZustandType<typeof nativeBleInit>>((set) => ({ set, ...nativeBleInit }))

const getLastDeviceId = (dongleId: string): string | null => localStorage.getItem(`ble_device_${dongleId}`)
const setLastDeviceId = (dongleId: string, deviceId: string) => localStorage.setItem(`ble_device_${dongleId}`, deviceId)

export const useNativeBle = () => {
  const { dongleId } = useRouteParams()
  const usingAsiusPilot = useSettings((x) => x.usingAsiusPilot)
  const { status, voltage, set } = useNativeBleState()

  const sendUart = useCallback(
    async (channel: number, data: Record<string, unknown>) => {
      const { deviceId, uartMsgId } = useNativeBleState.getState()
      if (!deviceId) return

      const payload = new Uint8Array(encode(data))
      const id = (uartMsgId % 255) + 1
      set({ uartMsgId: id })

      const totalSegments = Math.ceil(payload.length / CHUNK_SIZE)
      for (let i = 0; i < totalSegments; i++) {
        const offset = i * CHUNK_SIZE
        const chunk = payload.slice(offset, offset + CHUNK_SIZE)
        const header = new Uint8Array([channel, id, totalSegments, i])
        const full = new Uint8Array(4 + chunk.length)
        full.set(header, 0)
        full.set(chunk, 4)
        await BleClient.writeWithoutResponse(deviceId, UART_SERVICE_UUID, UART_RX_UUID, new DataView(full.buffer))
      }
    },
    [set],
  )

  const call = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
      const { deviceId, requestId, pendingRequests } = useNativeBleState.getState()
      if (!deviceId) return undefined

      const id = (requestId % 65535) + 1
      set({ requestId: id })

      const responsePromise = new Promise<AthenaResponse<T> | undefined>((resolve) => {
        const timer = setTimeout(() => {
          pendingRequests.delete(id)
          resolve(undefined)
        }, REQUEST_TIMEOUT)
        pendingRequests.set(id, { resolve, timer })
      })

      await sendUart(CHANNEL_SETTINGS, { msgType: method, data: params, id })
      return await responsePromise
    },
    [set, sendUart],
  )

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      try {
        set({ status: 'connecting', deviceId })

        await BleClient.connect(deviceId, () => {
          set({ status: 'disconnected', deviceId: undefined })
        })

        const { assembler } = useNativeBleState.getState()

        await BleClient.startNotifications(deviceId, UART_SERVICE_UUID, UART_TX_UUID, (value) => {
          const result = assembler.feed(value)
          if (!result) return

          try {
            const msg = decode(result.payload) as Record<string, unknown>
            console.log(`BLE RX [ch=${result.channel}]:`, msg)

            if (msg.msgType === 'heartbeat') {
              set({ streamData: msg })
            } else if (typeof msg.id === 'number') {
              const { pendingRequests } = useNativeBleState.getState()
              const pending = pendingRequests.get(msg.id)
              if (pending) {
                clearTimeout(pending.timer)
                pendingRequests.delete(msg.id)
                pending.resolve(msg.error ? undefined : (msg.data ?? msg))
              }
            }
          } catch (e) {
            console.error('BLE decode error:', e)
          }
        })

        setLastDeviceId(dongleId, deviceId)
        set({ status: 'connected' })
        console.log('BLE connected via Nordic UART')
      } catch (e) {
        set({ status: 'disconnected', deviceId: undefined })
        console.error(e)
      }
    },
    [dongleId, set],
  )

  const connect = useCallback(async () => {
    try {
      await BleClient.initialize({ androidNeverForLocation: true })
      set({ status: 'connecting' })

      const device = await BleClient.requestDevice({
        services: [UART_SERVICE_UUID],
      })

      console.log('Selected device:', device.name, device.deviceId)
      await connectToDevice(device.deviceId)
    } catch (e) {
      set({ status: 'disconnected' })
      console.error('BLE connect error:', e)
    }
  }, [connectToDevice, set])

  const autoConnect = useCallback(async () => {
    try {
      await BleClient.initialize({ androidNeverForLocation: true })
      set({ status: 'connecting' })

      // Try saved device first
      const savedDeviceId = getLastDeviceId(dongleId)
      if (savedDeviceId) {
        try {
          await connectToDevice(savedDeviceId)
          return
        } catch {
          console.log('Saved device not available, scanning...')
        }
      }

      // Check already connected devices
      const connectedDevices = await BleClient.getConnectedDevices([UART_SERVICE_UUID])
      const device = connectedDevices.find((d) => d.name?.startsWith('asius-'))
      if (device) {
        await connectToDevice(device.deviceId)
        return
      }

      // Scan for nearby devices
      let foundDevice: { deviceId: string; name?: string } | undefined
      await BleClient.requestLEScan({ services: [UART_SERVICE_UUID] }, (result) => {
        if (result.device.name?.startsWith('asius-')) {
          foundDevice = result.device
        }
      })

      await new Promise((r) => setTimeout(r, 3000))
      await BleClient.stopLEScan()

      if (foundDevice) {
        console.log('Found device via scan:', foundDevice.name)
        await connectToDevice(foundDevice.deviceId)
        return
      }

      set({ status: 'disconnected' })
    } catch (e) {
      console.error('BLE auto-connect failed', e)
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
    set({ status: 'disconnected', deviceId: undefined, dongleId: undefined, streamData: undefined })
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
      type: 'ble' as const,
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
