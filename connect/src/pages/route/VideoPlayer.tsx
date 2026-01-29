import { Player, PlayerRef } from '@remotion/player'
import { renderMediaOnWeb } from '@remotion/web-renderer'
import { FPS, HEIGHT, toFrames, toSeconds, WIDTH } from '../../templates/shared'
import { Preview } from '../../templates/Preview'
import { CameraType, FileType, LogType, PreviewProps } from '../../../../shared/types'
import { formatVideoTime, getRouteDurationMs, formatTime, getDateTime } from '../../utils/format'
import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAsyncMemo, useRouteParams } from '../../hooks'
import { useNavigate } from 'react-router-dom'
import { useFiles } from '../../api/queries'
import { api } from '../../api'
import { IconButton } from '../../components/IconButton'
import { cn, getRouteUrl, saveFile } from '../../../../shared/helpers'
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  MaximizeIcon,
  MinimizeIcon,
  MonitorDownIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  SettingsIcon,
  Volume2Icon,
  VolumeOffIcon,
  XIcon,
} from 'lucide-react'
import { getTimelineEvents, TimelineEvent } from '../../utils/derived'
import { useSettings } from '../../hooks/useSettings'
import { Route } from '../../../../shared/types'
import { usePlayerStore } from '../../hooks/usePlayerStore'

const RenderButton = () => {
  const { props, selection, duration, renderState, renderAbortController, set } = usePlayerStore()

  const startRender = async () => {
    if (!props) return
    const controller = new AbortController()
    set({ renderAbortController: controller, renderState: { status: 'rendering', progress: 0 } })

    const startFrame = toFrames(selection.start)
    const endFrame = toFrames(selection.end)
    const selectionFrames = endFrame - startFrame
    const durationInFrames = toFrames(duration)

    try {
      const { getBlob } = await renderMediaOnWeb({
        composition: {
          component: Preview,
          durationInFrames,
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
          id: 'preview',
          defaultProps: props,
        },
        inputProps: props,
        frameRange: [startFrame, endFrame - 1],
        onProgress: ({ renderedFrames }) => set({ renderState: { status: 'rendering', progress: Math.round((renderedFrames / selectionFrames) * 100) } }),
        signal: controller.signal,
        videoBitrate: 'high',
        delayRenderTimeoutInMilliseconds: 120000,
        licenseKey: 'free-license',
      })

      const blob = await getBlob()
      set({ renderState: { status: 'done' } })
      saveFile(blob, `${props.routeName.replace('/', '_')}_${selection.start.toFixed(0)}-${selection.end.toFixed(0)}.mp4`)
    } catch (err) {
      if (controller.signal.aborted) set({ renderState: { status: 'idle' } })
      else set({ renderState: { status: 'error', message: err instanceof Error ? err.message : 'Render failed' } })
    }
  }

  const cancel = () => {
    renderAbortController?.abort()
    set({ renderState: { status: 'idle' } })
  }

  if (renderState.status === 'rendering') {
    return (
      <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
        <MonitorDownIcon className="text-base opacity-70" />
        <span className="text-xs opacity-70 min-w-8">{renderState.progress === 0 ? 'Loading...' : `${renderState.progress}%`}</span>
        <button onClick={cancel} className="text-white/50 hover:text-white/80 transition-colors" title="Cancel render">
          <XIcon className="text-base" />
        </button>
      </div>
    )
  }

  if (renderState.status === 'error') {
    return (
      <div className="flex items-center gap-1 bg-red-500/20 rounded-lg px-2 py-1">
        <CircleAlertIcon className="text-base text-red-400" />
        <span className="text-xs text-red-400 max-w-37.5 truncate" title={renderState.message}>
          {renderState.message}
        </span>
        <button onClick={startRender} className="text-red-400 hover:text-red-300 transition-colors" title="Retry">
          <RefreshCwIcon className="text-base" />
        </button>
      </div>
    )
  }

  return <IconButton title="Render video" icon={MonitorDownIcon} onClick={startRender} />
}

const FILE_LABELS: Record<FileType, string> = {
  cameras: 'Road',
  ecameras: 'Wide',
  dcameras: 'Driver',
  qcameras: 'Quantized',
  logs: 'Full',
  qlogs: 'Quantized',
}

