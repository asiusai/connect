export const readSize = (buf: Buffer, offset: number = 0) => {
  if (offset + 8 >= buf.byteLength) return null

  const segments = buf.readUInt32LE(offset) + 1

  let localIndex = 0
  const sizeArr = []
  for (let i = 0; i < segments; ++i) {
    localIndex += 4
    const segSize = buf.readUInt32LE(offset + localIndex)
    sizeArr.push(segSize * 8)
  }

  let size = sizeArr.reduce((memo, val) => memo + val, localIndex)

  // round size to the word boundary, that reduce statement already took into account header size
  size += 8 - (size % 8)

  return size
}

export const readMessage = (buf: Buffer, offset: number = 0) => {
  const size = readSize(buf, offset)

  return buf.slice(offset, offset + size!)
}
