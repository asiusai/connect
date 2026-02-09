import { useMemo, useState } from 'react'
import { cn } from '../../../../../shared/helpers'
import { useCabanaStore } from './store'
import { CanMessage } from './types'

type SortKey = 'address' | 'name' | 'src' | 'frequency' | 'count'
type SortOrder = 'asc' | 'desc'

const toHex = (n: number, pad = 3) => '0x' + n.toString(16).toUpperCase().padStart(pad, '0')

// Colors for bytes that change frequently (like Cabana)
const BYTE_COLORS = [
  'rgba(239, 68, 68, 0.7)', // red
  'rgba(59, 130, 246, 0.7)', // blue
  'rgba(16, 185, 129, 0.7)', // green
  'rgba(245, 158, 11, 0.7)', // amber
  'rgba(139, 92, 246, 0.7)', // purple
  'rgba(236, 72, 153, 0.7)', // pink
  'rgba(6, 182, 212, 0.7)', // cyan
  'rgba(34, 197, 94, 0.7)', // emerald
]

// Render bytes with color highlighting for frequently changing bytes
const BytesDisplay = ({ msg }: { msg: CanMessage }) => {
  return (
    <div className="flex gap-0.5">
      {Array.from(msg.lastData).map((byte, i) => {
        // Sum bit changes for this byte
        let byteChanges = 0
        for (let bit = 0; bit < 8; bit++) {
          byteChanges += msg.bitChanges[i * 8 + bit] || 0
        }
        // Determine if byte changes frequently (relative to total count)
        const changeRatio = msg.count > 0 ? byteChanges / msg.count : 0
        const hasChanges = changeRatio > 0.1 // More than 10% of frames have changes

        return (
          <span
            key={i}
            className="font-mono text-[11px] px-0.5 rounded"
            style={{
              backgroundColor: hasChanges ? BYTE_COLORS[i % BYTE_COLORS.length] : 'transparent',
              color: hasChanges ? 'white' : 'rgba(255,255,255,0.5)',
            }}
          >
            {byte.toString(16).toUpperCase().padStart(2, '0')}
          </span>
        )
      })}
    </div>
  )
}

type Props = {
  className?: string
}

export const MessageList = ({ className }: Props) => {
  const messages = useCabanaStore((s) => s.messages)
  const selectedKey = useCabanaStore((s) => s.selectedKey)
  const loading = useCabanaStore((s) => s.loading)
  const dbc = useCabanaStore((s) => s.dbc)
  const set = useCabanaStore((s) => s.set)

  const [sortKey, setSortKey] = useState<SortKey>('address')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [filter, setFilter] = useState('')

  const sortedMessages = useMemo(() => {
    const arr = Array.from(messages.values())

    // Filter
    const filtered = filter
      ? arr.filter((m) => {
          const hex = toHex(m.address).toLowerCase()
          const decimal = m.address.toString()
          const name = dbc?.messages.get(m.address)?.name?.toLowerCase() || ''
          const f = filter.toLowerCase()
          return hex.includes(f) || decimal.includes(f) || name.includes(f)
        })
      : arr

    // Sort
    return filtered.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'address') cmp = a.address - b.address
      else if (sortKey === 'name') {
        const nameA = dbc?.messages.get(a.address)?.name || ''
        const nameB = dbc?.messages.get(b.address)?.name || ''
        cmp = nameA.localeCompare(nameB)
      } else if (sortKey === 'src') cmp = a.src - b.src
      else if (sortKey === 'frequency') cmp = a.frequency - b.frequency
      else if (sortKey === 'count') cmp = a.count - b.count
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [messages, sortKey, sortOrder, filter, dbc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th className="px-2 py-1.5 text-left text-xs font-medium text-white/60 cursor-pointer hover:text-white/80 select-none" onClick={() => handleSort(keyName)}>
      {label}
      {sortKey === keyName && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className={cn('flex flex-col bg-black/20 rounded-xl border border-white/5 overflow-hidden', className)}>
      <div className="p-2 border-b border-white/5">
        <input
          type="text"
          placeholder="Filter by address or name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-1.5 bg-white/5 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:bg-white/10 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black/40 backdrop-blur-sm z-10">
            <tr>
              <SortHeader label="Name" keyName="name" />
              <SortHeader label="Bus" keyName="src" />
              <SortHeader label="ID" keyName="address" />
              <SortHeader label="Freq" keyName="frequency" />
              <SortHeader label="Count" keyName="count" />
              <th className="px-2 py-1.5 text-left text-xs font-medium text-white/60">Bytes</th>
            </tr>
          </thead>
          <tbody>
            {sortedMessages.map((msg) => {
              const msgName = dbc?.messages.get(msg.address)?.name
              return (
                <tr
                  key={msg.key}
                  onClick={() => set({ selectedKey: msg.key })}
                  className={cn('cursor-pointer hover:bg-white/5 transition-colors', selectedKey === msg.key && 'bg-blue-500/20')}
                >
                  <td className="px-2 py-1 text-white truncate max-w-28" title={msgName || 'untitled'}>
                    {msgName || <span className="text-white/40">untitled</span>}
                  </td>
                  <td className="px-2 py-1 text-white/60">{msg.src}</td>
                  <td className="px-2 py-1 font-mono text-white/60">{toHex(msg.address)}</td>
                  <td className="px-2 py-1 text-white/60">{msg.frequency}</td>
                  <td className="px-2 py-1 text-white/60">{msg.count.toLocaleString()}</td>
                  <td className="px-2 py-1">
                    <BytesDisplay msg={msg} />
                  </td>
                </tr>
              )
            })}
            {sortedMessages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-white/40">
                  {loading ? 'Loading CAN messages...' : 'No messages'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-1.5 border-t border-white/5 text-xs text-white/40">
        {messages.size} messages {loading && '(loading...)'}
      </div>
    </div>
  )
}
