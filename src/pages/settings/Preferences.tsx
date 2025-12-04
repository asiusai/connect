import clsx from 'clsx'
import { useState } from 'react'
import { isImperial, use12hTime } from '../../utils/format'
import { storage } from '../../utils/helpers'

export const Preferences = () => {
  const [imperial, setImperial] = useState(isImperial())
  const [is12h, setIs12h] = useState(use12hTime())
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Preferences</h2>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Imperial units</span>
          <span className="text-xs text-white/60">Use miles instead of kilometers</span>
        </div>
        <div
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', imperial ? 'bg-white' : 'bg-white/10')}
          onClick={() => {
            const newVal = !imperial
            setImperial(newVal)
            storage.set('imperial', String(newVal))
          }}
        >
          <div
            className={clsx(
              'w-5 h-5 rounded-full shadow-sm transition-all absolute top-1',
              imperial ? 'bg-black left-[24px]' : 'bg-white left-1',
            )}
          />
        </div>
      </div>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">12-hour clock</span>
          <span className="text-xs text-white/60">Use 12h (AM/PM) format instead of 24h</span>
        </div>
        <div
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', is12h ? 'bg-white' : 'bg-white/10')}
          onClick={() => {
            const newVal = !is12h
            setIs12h(newVal)
            storage.set('12hTime', String(newVal))
          }}
        >
          <div
            className={clsx(
              'w-5 h-5 rounded-full shadow-sm transition-all absolute top-1',
              is12h ? 'bg-black left-[24px]' : 'bg-white left-1',
            )}
          />
        </div>
      </div>
    </div>
  )
}
