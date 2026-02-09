import { useAsyncEffect } from '../../../hooks'
import { parseDBC } from './dbc-parser'
import { fetchDbcFile, getDbcFilesForFingerprint } from './dbc-files'
import { useCabanaStore } from './store'

export const useDbc = () => {
  const carFingerprint = useCabanaStore((s) => s.carFingerprint)
  const selectedDbcFile = useCabanaStore((s) => s.selectedDbcFile)
  const set = useCabanaStore((s) => s.set)

  // Get suggested files based on fingerprint
  const suggestedFiles = carFingerprint ? getDbcFilesForFingerprint(carFingerprint) : []

  // Load DBC file when selected
  useAsyncEffect(async () => {
    if (!selectedDbcFile) {
      set({ dbc: undefined })
      return
    }

    set({ dbcLoading: true, dbcError: undefined })

    try {
      const content = await fetchDbcFile(selectedDbcFile)
      const parsed = parseDBC(content, selectedDbcFile)
      set({ dbc: parsed })
    } catch (err) {
      set({ dbcError: err instanceof Error ? err.message : 'Failed to load DBC file', dbc: undefined })
    } finally {
      set({ dbcLoading: false })
    }
  }, [selectedDbcFile, set])

  // Auto-select first suggested file if none selected
  useAsyncEffect(async () => {
    if (!selectedDbcFile && suggestedFiles.length > 0) {
      set({ selectedDbcFile: suggestedFiles[0], suggestedDbcFiles: suggestedFiles })
    }
  }, [suggestedFiles, selectedDbcFile, set])
}
