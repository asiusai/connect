import { useState, useMemo } from 'react'
import { PinIcon, PinOffIcon } from 'lucide-react'
import { cn } from '../../../../../shared/helpers'
import { DecodedSignal, CanFrame } from './types'
import { decodeSignal, formatSignalValue, DBCSignal, DBCMessage } from './dbc-parser'
import { useCabanaStore, useSelectedMessage } from './store'
import { useSettings } from '../../../hooks/useSettings'

const toHex = (n: number, pad = 3) => '0x' + n.toString(16).toUpperCase().padStart(pad, '0')

const bytesToHex = (data: Uint8Array) =>
  Array.from(data)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')

const formatTimestamp = (ms: number) => {
  const totalMs = Math.floor(ms)
  const seconds = Math.floor(totalMs / 1000)
  const millis = totalMs % 1000
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}

// Generate distinct colors for signals (matching Cabana style)
const SIGNAL_COLORS = [
  { bg: 'rgba(239, 68, 68, 0.6)', text: 'rgb(252, 165, 165)' }, // red
  { bg: 'rgba(59, 130, 246, 0.6)', text: 'rgb(147, 197, 253)' }, // blue
  { bg: 'rgba(16, 185, 129, 0.6)', text: 'rgb(110, 231, 183)' }, // green
  { bg: 'rgba(245, 158, 11, 0.6)', text: 'rgb(252, 211, 77)' }, // amber
  { bg: 'rgba(139, 92, 246, 0.6)', text: 'rgb(196, 181, 253)' }, // purple
  { bg: 'rgba(236, 72, 153, 0.6)', text: 'rgb(249, 168, 212)' }, // pink
  { bg: 'rgba(6, 182, 212, 0.6)', text: 'rgb(103, 232, 249)' }, // cyan
  { bg: 'rgba(34, 197, 94, 0.6)', text: 'rgb(134, 239, 172)' }, // emerald
]

// Get bits covered by a signal
const getSignalBits = (signal: DBCSignal): number[] => {
  const bits: number[] = []
  if (signal.isLittleEndian) {
    for (let i = 0; i < signal.size; i++) {
      bits.push(signal.startBit + i)
    }
  } else {
    let currentBit = signal.startBit
    for (let i = 0; i < signal.size; i++) {
      bits.push(currentBit)
      const bitInByte = currentBit % 8
      if (bitInByte === 0) {
        currentBit = Math.floor(currentBit / 8 + 1) * 8 + 7
      } else {
        currentBit--
      }
    }
  }
  return bits
}

// Decode all signals from a frame
const decodeFrameSignals = (frame: CanFrame, dbcMsg: DBCMessage): { name: string; value: string }[] => {
  return dbcMsg.signals.map((sig) => {
    const value = decodeSignal(frame.data, sig)
    return {
      name: sig.name,
      value: formatSignalValue(value, sig),
    }
  })
}

type Tab = 'signals' | 'history'

type Props = {
  className?: string
}

