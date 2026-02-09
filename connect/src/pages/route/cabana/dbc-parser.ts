// DBC file parser for CAN signal definitions

export type DBCSignal = {
  name: string
  startBit: number
  size: number
  isLittleEndian: boolean
  isSigned: boolean
  factor: number
  offset: number
  min: number
  max: number
  unit: string
}

export type DBCMessage = {
  id: number
  name: string
  size: number
  signals: DBCSignal[]
}

export type DBCFile = {
  name: string
  messages: Map<number, DBCMessage>
}

// Parse a DBC file content string into a DBCFile object
export const parseDBC = (content: string, name: string): DBCFile => {
  const messages = new Map<number, DBCMessage>()
  const lines = content.split('\n')

  let currentMessage: DBCMessage | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Message definition: BO_ <id> <name>: <size> <transmitter>
    const messageMatch = trimmed.match(/^BO_\s+(\d+)\s+(\w+)\s*:\s*(\d+)/)
    if (messageMatch) {
      const id = Number.parseInt(messageMatch[1], 10)
      const messageName = messageMatch[2]
      const size = Number.parseInt(messageMatch[3], 10)

      currentMessage = { id, name: messageName, size, signals: [] }
      messages.set(id, currentMessage)
      continue
    }

    // Signal definition: SG_ <name> : <start>|<size>@<endian><sign> (<factor>,<offset>) [<min>|<max>] "<unit>"
    const signalMatch = trimmed.match(/^SG_\s+(\w+)\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*"([^"]*)"/)
    if (signalMatch && currentMessage) {
      const signal: DBCSignal = {
        name: signalMatch[1],
        startBit: Number.parseInt(signalMatch[2], 10),
        size: Number.parseInt(signalMatch[3], 10),
        isLittleEndian: signalMatch[4] === '1',
        isSigned: signalMatch[5] === '-',
        factor: Number.parseFloat(signalMatch[6]),
        offset: Number.parseFloat(signalMatch[7]),
        min: Number.parseFloat(signalMatch[8]),
        max: Number.parseFloat(signalMatch[9]),
        unit: signalMatch[10],
      }
      currentMessage.signals.push(signal)
    }
  }

  return { name, messages }
}

// Decode a signal value from raw CAN data bytes
export const decodeSignal = (data: Uint8Array, signal: DBCSignal): number => {
  const { startBit, size, isLittleEndian, isSigned, factor, offset } = signal

  let rawValue: number

  if (isLittleEndian) {
    // Little endian (Intel) - start bit is LSB position
    rawValue = extractBitsLE(data, startBit, size)
  } else {
    // Big endian (Motorola) - start bit is MSB position
    rawValue = extractBitsBE(data, startBit, size)
  }

  // Apply sign extension if signed
  if (isSigned && rawValue & (1 << (size - 1))) {
    rawValue = rawValue - (1 << size)
  }

  // Apply factor and offset: physical = raw * factor + offset
  return rawValue * factor + offset
}

// Extract bits in little-endian order
const extractBitsLE = (data: Uint8Array, startBit: number, size: number): number => {
  let value = 0
  for (let i = 0; i < size; i++) {
    const bitPos = startBit + i
    const byteIdx = Math.floor(bitPos / 8)
    const bitIdx = bitPos % 8

    if (byteIdx < data.length) {
      const bit = (data[byteIdx] >> bitIdx) & 1
      value |= bit << i
    }
  }
  return value
}

// Extract bits in big-endian order (Motorola)
const extractBitsBE = (data: Uint8Array, startBit: number, size: number): number => {
  // In Motorola/big-endian DBC format:
  // - startBit is the position of the MSB (most significant bit)
  // - Bit numbering within a byte: bit 7 is MSB, bit 0 is LSB
  // - startBit value = byteIndex * 8 + bitWithinByte (where 7 is MSB)

  let value = 0
  let bitsRead = 0
  let currentBit = startBit

  while (bitsRead < size) {
    const byteIdx = Math.floor(currentBit / 8)
    const bitInByte = currentBit % 8

    if (byteIdx < data.length) {
      const bit = (data[byteIdx] >> bitInByte) & 1
      value = (value << 1) | bit
    }

    bitsRead++

    // Move to next bit (going down within byte, then to next byte)
    if (bitInByte === 0) {
      // Move to MSB of next byte
      currentBit = (byteIdx + 1) * 8 + 7
    } else {
      currentBit--
    }
  }

  return value
}

// Format a decoded value with appropriate precision
export const formatSignalValue = (value: number, signal: DBCSignal): string => {
  // Determine decimal places based on factor
  const factorStr = signal.factor.toString()
  const decimalPlaces = factorStr.includes('.') ? factorStr.split('.')[1].length : 0

  const formatted = value.toFixed(Math.min(decimalPlaces, 4))
  return signal.unit ? `${formatted} ${signal.unit}` : formatted
}
