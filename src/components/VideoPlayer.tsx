import { Player, PlayerRef } from '@remotion/player'
import clsx from 'clsx'
import { FPS, HEIGHT, toFrames, toSeconds, WIDTH } from '../../templates/shared'
import { getPreviewGenerated, Preview } from '../../templates/Preview'
import { CameraType, FileType, LogType, PreviewProps } from '../types'
import { formatVideoTime, getRouteDurationMs } from '../utils/format'
import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useAsyncMemo, useRouteParams } from '../utils/hooks'
import { api } from '../api'
import { useFiles, useRendererStatus, useRenderProgress, useRoute } from '../api/queries'
import { IconButton } from './IconButton'
import { saveFile } from '../utils/helpers'
import { Icon } from './Icon'
import { env } from '../utils/env'
import { getTimelineEvents, TimelineEvent } from '../utils/derived'
import { useStorage } from '../utils/storage'

const FILE_LABELS: Record<FileType, string> = {
  cameras: 'Road',
  ecameras: 'Wide',
  dcameras: 'Driver',
  qcameras: 'Quantized',
  logs: 'Full',
  qlogs: 'Quantized',
}

const Download = ({ props }: { props: PreviewProps }) => {
  const { data, mutate, reset } = api.renderer.render.useMutation()
  const [status] = useRendererStatus()
  const [progress] = useRenderProgress(data?.body.renderId)

  useEffect(() => {
    if (!progress?.output) return
    saveFile(progress.output, 'out.mp4')
    reset()
  }, [progress?.output])

  if (!status) return <div>Renderer is offline</div>
  const loading = data?.body.renderId ? (progress?.progress?.progress ?? true) : false
  return (
    <div className="ml-auto flex items-center gap-2">
      {progress && (
        <span className="text-xs hidden md:inline-block opacity-70">
          {progress?.state}
          {progress.progress && <span> {(progress.progress.progress * 100).toFixed()}%</span>}
        </span>
      )}

      <IconButton
        title={progress?.state ? `Downloading` : 'Download (1st segment only for now)'}
        name="download"
        loading={loading}
        onClick={() => mutate({ body: { props, serveUrl: env.TEMPLATES_URL } })}
      />
    </div>
  )
}

const OptionItem = ({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) => (
  <div
    className={clsx(
      'flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer text-sm transition-colors',
      disabled && 'opacity-50 pointer-events-none',
    )}
    onClick={onClick}
  >
    <Icon name="check" className={clsx('text-lg', !selected && 'invisible')} />
    <span>{label}</span>
  </div>
)

const TITLES = { large: 'Large Camera', small: 'Small Camera', log: 'Openpilot UI' }
const SettingsMenu = () => {
  const { routeName } = useRouteParams()
  const [files] = useFiles(routeName)
  const [route] = useRoute(routeName)
  const maxLen = route ? route.maxqlog + 1 : 0
  const [view, setView] = useState<'large' | 'small' | 'log'>()
  const allCameras = CameraType.options.map((x) => ({ value: x, label: FILE_LABELS[x], disabled: files?.[x].length !== maxLen }))
  const allLogs = LogType.options.map((x) => ({ value: x, label: FILE_LABELS[x], disabled: files?.[x].length !== maxLen }))
  const onBack = () => setView(undefined)

  const title = view ? TITLES[view] : undefined

  const [largeCameraType, setLargeCameraType] = useStorage('largeCameraType')
  const [smallCameraType, setSmallCameraType] = useStorage('smallCameraType')
  const [logType, setLogType] = useStorage('logType')

  return (
    <div className="absolute bottom-10 right-0 w-64 bg-[#1e1e1e]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
      {title && (
        <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
          <IconButton title="Back" name="arrow_back" className="text-xl" onClick={onBack} />
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}

      {view === undefined &&
        [
          { view: 'large' as const, value: FILE_LABELS[largeCameraType] },
          { view: 'small' as const, value: smallCameraType ? FILE_LABELS[smallCameraType] : 'Hidden' },
          { view: 'log' as const, value: logType ? FILE_LABELS[logType] : 'Hidden' },
        ].map(({ view, value }) => (
          <div
            key={view}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer text-sm transition-colors"
            onClick={() => setView(view)}
          >
            <span>{TITLES[view]}</span>
            <div className="flex items-center gap-1 text-white/70">
              <span>{value}</span>
              <Icon name="chevron_right" />
            </div>
          </div>
        ))}

      {view === 'large' &&
        allCameras.map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={largeCameraType === option.value}
            disabled={option.disabled}
            onClick={() => {
              setLargeCameraType(option.value)
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
              setSmallCameraType(option.value === 'none' ? undefined : option.value)
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
              setLogType(option.value === 'none' ? undefined : option.value)
              setView(undefined)
            }}
          />
        ))}
    </div>
  )
}

