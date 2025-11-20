import Reader from './log-reader/index.js'
import fs from 'fs'

var readStream = fs.createReadStream('qlog')
var reader = Reader(readStream)

const set = new Set<string>()
await reader((obj: any) => {
  if (!obj.Valid) return
  for (const key of Object.keys(obj)) {
    if (key === 'Valid' || key === 'LogMonoTime') continue
    set.add(key)
  }
  console.log(set)
})
console.log(set)