const OptionItem = ({ label, selected, onClick, disabled }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean }) => (
  <div
    className={cn('flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer text-sm transition-colors', disabled && 'opacity-50 pointer-events-none')}
    onClick={onClick}
  >
    <CheckIcon className={cn('text-lg', !selected && 'invisible')} />
    <span>{label}</span>
  </div>
)

const TITLES = { large: 'Large Camera', small: 'Small Camera', log: 'Openpilot UI', rate: 'Playback Speed' }
const SettingsMenu = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [files] = useFiles(routeName, route)
  const [view, setView] = useState<'large' | 'small' | 'log' | 'rate'>()
  const allCameras = CameraType.options.map((x) => ({ value: x, label: FILE_LABELS[x], disabled: !files || !files[x].some(Boolean) }))
  const allLogs = LogType.options.map((x) => ({ value: x, label: FILE_LABELS[x], disabled: !files || !files[x].some(Boolean) }))
  const onBack = () => setView(undefined)

  const title = view ? TITLES[view] : undefined

  const { largeCameraType, smallCameraType, logType, playbackRate, showPath, set } = useSettings()

  return (
    <div className="absolute bottom-[120%] right-0 w-64 bg-[#1e1e1e]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
      {title && (
        <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
          <IconButton title="Back" icon={ArrowLeftIcon} className="text-xl" onClick={onBack} />
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}

      {view === undefined && (
        <>
          {[
            { view: 'large' as const, value: FILE_LABELS[largeCameraType] },
            { view: 'small' as const, value: smallCameraType ? FILE_LABELS[smallCameraType] : 'Hidden' },
            { view: 'log' as const, value: logType ? FILE_LABELS[logType] : 'Hidden' },
            { view: 'rate' as const, value: `${playbackRate}x` },
          ].map(({ view, value }) => (
            <div
              key={view}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer text-sm transition-colors"
              onClick={() => setView(view)}
            >
              <span>{TITLES[view]}</span>
              <div className="flex items-center gap-1 text-white/70">
                <span>{value}</span>
                <ChevronRightIcon />
              </div>
            </div>
          ))}
          {logType && (
            <div
              className="flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer text-sm transition-colors"
              onClick={() => set({ showPath: !showPath })}
            >
              <span>Show Path</span>
              <div className={cn('w-8 h-4 rounded-full transition-colors relative', showPath ? 'bg-green-500' : 'bg-white/30')}>
                <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform', showPath ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
            </div>
          )}
        </>
      )}

      {view === 'large' &&
        allCameras.map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={largeCameraType === option.value}
            disabled={option.disabled}
            onClick={() => {
              set({ largeCameraType: option.value })
              setView(undefined)
            }}
          />
        ))}

      {view === 'small' &&
        [...allCameras, { value: 'none' as const, label: 'Hidden', disabled: false }].map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={(smallCameraType ?? 'none') === option.value}
            disabled={option.disabled}
            onClick={() => {
              set({ smallCameraType: option.value === 'none' ? undefined : option.value })
              setView(undefined)
            }}
          />
        ))}

      {view === 'log' &&
        [...allLogs, { value: 'none' as const, label: 'Hidden', disabled: false }].map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={(logType ?? 'none') === option.value}
            disabled={option.disabled}
            onClick={() => {
              set({ logType: option.value === 'none' ? undefined : option.value })
              setView(undefined)
            }}
          />
        ))}

      {view === 'rate' &&
        [0.25, 0.5, 1, 1.5, 2, 3, 4].map((rate) => (
          <OptionItem
            key={rate}
            label={`${rate}x`}
            selected={playbackRate === rate}
            onClick={() => {
              set({ playbackRate: rate })
              setView(undefined)
            }}
          />
        ))}
    </div>
  )
}

const getEventInfo = (event: TimelineEvent) => {
  if (event.type === 'engaged') return ['Engaged', 'bg-[#32CD32] min-w-[1px]', '1']
  if (event.type === 'overriding') return ['Overriding', 'bg-blue-500 min-w-[1px]', '2']
  if (event.type === 'user_flag') return ['User flag', 'bg-yellow-400 min-w-[2px]', '4']
  if (event.type === 'alert') {
    if (event.alertStatus === 1) return ['User prompt alert', 'bg-orange-500 min-w-[2px]', '3']
    else return ['Critical alert', 'bg-orange-500 min-w-[2px]', '3']
  }
  return ['Unknown', 'bg-gray-500', '0']
}

