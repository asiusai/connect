import clsx from 'clsx'

export const Toggle = <Key extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<Key, string>
  value: Key
  onChange: (x: Key) => void
}) => {
  const keys = Object.keys(options) as Key[]
  const activeIndex = keys.indexOf(value)

  return (
    <div className="grid grid-cols-2 bg-surface-container-high rounded-full p-1 relative isolate">
      <div
        className="absolute inset-y-1 rounded-full bg-primary shadow-sm transition-all duration-200 ease-out -z-10"
        style={{
          width: `calc((100% - 8px) / ${keys.length})`,
          left: `calc(4px + (100% - 8px) * ${activeIndex} / ${keys.length})`,
        }}
      />
      {keys.map((key) => (
        <button
          key={key}
          className={clsx(
            'py-1.5 px-3 rounded-full text-label-md font-medium transition-colors relative z-10 whitespace-nowrap text-center',
            value === key ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface',
          )}
          onClick={() => onChange(key)}
        >
          {options[key]}
        </button>
      ))}
    </div>
  )
}
