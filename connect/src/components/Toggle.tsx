import { cn } from '../../../shared/helpers'

export const Toggle = ({ value, onChange, disabled }: { disabled?: boolean; value: boolean; onChange: (v: boolean) => void }) => {
  return (
    <label className="relative">
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div
        className={cn(
          "w-9 h-5 bg-background-alt peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary ",
          !disabled && 'cursor-pointer',
        )}
      ></div>
    </label>
  )
}
