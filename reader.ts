import { Reader } from './log-reader/src/decompress'
import fs from 'fs'

const readStream = fs.createReadStream('qlog')
const reader = Reader(readStream)

const set = new Set<string>()
reader((obj: any) => {
  if (obj.Valid !== true) return
  for (const key of Object.keys(obj)) {
    if (key === 'Valid' || key === 'LogMonoTime') continue
    if (set.has(key)) continue

    console.log(key, obj[key])
    set.add(key)
  }
})
