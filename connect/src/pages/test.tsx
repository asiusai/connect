import { useCallback, useEffect, useRef, useState } from 'react'
import { encode, decode } from '@msgpack/msgpack'

// Nordic UART Service UUIDs
const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const RX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e' // write to device
const TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // notify from device

const CHUNK_SIZE = 240
const CHUNK_TIMEOUT = 1000 // ms
const CHANNEL_SETTINGS = 0x02

type LogEntry = { time: string; dir: 'tx' | 'rx' | 'sys'; msg: string }

/** Reassemble chunked BLE messages */
class ChunkAssembler {
  private active = new Map<number, { chunks: (Uint8Array | undefined)[]; missing: number; time: number }>()
  private onMessage: (channel: number, data: Uint8Array) => void

  constructor(onMessage: (channel: number, data: Uint8Array) => void) {
    this.onMessage = onMessage
  }

  feed(data: DataView) {
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
      this.onMessage(channel, full)
    }

    // Cleanup stale
    const now = Date.now()
    for (const [k, v] of this.active) {
      if (now - v.time > CHUNK_TIMEOUT) this.active.delete(k)
    }
  }
}

/** Split payload into BLE chunks with 4-byte header */
const chunkPayload = (channel: number, msgId: number, payload: Uint8Array): Uint8Array[] => {
  const totalSegments = Math.ceil(payload.length / CHUNK_SIZE)
  const chunks: Uint8Array[] = []
  for (let i = 0; i < totalSegments; i++) {
    const offset = i * CHUNK_SIZE
    const chunk = payload.slice(offset, offset + CHUNK_SIZE)
    const full = new Uint8Array(4 + chunk.length)
    full.set([channel, msgId, totalSegments, i], 0)
    full.set(chunk, 4)
    chunks.push(full)
  }
  return chunks
}

const sendBle = async (rxChar: BluetoothRemoteGATTCharacteristic, msgIdRef: { current: number }, channel: number, data: Record<string, unknown>) => {
  const payload = encode(data)
  const id = (msgIdRef.current % 255) + 1
  msgIdRef.current = id
  const chunks = chunkPayload(channel, id, new Uint8Array(payload))
  for (const chunk of chunks) {
    await rxChar.writeValueWithoutResponse(chunk as unknown as BufferSource)
  }
  return data
}

