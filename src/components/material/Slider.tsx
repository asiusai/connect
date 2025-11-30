import clsx from 'clsx'

export const Slider = <Key extends string>({
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
    <div className="grid grid-cols-2 bg-background-alt rounded-full p-1 relative isolate">
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
            'py-1.5 px-3 rounded-full text-xs font-medium relative z-10 whitespace-nowrap text-center',
            value === key ? 'text-primary-x' : 'text-background-alt-x hover:text-background-x',
          )}
          onClick={() => onChange(key)}
        >
          {options[key]}
        </button>
      ))}
    </div>
  )
}
