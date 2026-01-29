import { useSettings } from '../../hooks/useSettings'
import { env } from '../../../../shared/env'
import { cn } from '../../../../shared/helpers'

const ToggleSwitch = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div
    className={cn('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', value ? 'bg-white' : 'bg-white/10')}
    onClick={() => onChange(!value)}
  >
    <div className={cn('w-5 h-5 rounded-full shadow-sm transition-all absolute top-1', value ? 'bg-black left-6' : 'bg-white left-1')} />
  </div>
)

export const Preferences = () => {
  const { unitFormat, timeFormat, usingAsiusPilot, set } = useSettings()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Preferences</h2>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Imperial units</span>
          <span className="text-xs text-white/60">Use miles instead of kilometers</span>
        </div>
        <ToggleSwitch value={unitFormat === 'imperial'} onChange={(v) => set({ unitFormat: v ? 'imperial' : 'metric' })} />
      </div>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">12-hour clock</span>
          <span className="text-xs text-white/60">Use 12h (AM/PM) format instead of 24h</span>
        </div>
        <ToggleSwitch value={timeFormat === '12h'} onChange={(v) => set({ timeFormat: v ? '12h' : '24h' })} />
      </div>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Using AsiusPilot</span>
          <span className="text-xs text-white/60">Enable if your device runs AsiusPilot (required for all features)</span>
        </div>
        <ToggleSwitch value={!!usingAsiusPilot} onChange={(usingAsiusPilot) => set({ usingAsiusPilot })} />
      </div>
    </div>
  )
}