export const Component = () => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [deviceName, setDeviceName] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [heartbeat, setHeartbeat] = useState<Record<string, unknown>>({})
  const [lastResponse, setLastResponse] = useState<Record<string, unknown>>({})
  const deviceRef = useRef<BluetoothDevice>(null)
  const rxCharRef = useRef<BluetoothRemoteGATTCharacteristic>(null)
  const msgIdRef = useRef(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((dir: LogEntry['dir'], msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 })
    setLogs((prev) => [...prev.slice(-200), { time, dir, msg }])
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const reqIdRef = useRef(0)

  const send = useCallback(
    async (data: Record<string, unknown>) => {
      if (!rxCharRef.current) return
      reqIdRef.current = (reqIdRef.current % 65535) + 1
      const msg = { ...data, id: reqIdRef.current }
      await sendBle(rxCharRef.current, msgIdRef, CHANNEL_SETTINGS, msg)
      addLog('tx', JSON.stringify(msg))
    },
    [addLog],
  )

  const connect = useCallback(async () => {
    try {
      setStatus('connecting')
      addLog('sys', 'Requesting BLE device...')

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [UART_SERVICE] }],
        optionalServices: [UART_SERVICE],
      })

      deviceRef.current = device
      setDeviceName(device.name ?? device.id)
      addLog('sys', `Selected: ${device.name ?? device.id}`)

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected')
        addLog('sys', 'Disconnected')
      })

      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(UART_SERVICE)
      const rxChar = await service.getCharacteristic(RX_CHAR)
      const txChar = await service.getCharacteristic(TX_CHAR)
      rxCharRef.current = rxChar

      const assembler = new ChunkAssembler((_channel, data) => {
        try {
          const msg = decode(data) as Record<string, unknown>
          const msgType = (msg.msgType as string) ?? '?'
          addLog('rx', `${msgType}: ${JSON.stringify(msg)}`)

          if (msgType === 'heartbeat') setHeartbeat(msg)
          else setLastResponse(msg)
        } catch (e) {
          addLog('rx', `decode error: ${e}`)
        }
      })

      await txChar.startNotifications()
      txChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value
        if (value) assembler.feed(value)
      })

      setStatus('connected')
      addLog('sys', 'Connected! Receiving heartbeats...')
    } catch (e) {
      setStatus('disconnected')
      addLog('sys', `Connection error: ${e}`)
    }
  }, [addLog])

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect()
    setStatus('disconnected')
    setHeartbeat({})
    setLastResponse({})
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">asius-bled test</h1>

      {/* Connection */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-600'}`}
        />
        <span className="text-sm text-zinc-400">
          {status === 'connected' ? `Connected: ${deviceName}` : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
        <div className="flex-1" />
        {status === 'disconnected' ? (
          <button onClick={connect} className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-500">
            Connect
          </button>
        ) : (
          <button onClick={disconnect} className="px-4 py-2 bg-zinc-700 rounded text-sm hover:bg-zinc-600">
            Disconnect
          </button>
        )}
      </div>

      {/* Commands */}
      {status === 'connected' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => send({ msgType: 'ping' })} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700">
            Ping
          </button>
          <button onClick={() => send({ msgType: 'sysinfo' })} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700">
            System Info
          </button>
          <button
            onClick={() => send({ msgType: 'softwareInfo' })}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700"
          >
            Software Info
          </button>
          <button onClick={() => send({ msgType: 'wifiScan' })} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700">
            WiFi Scan
          </button>
          <button onClick={() => send({ msgType: 'wifiStatus' })} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700">
            WiFi Status
          </button>
          <button
            onClick={() => {
              const ssid = window.prompt('WiFi SSID')
              if (!ssid) return
              const pw = window.prompt('Password (leave empty for open)')
              send({ msgType: 'wifiConnect', ssid, password: pw || undefined })
            }}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700"
          >
            WiFi Connect
          </button>
          <button
            onClick={() => {
              const user = window.prompt('GitHub username')
              if (user) send({ msgType: 'sshKeys', username: user })
            }}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700"
          >
            SSH Keys
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reboot device?')) send({ msgType: 'reboot' })
            }}
            className="px-3 py-1.5 bg-red-900/50 border border-red-800 rounded text-sm hover:bg-red-900"
          >
            Reboot
          </button>
          <button
            onClick={() => {
              if (window.confirm('Power off device?')) send({ msgType: 'poweroff' })
            }}
            className="px-3 py-1.5 bg-red-900/50 border border-red-800 rounded text-sm hover:bg-red-900"
          >
            Power Off
          </button>
        </div>
      )}

      {/* Heartbeat */}
      {Object.keys(heartbeat).length > 0 && (
        <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">Heartbeat (1 Hz)</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(heartbeat).map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-zinc-500">{k}</span>
                <span className="text-zinc-300 truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last response */}
      {Object.keys(lastResponse).length > 0 && (
        <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">Last Response</h2>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all">{JSON.stringify(lastResponse, null, 2)}</pre>
        </div>
      )}

      {/* Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded p-3 max-h-80 overflow-y-auto font-mono text-xs">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-400">Log</h2>
          {logs.length > 0 && (
            <button onClick={() => setLogs([])} className="text-zinc-600 hover:text-zinc-400 text-xs">
              Clear
            </button>
          )}
        </div>
        {logs.length === 0 && <span className="text-zinc-600">No messages yet</span>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 py-0.5">
            <span className="text-zinc-600 shrink-0">{log.time}</span>
            <span className={`shrink-0 w-6 ${log.dir === 'tx' ? 'text-blue-400' : log.dir === 'rx' ? 'text-green-400' : 'text-yellow-400'}`}>
              {log.dir.toUpperCase()}
            </span>
            <span className="text-zinc-300 break-all">{log.msg}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-zinc-600 space-y-0.5">
        <p>Nordic UART service over BLE, msgpack + 240B chunking</p>
        <p>Device runs asius-bled.py (OS-level systemd service)</p>
      </div>
    </div>
  )
}
