import clsx from 'clsx'
import { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'

export const Select = <T extends string>({
  value,
  onChange,
  options,
  className,
  style,
}: {
  options: { value: T; label: ReactNode; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  className?: string
  style?: CSSProperties
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as T)}
        className={clsx(
          'appearance-none bg-background-alt text-sm font-medium pl-3 pr-8 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-white/20 transition-colors cursor-pointer',
          className,
        )}
        style={style}
      >
        {options.map(({ value, label, disabled }) => (
          <option key={value} value={value} disabled={disabled}>
            {label}
          </option>
        ))}
      </select>
      <Icon
        name="keyboard_arrow_down"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none text-xl"
      />
    </div>
  )
}
