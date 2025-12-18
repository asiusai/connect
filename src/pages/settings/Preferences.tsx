import clsx from 'clsx'
import { useStorage } from '../../utils/storage'

export const Preferences = () => {
  const [unitFormat, setUnitFormat] = useStorage('unitFormat')
  const [timeFormat, setTimeFormat] = useStorage('timeFormat')
  const [showLivePage, setShowLivePage] = useStorage('showLivePage')

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Preferences</h2>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Imperial units</span>
          <span className="text-xs text-white/60">Use miles instead of kilometers</span>
        </div>
        <div
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', unitFormat === 'imperial' ? 'bg-white' : 'bg-white/10')}
          onClick={() => setUnitFormat(unitFormat === 'imperial' ? 'metric' : 'imperial')}
        >
          <div
            className={clsx(
              'w-5 h-5 rounded-full shadow-sm transition-all absolute top-1',
              unitFormat === 'imperial' ? 'bg-black left-[24px]' : 'bg-white left-1',
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
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', timeFormat === '12h' ? 'bg-white' : 'bg-white/10')}
          onClick={() => setTimeFormat(timeFormat === '12h' ? '24h' : '12h')}
        >
          <div
            className={clsx('w-5 h-5 rounded-full shadow-sm transition-all absolute top-1', timeFormat === '12h' ? 'bg-black left-[24px]' : 'bg-white left-1')}
          />
        </div>
      </div>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Enable live page</span>
          <span className="text-xs text-white/60">
            Works with{' '}
            <a className="text-blue-400" target="_blank" href="https://github.com/karelnagel/sunnypilot/tree/webrtc" rel="noopener">
              sunnypilot/karelnagel/webrtc
            </a>
          </span>
        </div>
        <div
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', showLivePage ? 'bg-white' : 'bg-white/10')}
          onClick={() => setShowLivePage(!showLivePage)}
        >
          <div className={clsx('w-5 h-5 rounded-full shadow-sm transition-all absolute top-1', showLivePage ? 'bg-black left-[24px]' : 'bg-white left-1')} />
        </div>
      </div>
    </div>
  )
}
