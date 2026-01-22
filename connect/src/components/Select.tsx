import { CSSProperties, ReactNode } from 'react'
import { cn } from '../../../shared/helpers'

export const Select = <T extends string>({
  value,
  onChange,
  options,
  className,
  style,
  disabled,
}: {
  disabled?: boolean
  options: { value: T; label: ReactNode; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  className?: string
  style?: CSSProperties
}) => {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value as T)}
      className={cn(
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
  )
}
