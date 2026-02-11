import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { LoaderIcon, PinOffIcon } from 'lucide-react'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useSettings, PinnedSignal } from '../../hooks/useSettings'
import { decodeSignal, formatSignalValue } from '../route/cabana/dbc-parser'
import { cn, ZustandType } from '../../../../shared/helpers'

type LiveSignalData = {
  address: number
  src: number
  lastData: Uint8Array
}

const init = { signals: new Map<string, LiveSignalData>() }
const useLiveSignals = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const useLiveCanData = () => {
  const set = useLiveSignals((s) => s.set)
  const signalsRef = useRef<Map<string, LiveSignalData>>(new Map())
  const lastUpdateRef = useRef<number>(0)

  const { status, dataChannelRefs } = useWebRTC({
    bridgeServicesOut: ['can'],
    cameras: [],
    dataChannels: ['data'],
  })

  useEffect(() => {
    const checkChannel = () => {
      const channel = dataChannelRefs.current.get('data')
      if (!channel) return false

      channel.onmessage = async (e) => {
        try {
          const text = e.data instanceof ArrayBuffer ? new TextDecoder().decode(e.data) : e.data instanceof Blob ? await e.data.text() : e.data
          const msg = JSON.parse(text)

          if (msg.type !== 'can' || !Array.isArray(msg.data)) return

          for (const frame of msg.data) {
            const key = `${frame.address}-${frame.src}`
            const data = base64ToUint8Array(frame.dat)
            signalsRef.current.set(key, {
              address: frame.address,
              src: frame.src,
              lastData: data,
            })
          }

          const now = Date.now()
          if (now - lastUpdateRef.current >= 100) {
            lastUpdateRef.current = now
            set({ signals: new Map(signalsRef.current) })
          }
        } catch (err) {
          console.error('Error parsing CAN message:', err)
        }
      }

      return true
    }

    if (!checkChannel()) {
      const interval = setInterval(() => {
        if (checkChannel()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [dataChannelRefs, set])

  return { status }
}

const SignalCard = ({ pinned, onUnpin }: { pinned: PinnedSignal; onUnpin: () => void }) => {
  const signals = useLiveSignals((s) => s.signals)

  const key = `${pinned.messageAddress}-${pinned.messageSrc}`
  const data = signals.get(key)

  let displayValue = '--'

  // Convert PinnedSignal to DBCSignal-compatible object for decoding
  if (data && pinned.startBit !== undefined) {
    const dbcSignal = {
      name: pinned.signalName,
      startBit: pinned.startBit,
      size: pinned.size,
      factor: pinned.factor,
      offset: pinned.offset,
      isLittleEndian: pinned.isLittleEndian,
      isSigned: pinned.isSigned,
      unit: pinned.unit,
      min: pinned.min,
      max: pinned.max,
    }
    const value = decodeSignal(data.lastData, dbcSignal)
    displayValue = formatSignalValue(value, dbcSignal)
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-1 relative group">
      <button
        onClick={onUnpin}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
        title="Unpin signal"
      >
        <PinOffIcon className="w-4 h-4" />
      </button>
      <div className="text-xs text-white/40">{pinned.messageName || `0x${pinned.messageAddress.toString(16).toUpperCase()}`}</div>
      <div className="text-sm text-white/70">{pinned.signalName}</div>
      <div className="text-2xl font-mono font-bold tabular-nums">
        {displayValue}
        {pinned.unit && !displayValue.includes(pinned.unit) && <span className="text-sm text-white/40 ml-1">{pinned.unit}</span>}
      </div>
    </div>
  )
}

export const LiveData = () => {
  const { status } = useLiveCanData()
  const pinnedSignals = useSettings((s) => s.pinnedSignals)
  const setSettings = useSettings((s) => s.set)

  const handleUnpin = (pinned: PinnedSignal) => {
    setSettings({
      pinnedSignals: pinnedSignals.filter(
        (p) => !(p.messageAddress === pinned.messageAddress && p.messageSrc === pinned.messageSrc && p.signalName === pinned.signalName),
      ),
    })
  }

  if (pinnedSignals.length === 0) {
    return (
      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
        <span className="text-white/50 text-sm">No pinned signals</span>
        <span className="text-white/30 text-xs">Pin signals from Live CAN view</span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col">
      {status && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10">
          <LoaderIcon className="w-6 h-6 animate-spin text-white/40" />
          <span className="text-sm text-white/50">{status}</span>
        </div>
      )}
      <div className={cn('flex-1 p-4 overflow-auto', status && 'opacity-30')}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-20">
          {pinnedSignals.map((pinned) => (
            <SignalCard key={`${pinned.messageAddress}-${pinned.messageSrc}-${pinned.signalName}`} pinned={pinned} onUnpin={() => handleUnpin(pinned)} />
          ))}
        </div>
      </div>
    </div>
  )
}
