import { useEffect, useRef } from 'react'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useCabanaStore } from '../route/cabana/store'
import { CanFrame, CanMessage } from '../route/cabana/types'

type LiveMessageData = {
  key: string
  address: number
  src: number
  frames: CanFrame[]
  lastTimestamp: number
  bitChanges: number[]
}

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const calculateBitChanges = (prev: Uint8Array, curr: Uint8Array, existing: number[]): number[] => {
  const changes = [...existing]
  const len = Math.min(prev.length, curr.length)
  for (let byteIdx = 0; byteIdx < len; byteIdx++) {
    const diff = prev[byteIdx] ^ curr[byteIdx]
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      if (diff & (1 << bitIdx)) {
        changes[byteIdx * 8 + bitIdx]++
      }
    }
  }
  return changes
}

const computeMessages = (liveData: Map<string, LiveMessageData>): Map<string, CanMessage> => {
  const messages = new Map<string, CanMessage>()

  for (const [key, data] of liveData) {
    const frames = data.frames
    if (frames.length === 0) continue

    const lastFrame = frames[frames.length - 1]

    // Calculate frequency from recent frames
    let frequency = 0
    if (frames.length >= 2) {
      const duration = frames[frames.length - 1].timestamp - frames[0].timestamp
      if (duration > 0) {
        frequency = Math.round(((frames.length - 1) / duration) * 1000)
      }
    }

    messages.set(key, {
      key,
      address: data.address,
      src: data.src,
      count: frames.length,
      frequency,
      lastData: lastFrame.data,
      recentFrames: frames.slice(-20),
      bitChanges: data.bitChanges,
    })
  }

  return messages
}

export const useLiveCan = () => {
  const set = useCabanaStore((s) => s.set)
  const messagesRef = useRef<Map<string, LiveMessageData>>(new Map())
  const startTimeRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const { status, dataChannelRefs } = useWebRTC({
    bridgeServicesOut: ['can'],
    cameras: [],
    dataChannels: ['data'], // Create the "data" channel for messaging
  })

  // Reset store on mount
  useEffect(() => {
    messagesRef.current = new Map()
    startTimeRef.current = null
    set({
      messages: new Map(),
      allFrames: new Map(),
      loading: true,
      selectedKey: undefined,
      carFingerprint: undefined,
    })

    return () => {
      set({ loading: false })
    }
  }, [set])

  // Listen for CAN messages
  useEffect(() => {
    const checkChannel = () => {
      const channel = dataChannelRefs.current.get('data')
      if (!channel) {
        console.log('[LiveCAN] No data channel yet, channels:', [...dataChannelRefs.current.keys()])
        return false
      }

      console.log('[LiveCAN] Data channel found, state:', channel.readyState)

      channel.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          console.log('[LiveCAN] Message received:', msg.type, msg.data?.length || 0)

          // Handle car fingerprint
          if (msg.type === 'carParams' && msg.data?.carFingerprint) {
            set({ carFingerprint: msg.data.carFingerprint })
          }

          if (msg.type !== 'can' || !Array.isArray(msg.data)) return

          const now = Date.now()
          if (startTimeRef.current === null) startTimeRef.current = now

          for (const frame of msg.data) {
            const address = frame.address
            const src = frame.src
            const key = `${address}-${src}`
            const data = base64ToUint8Array(frame.dat)
            const timestamp = now - startTimeRef.current

            const canFrame: CanFrame = {
              address,
              data,
              src,
              timestamp,
            }

            const existing = messagesRef.current.get(key)
            if (existing) {
              // Calculate bit changes
              const lastData = existing.frames[existing.frames.length - 1]?.data
              if (lastData) {
                existing.bitChanges = calculateBitChanges(lastData, data, existing.bitChanges)
              }
              existing.frames.push(canFrame)
              // Keep only last 100 frames for memory
              if (existing.frames.length > 100) {
                existing.frames = existing.frames.slice(-100)
              }
              existing.lastTimestamp = timestamp
            } else {
              messagesRef.current.set(key, {
                key,
                address,
                src,
                frames: [canFrame],
                lastTimestamp: timestamp,
                bitChanges: new Array(64).fill(0),
              })
            }
          }

          // Throttle UI updates to ~10fps
          if (now - lastUpdateRef.current >= 100) {
            lastUpdateRef.current = now
            const messages = computeMessages(messagesRef.current)
            set({ messages, loading: false })
          }
        } catch (err) {
          console.error('Error parsing CAN message:', err)
        }
      }

      return true
    }

    // Check immediately and then poll until channel is available
    if (!checkChannel()) {
      const interval = setInterval(() => {
        if (checkChannel()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [dataChannelRefs, set])

  return { status }
}
