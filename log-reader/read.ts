import { Reader } from './src/index'
import fs from 'fs'

const readStream = fs.createReadStream('rlog')
const reader = Reader(readStream)

reader((obj: any) => {
  if ('DrivingModelData' in obj) console.log(obj.DrivingModelData.Action.ShouldStop)
})
