import { PlayerRef } from '@remotion/player'
import { RefObject } from 'react'
import { create } from 'zustand'
import { ZustandType } from '../../../shared/helpers'
import { PreviewProps } from '../../../shared/types'

type RenderState = { status: 'idle' } | { status: 'rendering'; progress: number } | { status: 'done' } | { status: 'error'; message: string }

const initial = {
  playerRef: null as RefObject<PlayerRef | null> | null,
  props: null as PreviewProps | null,
  frame: 0,
  playing: true,
  muted: true,
  fullscreen: false,
  duration: 0,
  selection: { start: 0, end: 0 },
  renderState: { status: 'idle' } as RenderState,
  renderAbortController: null as AbortController | null,
}

export const usePlayerStore = create<ZustandType<typeof initial>>((set) => ({ ...initial, set }))