const Controls = ({
  playerRef,
  duration,
  fullscreenRef,
  props,
}: {
  fullscreenRef: RefObject<HTMLDivElement | null>
  duration: number
  playerRef: RefObject<PlayerRef | null>
  props: PreviewProps
}) => {
  const player = playerRef.current

  const [playing, setPlaying] = useState(player?.isPlaying() ?? false)
  const [muted, setMuted] = useState(player?.isMuted() ?? false)
  const [fullscreen, setFullscreen] = useState(false)
  const [frame, setFrame] = useState(player?.getCurrentFrame() ?? 0)
  const [showSettings, setShowSettings] = useState(false)
  const [hovering, setHovering] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  useEffect(() => {
    if (!player) return

    const onMuteChange = () => setMuted(player.isMuted())
    const onPlayPause = () => setPlaying(player.isPlaying())
    const onFrame = () => setFrame(player.getCurrentFrame())

    onMuteChange()
    onPlayPause()
    onFrame()

    player.addEventListener('mutechange', onMuteChange)
    player.addEventListener('play', onPlayPause)
    player.addEventListener('pause', onPlayPause)
    player.addEventListener('frameupdate', onFrame)

    return () => {
      player.removeEventListener('mutechange', onMuteChange)
      player.removeEventListener('play', onPlayPause)
      player.removeEventListener('pause', onPlayPause)
      player.removeEventListener('frameupdate', onFrame)
    }
  }, [player])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const seconds = toSeconds(frame)
  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={() => setHovering(true)}
    >
      <div className="absolute inset-0 cursor-pointer" onClick={() => player?.toggle()} />
      <div
        className={clsx(
          'absolute bottom-0 left-0 w-full gap-2 flex flex-col py-4 px-3 transition-opacity duration-300',
          playing && !hovering && 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-2 w-full">
          <IconButton title={playing ? 'Pause' : 'Play'} name={playing ? 'pause' : 'play_arrow'} onClick={() => player?.toggle()} />
          <IconButton
            title={muted ? 'Unmute' : 'Mute'}
            name={muted ? 'volume_off' : 'volume_up'}
            onClick={() => (muted ? player?.unmute() : player?.mute())}
          />
          <span className="text-sm ">
            {formatVideoTime(Math.round(seconds))} / {formatVideoTime(Math.round(duration))}
          </span>

          <Download props={props} />
          <div className="relative" ref={settingsRef}>
            {showSettings && <SettingsMenu />}
            <IconButton title="Settings" name="settings" onClick={() => setShowSettings(!showSettings)} />
          </div>
          <IconButton
            title={fullscreen ? 'Exit fullscreen' : 'Exit fullscreen'}
            name={fullscreen ? 'fullscreen_exit' : 'fullscreen'}
            onClick={() => (fullscreen ? document.exitFullscreen() : fullscreenRef.current?.requestFullscreen())}
          />
        </div>
        <Timeline playerRef={playerRef} frame={frame} />
      </div>
    </div>
  )
}

const getEventInfo = (event: TimelineEvent) => {
  if (event.type === 'engaged') return ['Engaged', 'bg-green-600 min-w-[1px]', '1']
  if (event.type === 'overriding') return ['Overriding', 'bg-gray-500 min-w-[1px]', '2']
  if (event.type === 'user_flag') return ['User flag', 'bg-yellow-400 min-w-[2px]', '4']
  if (event.type === 'alert') {
    if (event.alertStatus === 1) return ['User prompt alert', 'bg-amber-400 min-w-[2px]', '3']
    else return ['Critical alert', 'bg-red-600 min-w-[2px]', '3']
  }
  throw new Error(`Invalid event type ${JSON.stringify(event)}`)
}

const MARKER_WIDTH = 3

export const Timeline = ({ playerRef, frame }: { frame: number; className?: string; playerRef: React.RefObject<PlayerRef | null> }) => {
  const { routeName } = useRouteParams()
  const [route] = useRoute(routeName)
  const events = useAsyncMemo(async () => (route ? await getTimelineEvents(route) : undefined), [route])

  const durationMs = getRouteDurationMs(route) ?? 0
  const duration = durationMs / 1000
  let ref = useRef<HTMLDivElement>(null)

  const updateMarker = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width - MARKER_WIDTH)
    playerRef.current?.seekTo(Math.floor((x / rect.width) * toFrames(duration)))
  }

  const onStart = () => {
    const onMouseMove = (ev: MouseEvent) => updateMarker(ev.clientX)
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault()
      if (ev.touches.length !== 1) return
      updateMarker(ev.touches[0].clientX)
    }
    const onStop = () => {
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
      onMouseDown={(ev) => {
        if (!route) return
        updateMarker(ev.clientX)
        onStart()
      }}
      onTouchStart={(ev) => {
        if (ev.touches.length !== 1 || !route) return
        updateMarker(ev.touches[0].clientX)
        onStart()
      }}
      className={clsx(
        'relative isolate flex h-[10px] cursor-pointer touch-none self-stretch rounded-full bg-blue-900',
        'after:absolute after:inset-0 after:rounded-b-md after:bg-gradient-to-b after:from-black/0 after:via-black/10 after:to-black/30 overflow-hidden',
      )}
      title="Disengaged"
    >
      <div className="absolute inset-0 size-full rounded-b-md ">
        {events?.map((event, i) => {
          const left = (event.route_offset_millis / durationMs) * 100
          const width = event.type === 'user_flag' ? (1000 / durationMs) * 100 : (event.end_route_offset_millis / durationMs) * 100 - left

          const [title, classes, zIndex] = getEventInfo(event)
          return (
            <div
              key={i}
              title={title}
              className={clsx('absolute top-0 h-full', classes)}
              style={{ left: `${left}%`, width: `${width}%`, zIndex }}
            />
          )
        })}
      </div>
      <div
        className="absolute top-0 z-10 h-full"
        style={{
          width: `${MARKER_WIDTH}px`,
          left: `${markerOffset}%`,
        }}
      >
        <div className="absolute inset-x-0 h-full bg-white" style={{ width: MARKER_WIDTH }} />
      </div>
    </div>
  )
}

