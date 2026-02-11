import { ChevronDownIcon, UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../../../../../shared/helpers'
import { useCabanaStore, selectDbcFile, loadCustomDbc } from './store'
import { parseDBC } from './dbc-parser'

export const DbcSelector = () => {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedFile = useCabanaStore((s) => s.selectedDbcFile)
  const suggestedFiles = useCabanaStore((s) => s.suggestedDbcFiles)
  const availableFiles = useCabanaStore((s) => s.availableDbcFiles)
  const loading = useCabanaStore((s) => s.dbcLoading)
  const carFingerprint = useCabanaStore((s) => s.carFingerprint)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const dbc = parseDBC(content, file.name)
        loadCustomDbc(dbc)
        setOpen(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" accept=".dbc" onChange={handleFileUpload} className="hidden" />
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors">
        <span className="text-white/60">DBC:</span>
        <span className={cn('font-medium', loading && 'opacity-50')}>{selectedFile || 'None'}</span>
        <ChevronDownIcon className="w-4 h-4 text-white/40" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-64 max-h-80 overflow-auto bg-[#1e1e1e]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl">
          {carFingerprint && <div className="px-3 py-2 border-b border-white/10 text-xs text-white/40">Detected: {carFingerprint}</div>}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-white/10"
          >
            <UploadIcon className="w-4 h-4 text-white/40" />
            <span>Upload DBC file...</span>
          </button>

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
