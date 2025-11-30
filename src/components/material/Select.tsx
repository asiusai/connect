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
          'relative appearance-none bg-background-alt py-1.5 pl-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-white/5 cursor-pointer',
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
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-background-alt-x">
        <Icon name="keyboard_arrow_down" size="20" />
      </div>
    </div>
  )
}