export const RouteVideoPlayer = ({ playerRef, className }: { playerRef: RefObject<PlayerRef | null>; className?: string }) => {
  const { routeName } = useRouteParams()
  const [route] = useRoute(routeName)
  const [files] = useFiles(routeName)
  const duration = getRouteDurationMs(route)! / 1000
  const fullscreenRef = useRef<HTMLDivElement>(null)

  const [largeCameraType] = useStorage('largeCameraType')
  const [smallCameraType] = useStorage('smallCameraType')
  const [logType] = useStorage('logType')
  const [unitFormat] = useStorage('unitFormat')

  const props = useMemo<PreviewProps>(
    () => ({
      routeName,
      largeCameraType,
      smallCameraType,
      logType,
      data: files && route ? { files, route } : undefined,
      unitFormat,
    }),
    [largeCameraType, smallCameraType, logType, files, route],
  )

  const generated = useAsyncMemo(() => getPreviewGenerated(props), [props])

  return (
    <div ref={fullscreenRef} className={clsx('relative rounded-xl overflow-hidden', className)}>
      <Player
        ref={playerRef}
        component={Preview}
        compositionHeight={HEIGHT}
        compositionWidth={WIDTH}
        durationInFrames={toFrames(duration)}
        fps={FPS}
        style={{ width: '100%' }}
        inputProps={{ ...props, generated }}
        initiallyMuted
        acknowledgeRemotionLicense
      />
      <Controls playerRef={playerRef} fullscreenRef={fullscreenRef} duration={duration} props={props} />
    </div>
  )
}