export const MessageDetail = ({ className }: Props) => {
  const message = useSelectedMessage()
  const dbc = useCabanaStore((s) => s.dbc)
  const pinnedSignals = useSettings((s) => s.pinnedSignals)
  const setSettings = useSettings((s) => s.set)

  const dbcMessage = message ? dbc?.messages.get(message.address) : undefined
  const hasSignals = dbcMessage && dbcMessage.signals.length > 0

  const [activeTab, setActiveTab] = useState<Tab>('signals')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'signals', label: 'Signals' },
    { key: 'history', label: 'History' },
  ]

  // Decode signals and create bit-to-signal mapping
  const { decodedSignals, bitToSignal } = useMemo(() => {
    if (!dbcMessage || !message) return { decodedSignals: [] as DecodedSignal[], bitToSignal: new Map<number, number>() }

    const bitMap = new Map<number, number>()
    const decoded = dbcMessage.signals.map((sig, idx) => {
      const value = decodeSignal(message.lastData, sig)
      const bits = getSignalBits(sig)
      for (const bit of bits) {
        bitMap.set(bit, idx)
      }
      return {
        name: sig.name,
        value,
        unit: sig.unit,
        min: sig.min,
        max: sig.max,
        formattedValue: formatSignalValue(value, sig),
      }
    })

    return { decodedSignals: decoded, bitToSignal: bitMap }
  }, [message, dbcMessage])

  const messageName = dbcMessage?.name

  const isPinned = (signalName: string) =>
    pinnedSignals.some((p) => p.messageAddress === message?.address && p.messageSrc === message?.src && p.signalName === signalName)

  const togglePin = (signalName: string) => {
    if (!message) return
    const pinned = isPinned(signalName)
    if (pinned) {
      setSettings({
        pinnedSignals: pinnedSignals.filter((p) => !(p.messageAddress === message.address && p.messageSrc === message.src && p.signalName === signalName)),
      })
    } else {
      setSettings({
        pinnedSignals: [...pinnedSignals, { messageAddress: message.address, messageSrc: message.src, messageName: messageName ?? '', signalName }],
      })
    }
  }

  if (!message)
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black/20 rounded-xl border border-white/5">
        <span className="text-white/40 text-sm">Select a message</span>
      </div>
    )

  // Cabana-style byte matrix view
  const ByteMatrix = () => {
    return (
      <div className="inline-block">
        {/* Header row */}
        <div className="flex items-center gap-px mb-px">
          <div className="w-5 text-[10px] text-white/40 font-mono" />
          {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
            <div key={i} className="w-7 text-center text-[10px] text-white/40 font-mono">
              {i}
            </div>
          ))}
          <div className="w-8 text-[10px] text-white/40 font-mono text-center ml-1" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, byteIdx) => {
          const byte = message.lastData[byteIdx] ?? 0

          // Find primary color for this byte's hex
          let byteColor: (typeof SIGNAL_COLORS)[0] | undefined
          for (let bit = 0; bit < 8; bit++) {
            const globalBit = byteIdx * 8 + bit
            const sigIdx = bitToSignal.get(globalBit)
            if (sigIdx !== undefined) {
              byteColor = SIGNAL_COLORS[sigIdx % SIGNAL_COLORS.length]
              break
            }
          }

          return (
            <div key={byteIdx} className="flex items-center gap-px mb-px">
              {/* Byte index */}
              <div className="w-5 text-[10px] text-white/40 font-mono">{byteIdx}</div>
              {/* Bit values */}
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                const bitValue = (byte >> bitIdx) & 1
                const globalBitIdx = byteIdx * 8 + (7 - bitIdx)
                const signalIdx = bitToSignal.get(globalBitIdx)
                const color = signalIdx !== undefined ? SIGNAL_COLORS[signalIdx % SIGNAL_COLORS.length] : undefined

                return (
                  <div
                    key={bitIdx}
                    className={cn(
                      'w-7 h-6 flex items-center justify-center text-xs font-mono rounded-sm',
                      bitValue ? 'text-white font-medium' : 'text-white/30',
                    )}
                    style={{ backgroundColor: color?.bg || 'rgba(255,255,255,0.08)' }}
                    title={signalIdx !== undefined ? `${decodedSignals[signalIdx]?.name}` : `Byte ${byteIdx}, Bit ${bitIdx}`}
                  >
                    {bitValue}
                  </div>
                )
              })}
              {/* Hex value on right */}
              <div
                className="w-8 font-mono text-xs h-6 flex items-center justify-center rounded-sm ml-1"
                style={{ backgroundColor: byteColor?.bg || 'rgba(255,255,255,0.08)', color: byteColor?.text || 'white' }}
              >
                {byte.toString(16).toUpperCase().padStart(2, '0')}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col bg-black/20 rounded-xl border border-white/5 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 shrink-0">
        <div className="font-mono text-green-400 text-lg">{toHex(message.address)}</div>
        {messageName && <div className="text-sm text-white font-medium">{messageName}</div>}
        <div className="text-sm text-white/40">Bus {message.src}</div>
        <div className="text-sm text-white/40">{message.frequency} Hz</div>
        <div className="flex-1" />
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1 text-sm rounded-lg transition-colors',
                activeTab === tab.key ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 p-4">
        {activeTab === 'signals' && (
          <div className="flex flex-col gap-2 h-full">
            {/* Top: Combined byte matrix view */}
            <div className="shrink-0">
              <ByteMatrix />
            </div>

            {/* Bottom: Signals list */}
            <div className="flex-1 min-w-0 overflow-auto">
              <div className="text-xs text-white/40 mb-2">Signals: {decodedSignals.length}</div>
              {hasSignals ? (
                <div className="space-y-1">
                  {decodedSignals.map((sig, idx) => {
                    const color = SIGNAL_COLORS[idx % SIGNAL_COLORS.length]
                    const pinned = isPinned(sig.name)
                    return (
                      <div key={sig.name} className="flex items-center gap-2 py-0.5 group">
                        <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: color.bg }}>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-white/80 flex-1 truncate">{sig.name}</span>
                        <span className="font-mono text-sm tabular-nums" style={{ color: color.text }}>
                          {sig.formattedValue}
                        </span>
                        {sig.unit && <span className="text-xs text-white/40">{sig.unit}</span>}
                        <button
                          onClick={() => togglePin(sig.name)}
                          className={cn(
                            'p-1 rounded transition-colors',
                            pinned ? 'text-green-400 hover:text-green-300' : 'text-white/30 hover:text-white/60 opacity-0 group-hover:opacity-100',
                          )}
                          title={pinned ? 'Unpin signal' : 'Pin signal'}
                        >
                          {pinned ? <PinOffIcon className="w-3.5 h-3.5" /> : <PinIcon className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-white/40 text-sm">No signals defined. Raw: {bytesToHex(message.lastData)}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="text-xs text-white/40 mb-2">Recent frames (newest first)</div>
            <div className="overflow-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 bg-black/80">
                  <tr>
                    <th className="w-20 px-2 py-1 text-left text-xs font-medium text-white/40">Time</th>
                    {hasSignals ? (
                      dbcMessage!.signals.map((sig, idx) => (
                        <th
                          key={sig.name}
                          className="px-2 py-1 text-right text-xs font-medium truncate max-w-24"
                          style={{ color: SIGNAL_COLORS[idx % SIGNAL_COLORS.length].text }}
                        >
                          {sig.name}
                        </th>
                      ))
                    ) : (
                      <th className="px-2 py-1 text-left text-xs font-medium text-white/40">Data</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...message.recentFrames].reverse().map((frame, i) => {
                    const signals = hasSignals ? decodeFrameSignals(frame, dbcMessage!) : null
                    return (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2 py-1 font-mono text-white/60">{formatTimestamp(frame.timestamp)}</td>
                        {signals ? (
                          signals.map((sig, idx) => (
                            <td
                              key={sig.name}
                              className="px-2 py-1 font-mono text-xs text-right"
                              style={{ color: SIGNAL_COLORS[idx % SIGNAL_COLORS.length].text }}
                            >
                              {sig.value}
                            </td>
                          ))
                        ) : (
                          <td className="px-2 py-1 font-mono text-xs">{bytesToHex(frame.data)}</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
