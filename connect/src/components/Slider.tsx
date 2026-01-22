import { cn } from '../../../shared/helpers'

export const Slider = <Key extends string>({ options, value, onChange }: { options: Record<Key, string>; value: Key; onChange: (x: Key) => void }) => {
  const keys = Object.keys(options) as Key[]

  return (
    <div className="flex bg-background-alt rounded-lg p-1">
      {keys.map((key) => (
        <button
          key={key}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            value === key ? 'bg-white text-black shadow-sm' : 'text-background-alt-x hover:text-white',
          )}
          onClick={() => onChange(key)}
        >
          {options[key]}
        </button>
      ))}
    </div>
  )
}
