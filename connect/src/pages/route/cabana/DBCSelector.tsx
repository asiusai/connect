import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../../../shared/helpers'
import { useCabanaStore, selectDbcFile } from './store'

export const DbcSelector = () => {
  const [open, setOpen] = useState(false)
  const selectedFile = useCabanaStore((s) => s.selectedDbcFile)
  const suggestedFiles = useCabanaStore((s) => s.suggestedDbcFiles)
  const availableFiles = useCabanaStore((s) => s.availableDbcFiles)
  const loading = useCabanaStore((s) => s.dbcLoading)
  const carFingerprint = useCabanaStore((s) => s.carFingerprint)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">
        <span className="text-white/60">DBC:</span>
        <span className={cn('font-medium', loading && 'opacity-50')}>{selectedFile || 'None'}</span>
        <ChevronDownIcon className="w-4 h-4 text-white/40" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 max-h-80 overflow-auto bg-[#1e1e1e]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl">
          {carFingerprint && <div className="px-3 py-2 border-b border-white/10 text-xs text-white/40">Detected: {carFingerprint}</div>}

          {suggestedFiles.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-white/40 font-medium">Suggested</div>
              {suggestedFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => {
                    selectDbcFile(file)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors',
                    selectedFile === file && 'bg-white/10 text-green-400',
                  )}
                >
                  {file}
                </button>
              ))}
              <div className="border-t border-white/10" />
            </>
          )}

          <div className="px-3 py-1.5 text-xs text-white/40 font-medium">All DBC Files</div>
          {availableFiles.map((file) => (
            <button
              key={file}
              onClick={() => {
                selectDbcFile(file)
                setOpen(false)
              }}
              className={cn('w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors', selectedFile === file && 'bg-white/10 text-green-400')}
            >
              {file}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
