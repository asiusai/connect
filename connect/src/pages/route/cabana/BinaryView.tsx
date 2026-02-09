import { cn } from '../../../../../shared/helpers'

type Props = {
  data: Uint8Array
  bitChanges: number[]
  maxChanges?: number
}

export const BinaryView = ({ data, bitChanges, maxChanges }: Props) => {
  // Find max changes for normalization if not provided
  const max = maxChanges ?? Math.max(...bitChanges, 1)

  // Build 8x8 grid (8 bytes x 8 bits)
  const rows = []
  for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
    const byte = data[byteIdx] ?? 0
    const bits = []

    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      const bitValue = (byte >> bitIdx) & 1
      const globalBitIdx = byteIdx * 8 + (7 - bitIdx)
      const changeCount = bitChanges[globalBitIdx] || 0
      const intensity = changeCount / max

      bits.push(
        <div
          key={bitIdx}
          className={cn('w-5 h-5 flex items-center justify-center text-[10px] font-mono rounded transition-colors', bitValue ? 'text-white' : 'text-white/30')}
          style={{
            backgroundColor: intensity > 0 ? `rgba(239, 68, 68, ${Math.min(intensity * 0.7, 0.7)})` : 'rgba(255, 255, 255, 0.05)',
          }}
          title={`Byte ${byteIdx}, Bit ${7 - bitIdx} | Changes: ${changeCount}`}
        >
          {bitValue}
        </div>,
      )
    }

    rows.push(
      <div key={byteIdx} className="flex gap-0.5">
        <div className="w-8 text-[10px] text-white/40 font-mono flex items-center">{byteIdx}</div>
        {bits}
      </div>,
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="flex gap-0.5 mb-1">
        <div className="w-8" />
        {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
          <div key={i} className="w-5 text-center text-[10px] text-white/40 font-mono">
            {i}
          </div>
        ))}
      </div>
      {rows}
    </div>
  )
}
