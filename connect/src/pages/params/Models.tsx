import { useDevice } from '../../hooks/useDevice'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { useState } from 'react'
import { toast } from 'sonner'
import { parse } from '../../../../shared/helpers'
import { useRouteParams } from '../../hooks'

type ModelBundle = { index: number; display_name: string; environment: string; runner?: string; generation: number }

const parsePythonDict = <T,>(v: string | null | undefined): T | undefined => {
  if (!v) return undefined
  const json = v
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
  return parse(json)
}

export const Models = () => {
  const { dongleId } = useRouteParams()
  const { save, get, isSaving } = useDevice()
  const [selectedIndex, setSelectedIndex] = useState('')

  const modelsCache = parsePythonDict<{ bundles: ModelBundle[] }>(get('ModelManager_ModelsCache'))
  const activeBundle = parsePythonDict<{ index: number }>(get('ModelManager_ActiveBundle'))

  const models = modelsCache?.bundles.toReversed() ?? []
  const isUsingDefault = activeBundle === null
  const activeIndex = activeBundle?.index?.toString() ?? 'default'
  const selected = selectedIndex || activeIndex
  const selectedModel = selected === 'default' ? null : models.find((m) => m.index.toString() === selected)
  const isAlreadyActive = selected === activeIndex

  const handleSend = async () => {
    if (isAlreadyActive || !dongleId) return
    const params = selected === 'default' ? { ModelManager_ActiveBundle: null } : { ModelManager_DownloadIndex: selectedModel!.index.toString() }
    const res = await save({ ...params, CalibrationParams: '' })
    if (res?.error) toast.error(res.error.data?.message ?? res.error.message)
  }

  if (!models.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <span className="text-lg font-medium">No models available</span>
        <span className="text-sm opacity-60">Model cache not found on device</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider opacity-60">Available Models</label>
          <Select
            value={selected}
            onChange={setSelectedIndex}
            options={[{ value: 'default', label: 'Default model' }, ...models.map((m) => ({ value: m.index.toString(), label: m.display_name }))]}
            className="w-full"
          />
        </div>
        <Button onClick={handleSend} disabled={isSaving || isAlreadyActive} className="w-full">
          {isSaving ? 'Sending...' : isAlreadyActive ? 'Already active' : 'Send to device'}
        </Button>
      </div>

      <div className="flex-1 outline outline-white/10 rounded-lg p-5 bg-white/5">
        <p className="text-xs uppercase tracking-wider opacity-60 mb-2">Selected Model</p>
        {selected === 'default' ? (
          <>
            <h2 className="text-xl font-semibold">Default model</h2>
            <p className="text-sm opacity-60 mt-1">Uses the model bundled with openpilot</p>
            {isUsingDefault && <div className="mt-4 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 inline-block">Active</div>}
          </>
        ) : selectedModel ? (
          <>
            <h2 className="text-xl font-semibold">{selectedModel.display_name}</h2>
            <p className="text-sm opacity-60 mt-1">{selectedModel.environment}</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {selectedModel.runner && (
                <div className="flex justify-between">
                  <span className="opacity-60">Runner:</span>
                  <span>{selectedModel.runner}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-60">Generation:</span>
                <span>{selectedModel.generation}</span>
              </div>
            </div>
            {activeBundle && activeBundle.index === selectedModel.index && (
              <div className="mt-4 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 inline-block">Active</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
