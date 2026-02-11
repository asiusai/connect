import { create } from 'zustand'
import { ZustandType } from '../../../../../shared/helpers'
import { CanMessage, MessageFrames } from './types'
import { DBCFile } from './dbc-parser'
import { AVAILABLE_DBC_FILES } from './dbc-files'

const initial = {
  // Raw CAN data (all frames indexed by message key)
  allFrames: new Map<string, MessageFrames>(),
  loading: false,
  progress: 0,
  carFingerprint: undefined as string | undefined,

  // Current state (computed from allFrames at current time)
  messages: new Map<string, CanMessage>(),
  currentTimeMs: 0,

  // Selection
  selectedKey: undefined as string | undefined,

  // DBC
  dbc: undefined as DBCFile | undefined,
  dbcLoading: false,
  dbcError: undefined as string | undefined,
  selectedDbcFile: undefined as string | undefined,
  suggestedDbcFiles: [] as string[],
  availableDbcFiles: AVAILABLE_DBC_FILES,
}

export const useCabanaStore = create<ZustandType<typeof initial>>((set) => ({ ...initial, set }))

// Action to select DBC file
export const selectDbcFile = (name: string) => useCabanaStore.getState().set({ selectedDbcFile: name })

// Action to load custom DBC file from content
export const loadCustomDbc = (dbc: DBCFile) => {
  useCabanaStore.getState().set({
    dbc,
    selectedDbcFile: dbc.name,
    dbcLoading: false,
    dbcError: undefined,
  })
}

// Helper selectors
export const useSelectedMessage = () => {
  const messages = useCabanaStore((s) => s.messages)
  const selectedKey = useCabanaStore((s) => s.selectedKey)
  return selectedKey ? messages.get(selectedKey) : undefined
}