const Filmstrip = ({ route }: { route: Route }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const imageCount = width ? Math.max(1, Math.round(width / 72)) : 16

  const images = useMemo(() => {
    const totalImages = route.maxqlog + 1
    return Array.from({ length: imageCount }).map((_, i) => {
      const index = Math.min(Math.floor(i * (totalImages / imageCount)), totalImages - 1)
      return {
        src: getRouteUrl(route, index, 'sprite.jpg'),
      }
    })
  }, [route, imageCount])

  return (
    <div
      ref={ref}
      className="absolute inset-0 grid h-full w-full pointer-events-none opacity-60"
      style={{ gridTemplateColumns: `repeat(${imageCount}, minmax(0, 1fr))` }}
    >
      {images.map((img, i) => (
        <div key={i} className="relative w-full h-full overflow-hidden bg-gray-900 border-r border-white/5 last:border-0">
          <img
            src={img.src}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.visibility = 'hidden'
            }}
          />
        </div>
      ))}
    </div>
  )
}

const Timeline = ({ route }: { route?: Route }) => {
  const { playerRef, frame, selection, duration, set } = usePlayerStore()
  const { dongleId, routeId } = useRouteParams()
  const navigate = useNavigate()
  const events = useAsyncMemo(async () => (route ? await getTimelineEvents(route) : undefined), [route])
  const ref = useRef<HTMLDivElement>(null)

  // Sync selection to URL
  const syncSelectionToUrl = (sel: { start: number; end: number }) => {
    if (Math.abs(sel.start) < 1 && Math.abs(sel.end - duration) < 1) navigate(`/${dongleId}/${routeId}`, { replace: true })
    else navigate(`/${dongleId}/${routeId}/${sel.start.toFixed(0)}/${sel.end.toFixed(0)}`, { replace: true })
  }

  const updateMarker = (clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    playerRef?.current?.seekTo(Math.floor((x / rect.width) * toFrames(duration)))
  }

  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null)

  const updateHandle = (clientX: number, handleType?: 'start' | 'end') => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const time = (x / rect.width) * duration

    const activeHandle = handleType || draggingHandle

    if (activeHandle === 'start') {
      const newSelection = { ...selection, start: Math.min(time, selection.end - 1) }
      set({ selection: newSelection })
      syncSelectionToUrl(newSelection)
      playerRef?.current?.seekTo(toFrames(time))
    } else if (activeHandle === 'end') {
      const newSelection = { ...selection, end: Math.max(time, selection.start + 1) }
      set({ selection: newSelection })
      syncSelectionToUrl(newSelection)
      playerRef?.current?.seekTo(toFrames(time))
    }
  }

  const onStart = (handle?: 'start' | 'end') => {
    const onMouseMove = (ev: MouseEvent) => {
      if (handle) updateHandle(ev.clientX, handle)
      else updateMarker(ev.clientX)
    }
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault()
      if (ev.touches.length !== 1) return
      if (handle) updateHandle(ev.touches[0].clientX, handle)
      else updateMarker(ev.touches[0].clientX)
    }
    const onStop = () => {
      setDraggingHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup', onStop)
      window.removeEventListener('touchend', onStop)
      window.removeEventListener('touchcancel', onStop)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mouseup', onStop)
    window.addEventListener('touchend', onStop)
    window.addEventListener('touchcancel', onStop)
  }

  const markerOffset = (toSeconds(frame) / duration) * 100

  return (
    <div
      ref={ref}
      className={cn(
        'relative h-14 w-full bg-black/20 rounded-lg overflow-visible cursor-pointer select-none group', // overflow-visible for time labels
        'ring-1 ring-white/10 hover:ring-white/20 transition-all',
      )}
      onMouseDown={(ev) => {
        if (draggingHandle) return
        updateMarker(ev.clientX)
        onStart()
      }}
      onTouchStart={(ev) => {
        if (ev.touches.length !== 1) return
        if (draggingHandle) return
        updateMarker(ev.touches[0].clientX)
        onStart()
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        {route && <Filmstrip route={route} />}

        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40">
          {events?.map((event, i) => {
            const durationMs = duration * 1000
            const left = (event.route_offset_millis / durationMs) * 100
            const width = event.type === 'user_flag' ? (1000 / durationMs) * 100 : (event.end_route_offset_millis / durationMs) * 100 - left
            const [title, classes, zIndex] = getEventInfo(event)
            return (
              <div
                key={i}
                title={title}
                className={cn('absolute top-0 h-full hover:brightness-150', classes)}
                style={{ left: `${left}%`, width: `${width}%`, zIndex }}
              />
            )
          })}
        </div>

        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none"
          style={{ left: `${markerOffset}%` }}
        >
          <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
        </div>

        <div className="absolute inset-y-0 left-0 bg-black/60 pointer-events-none z-20" style={{ width: `${(selection.start / duration) * 100}%` }} />
        <div className="absolute inset-y-0 right-0 bg-black/60 pointer-events-none z-20" style={{ width: `${100 - (selection.end / duration) * 100}%` }} />

        <div
          className="absolute inset-y-0 border-x-2 border-white/50 z-20 pointer-events-none"
          style={{
            left: `${(selection.start / duration) * 100}%`,
            width: `${((selection.end - selection.start) / duration) * 100}%`,
          }}
        />
      </div>

      {['start', 'end'].map((type) => {
        const isStart = type === 'start'
        const val = isStart ? selection.start : selection.end
        const left = (val / duration) * 100
        const showLabel = val > 0 && val < duration
        if (Number.isNaN(left)) return null
        return (
          <div
            key={type}
            className="absolute top-1 bottom-1 w-4 -ml-2 z-30 cursor-ew-resize flex items-center justify-center group/handle"
            style={{ left: `${left}%` }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setDraggingHandle(isStart ? 'start' : 'end')
              onStart(isStart ? 'start' : 'end')
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              setDraggingHandle(isStart ? 'start' : 'end')
              onStart(isStart ? 'start' : 'end')
            }}
          >
            <div
              className={cn(
                'w-1 h-full bg-white rounded-full shadow-lg transition-transform group-hover/handle:scale-x-150',
                isStart ? 'translate-x-0.5' : '-translate-x-0.5',
              )}
            />

            <div
              className={cn(
                'absolute -top-7 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap opacity-100 transition-opacity pointer-events-none',
                !showLabel && 'hidden',
              )}
            >
              {formatVideoTime(Math.round(val))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const VideoControls = ({ className, inFullscreen }: { className?: string; inFullscreen?: boolean }) => {
  const { playerRef, frame, playing, muted, fullscreen, duration } = usePlayerStore()
  const { routeName } = useRouteParams()
  const player = playerRef?.current
  const settingsRef = useRef<HTMLDivElement>(null)
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  // Hide external controls when in fullscreen (they're shown inside the player)
  if (fullscreen && !inFullscreen) return null

  const seconds = toSeconds(frame)

  return (
    <div className={cn('flex flex-col gap-2 p-2 bg-black/20 rounded-xl backdrop-blur-md border border-white/5', className)}>
      <Timeline route={route} />

      <div className="flex items-center gap-3 pt-2 text-xl">
        <IconButton title={playing ? 'Pause' : 'Play'} icon={playing ? PauseIcon : PlayIcon} onClick={() => player?.toggle()} />
        <IconButton title={muted ? 'Unmute' : 'Mute'} icon={muted ? VolumeOffIcon : Volume2Icon} onClick={() => (muted ? player?.unmute() : player?.mute())} />

        <span className="text-sm font-mono opacity-80 min-w-25">
          {formatVideoTime(Math.round(seconds))} / {formatVideoTime(Math.round(duration))}
        </span>

        <div className="flex-1" />

        <RenderButton />

        <div className="relative flex items-center justify-center" ref={settingsRef}>
          {showSettings && <SettingsMenu />}
          <IconButton title="Settings" icon={SettingsIcon} onClick={() => setShowSettings(!showSettings)} />
        </div>
        <IconButton
          title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          icon={fullscreen ? MinimizeIcon : MaximizeIcon}
          onClick={() => {
            if (fullscreen) document.exitFullscreen()
            else document.querySelector('#fullscreen')?.requestFullscreen()
          }}
        />
      </div>
    </div>
  )
}

const PlayerState = ({ playerRef, props, route }: { route?: Route; props: PreviewProps; playerRef: RefObject<PlayerRef | null> }) => {
  const { start, end } = useRouteParams()
  const set = usePlayerStore((x) => x.set)
  const selection = usePlayerStore((x) => x.selection)
  const duration = getRouteDurationMs(route)! / 1000

  // Initialize store
  useEffect(() => {
    set({ playerRef, props, duration, selection: { start: start ?? 0, end: end ?? duration } })
  }, [playerRef, props, duration, start, end, set])

  // Sync player and document events to store
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onMuteChange = () => set({ muted: player.isMuted() })
    const onPlayPause = () => set({ playing: player.isPlaying() })
    const onFrameUpdate = () => set({ frame: player.getCurrentFrame() })
    const onFullscreenChange = () => set({ fullscreen: !!document.fullscreenElement })

    player.addEventListener('mutechange', onMuteChange)
    player.addEventListener('play', onPlayPause)
    player.addEventListener('pause', onPlayPause)
    player.addEventListener('frameupdate', onFrameUpdate)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      player.removeEventListener('mutechange', onMuteChange)
      player.removeEventListener('play', onPlayPause)
      player.removeEventListener('pause', onPlayPause)
      player.removeEventListener('frameupdate', onFrameUpdate)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [playerRef, set])

  const startFrame = toFrames(selection.start)
  const endFrame = toFrames(selection.end)
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onFrame = () => {
      const frame = player.getCurrentFrame()
      // Stop at end of selection
      if (frame >= endFrame && player.isPlaying()) {
        player.pause()
        player.seekTo(endFrame - 1)
      }
    }

    const onPlay = () => {
      const frame = player.getCurrentFrame()
      // If outside selection, jump to start and keep playing
      if (frame < startFrame || frame >= endFrame) {
        player.seekTo(startFrame)
        requestAnimationFrame(() => player.play())
      }
    }

    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('play', onPlay)
    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('play', onPlay)
    }
  }, [playerRef, startFrame, endFrame])

  // Space bar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        playerRef.current?.toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerRef])

  return null
}

const CurrentTime = ({ route }: { route?: Route }) => {
  const [currentTime, setCurrentTime] = useState<string>()
  const playerRef = usePlayerStore((x) => x.playerRef)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef?.current || !route) return
      const frame = playerRef.current.getCurrentFrame()
      const seconds = toSeconds(frame)
      const time = getDateTime(route.start_time)?.plus({ seconds })
      if (time) setCurrentTime(formatTime(time, true))
    }, 500)
    return () => clearInterval(interval)
  }, [route, playerRef])
  return <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm font-mono pointer-events-none">{currentTime}</div>
}

