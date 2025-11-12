export const ToggleButton = (props: { label: string; active: boolean | undefined; onToggle: () => void }) => (
  <button
    className="flex w-full items-center justify-between p-2 transition-colors hover:bg-surface-container-low rounded-md"
    onClick={() => props.onToggle()}
  >
    <span className="text-sm text-on-surface-variant">{props.label}</span>

    {/* Toggle Switch */}
    <div
      className={`relative h-6 w-10 rounded-full border-2 transition-colors ${
        props.active ? 'border-green-300 bg-green-300' : 'border-surface-container-highest'
      }`}
    >
      <div
        className={`absolute top-1 size-3 rounded-full bg-surface-container-highest transition-transform duration-300 ease-in-out ${
          props.active ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </div>
  </button>
)
