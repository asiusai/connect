import clsx from 'clsx'
import { createSignal } from '~/fix'

type TextFieldProps = {
  className?: string
  label?: string
  helperText?: string
  error?: string
  value?: string
  disabled?: boolean
  id?: string
}

const stateColors = {
  base: {
    label: 'text-on-surface-variant',
    indicator: 'bg-on-surface-variant',
    input: 'text-on-surface caret-primary',
    helper: 'text-on-surface-variant',
  },
  hover: {
    indicator: 'bg-on-surface',
  },
  focus: {
    label: 'text-primary',
    indicator: 'bg-primary',
  },
  error: {
    label: 'text-error',
    indicator: 'bg-error',
    input: 'text-on-surface caret-error',
    helper: 'text-error',
  },
  errorHover: {
    label: 'text-on-error-container',
    indicator: 'bg-on-error-container',
  },
}

export const TextField = ({ className, label, helperText, error, value, ...props }: TextFieldProps) => {
  const [focused, setFocused] = createSignal(false)
  const [hovered, setHovered] = createSignal(false)
  const [inputValue, setInputValue] = createSignal(value || '')

  // Keep local value in sync with prop value
  createEffect(() => {
    if (value) setInputValue(value)
  })

  const labelFloating = () => focused() || inputValue()?.length > 0

  const getStateStyle = () => {
    const state = { ...stateColors.base }
    if (!props.disabled) {
      if (error) {
        Object.assign(state, stateColors.error)
        if (hovered()) {
          Object.assign(state, stateColors.errorHover)
        }
      } else if (focused()) {
        Object.assign(state, stateColors.focus)
      } else if (hovered()) {
        Object.assign(state, stateColors.hover)
      }
    }
    return state
  }

  return (
    <div className={clsx('flex flex-col', props.className)}>
      <div
        className={clsx(
          'relative flex rounded-t-xs min-h-[56px] bg-surface-container-highest',
          hovered() && !props.disabled && 'after:absolute after:inset-0 after:bg-on-surface after:opacity-[0.08] after:pointer-events-none',
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
                'absolute pointer-events-none transition-all text-body-lg left-4',
                labelFloating() ? 'text-xs top-2' : 'top-1/2 -translate-y-1/2',
                getStateStyle().label,
              )}
              htmlFor={props.id}
            >
              {label}
            </label>
          )}

          <input
            {...props}
            className={clsx(
              'w-full bg-transparent outline-none px-4 py-4 text-body-lg z-10',
              'select-text selection:bg-primary-container',
              getStateStyle().input,
              label && labelFloating() && 'pt-6 pb-2',
            )}
            value={inputValue()}
            onInput={(e) => setInputValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        {/* Active indicator line */}
        <div
          className={clsx('absolute bottom-0 left-0 w-full transition-all', focused() ? 'h-[2px]' : 'h-[1px]', getStateStyle().indicator)}
        />
      </div>

      {/* Helper text or error */}
      {(helperText || error) && (
        <label className={clsx('text-body-sm px-4 pt-1', getStateStyle().helper, props.disabled && 'opacity-40')} for={props.id}>
          {error || helperText}
        </label>
      )}
    </div>
  )
}