export const RouteVideoPlayer = ({ className, props }: { className?: string; props: PreviewProps }) => {
  const playerRef = useRef<PlayerRef>(null)
  const [route] = api.route.get.useQuery({ params: { routeName: props.routeName.replace('/', '|') }, query: {} })
  const fullscreen = usePlayerStore((x) => x.fullscreen)
  const { start } = useRouteParams()
  const duration = getRouteDurationMs(route)! / 1000
  const playbackRate = useSettings((x) => x.playbackRate)

  return (
    <div
      id="fullscreen"
      className={cn('relative rounded-xl overflow-hidden bg-black', fullscreen && 'flex flex-col h-full', className)}
      style={fullscreen ? undefined : { aspectRatio: WIDTH / HEIGHT }}
    >
      <PlayerState props={props} playerRef={playerRef} route={route} />
      <div className={cn('relative', fullscreen ? 'flex-1 min-h-0' : 'w-full h-full')}>
        <Player
          ref={playerRef}
          component={Preview}
          compositionHeight={HEIGHT}
          compositionWidth={WIDTH}
          durationInFrames={toFrames(duration)}
          fps={FPS}
          inFrame={3}
          style={{ width: '100%', height: '100%' }}
          inputProps={props}
          initiallyMuted
          acknowledgeRemotionLicense
          autoPlay
          initialFrame={toFrames(start ?? 0)}
          playbackRate={playbackRate}
        />
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => playerRef.current?.toggle()}
          onDoubleClick={() => {
            if (fullscreen) document.exitFullscreen()
            else document.querySelector('#fullscreen')?.requestFullscreen()
          }}
        />
        <CurrentTime route={route} />
      </div>

      {fullscreen && <VideoControls className="rounded-none border-0 bg-black shrink-0 z-10" inFullscreen />}
    </div>
  )
}
