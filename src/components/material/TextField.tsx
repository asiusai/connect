import clsx from 'clsx'
import { useState } from 'react'

type TextFieldProps = {
  className?: string
  label?: string
  helperText?: string
  error?: string
  value: string
  disabled?: boolean
  id?: string
  onChange: (value: string) => void
}

const stateColors = {
  base: {
    label: 'text-background-alt-x',
    indicator: 'bg-background-alt-x',
    input: 'text-background-x caret-primary',
    helper: 'text-background-alt-x',
  },
  hover: {
    indicator: 'bg-background-x',
  },
  focus: {
    label: 'text-primary',
    indicator: 'bg-primary',
  },
  error: {
    label: 'text-error',
    indicator: 'bg-error',
    input: 'text-background-x caret-error',
    helper: 'text-error',
  },
  errorHover: {
    label: 'text-error-alt-x',
    indicator: 'bg-error-alt-x',
  },
}

export const TextField = ({ className, label, helperText, error, value, onChange, ...props }: TextFieldProps) => {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const labelFloating = focused || value.length > 0

  const stateStyle = { ...stateColors.base }
  if (!props.disabled) {
    if (error) {
      Object.assign(stateStyle, stateColors.error)
      if (hovered) Object.assign(stateStyle, stateColors.errorHover)
    } else if (focused) Object.assign(stateStyle, stateColors.focus)
    else if (hovered) Object.assign(stateStyle, stateColors.hover)
  }

  return (
    <div className={clsx('flex flex-col', className)}>
      <div
        className={clsx(
          'relative flex rounded-t-xs min-h-[56px] bg-white/5 rounded-md',
          hovered && !props.disabled && 'after:absolute after:inset-0 after:bg-background-x after:opacity-[0.08] after:pointer-events-none',
          props.disabled && 'opacity-40',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Input and label container */}
        <div className="relative flex-1">
          {label && (
            <label
              className={clsx(
                'absolute pointer-events-none transition-all text-base left-4',
                labelFloating ? 'text-xs top-2' : 'top-1/2 -translate-y-1/2',
                stateStyle.label,
              )}
              htmlFor={props.id}
            >
              {label}
            </label>
          )}

          <input
            {...props}
            className={clsx(
              'w-full bg-transparent outline-none px-4 py-4 text-base z-10',
              'select-text selection:bg-primary-alt',
              stateStyle.input,
              label && labelFloating && 'pt-6 pb-2',
            )}
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        {/* Active indicator line */}
        <div className={clsx('absolute bottom-0 left-0 w-full transition-all', focused ? 'h-[2px]' : 'h-[1px]', stateStyle.indicator)} />
      </div>

      {/* Helper text or error */}
      {(helperText || error) && (
        <label className={clsx('text-xs px-4 pt-1', stateStyle.helper, props.disabled && 'opacity-40')} htmlFor={props.id}>
          {error || helperText}
        </label>
      )}
    </div>
  )
}
