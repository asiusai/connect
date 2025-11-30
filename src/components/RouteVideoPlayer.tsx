import { Player, PlayerRef } from '@remotion/player'
import clsx from 'clsx'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { getPreviewGenerated, Preview } from '../../templates/Preview'
import { CameraType, Files, LogType, PreviewProps, Route } from '../types'
import { formatTime, getRouteDuration } from '../utils/format'
import { ReactNode, RefObject, useEffect, useRef, useState } from 'react'
import { useAsyncMemo, useParams } from '../utils/hooks'
import { api } from '../api'
import { FILE_INFO } from './RouteFiles'
import { TEMPLATES_URL } from '../utils/consts'
import { useRendererStatus, useRenderProgress } from '../api/queries'
import { IconButton } from './material/IconButton'
import { Timeline } from './Timeline'
import { saveFile } from '../utils/helpers'

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
    <IconButton
      name="download"
      className="ml-auto"
      loading={loading}
      onClick={() => mutate({ body: { props, serveUrl: TEMPLATES_URL } })}
    />
  )
}

const MenuItem = ({ label, value, onClick }: { label: string; value?: string; onClick: () => void }) => (
  <div className="flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer text-sm transition-colors" onClick={onClick}>
    <span>{label}</span>
    <div className="flex items-center gap-1 text-white/70">
      <span>{value}</span>
      <span className="material-symbols-outlined text-lg">chevron_right</span>
    </div>
  </div>
)

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
    <span className={clsx('material-symbols-outlined text-lg', !selected && 'invisible')}>check</span>
    <span>{label}</span>
  </div>
)

const SettingsView = ({ title, onBack, children }: { title?: string; onBack?: () => void; children: ReactNode }) => {
  return (
    <div className="absolute bottom-10 right-0 w-64 bg-[#1e1e1e]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
      {title && (
        <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
          <IconButton name="arrow_back" size="20" onClick={onBack} />
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

const SettingsMenu = ({
  props,
  setProps,
  files,
}: {
  props: PreviewProps
  setProps: React.Dispatch<React.SetStateAction<PreviewProps>>
  files: Files
}) => {
  const maxLen = files.qlogs.length
  const [view, setView] = useState<'large' | 'small' | 'log'>()
  const allCameras = CameraType.options.map((x) => ({ value: x, label: FILE_INFO[x].short, disabled: files[x].length !== maxLen }))
  const allLogs = LogType.options.map((x) => ({ value: x, label: FILE_INFO[x].short, disabled: files[x].length !== maxLen }))

  if (view === 'large')
    return (
      <SettingsView title="Large Camera" onBack={() => setView(undefined)}>
        {allCameras.map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={props.largeCameraType === option.value}
            disabled={option.disabled}
            onClick={() => {
              setProps((p) => ({ ...p, largeCameraType: option.value as any }))
              setView(undefined)
            }}
          />
        ))}
      </SettingsView>
    )

  if (view === 'small')
    return (
      <SettingsView title="Small Camera" onBack={() => setView(undefined)}>
        {[...allCameras, { value: 'none', label: 'Hidden', disabled: false }].map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={(props.smallCameraType ?? 'none') === option.value}
            disabled={option.disabled}
            onClick={() => {
              setProps((p) => ({ ...p, smallCameraType: option.value === 'none' ? undefined : (option.value as any) }))
              setView(undefined)
            }}
          />
        ))}
      </SettingsView>
    )

  if (view === 'log')
    return (
      <SettingsView title="Logs" onBack={() => setView(undefined)}>
        {[...allLogs, { value: 'none', label: 'Hidden', disabled: false }].map((option) => (
          <OptionItem
            key={option.value}
            label={option.label}
            selected={(props.logType ?? 'none') === option.value}
            disabled={option.disabled}
            onClick={() => {
              setProps((p) => ({ ...p, logType: option.value === 'none' ? undefined : (option.value as any) }))
              setView(undefined)
            }}
          />
        ))}
      </SettingsView>
    )

  return (
    <SettingsView>
      <MenuItem label="Large Camera" value={FILE_INFO[props.largeCameraType].short} onClick={() => setView('large')} />
      <MenuItem
        label="Small Camera"
        value={props.smallCameraType ? FILE_INFO[props.smallCameraType].short : "Hidden"}
        onClick={() => setView('small')}
      />
      <MenuItem label="Log" value={props.logType ? FILE_INFO[props.logType].short : 'Hidden'} onClick={() => setView('log')} />
    </SettingsView>
  )
}

const Controls = ({
  playerRef,
  duration,
  props,
  setProps,
  fullscreenRef,
  files,
}: {
  fullscreenRef: RefObject<HTMLDivElement | null>
  props: PreviewProps
  setProps: React.Dispatch<React.SetStateAction<PreviewProps>>
  duration: number
  playerRef: RefObject<PlayerRef | null>
  files: Files
}) => {
  const player = playerRef.current

  const [playing, setPlaying] = useState(player?.isPlaying() ?? false)
  const [muted, setMuted] = useState(player?.isMuted() ?? false)
  const [fullscreen, setFullscreen] = useState(false)
  const [frame, setFrame] = useState(player?.getCurrentFrame() ?? 0)
  const [showSettings, setShowSettings] = useState(false)
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

  const seconds = frame / FPS
  return (
    <div className="absolute inset-0" onClick={() => player?.toggle()}>
      <div className="absolute bottom-0 left-0 w-full gap-2 flex flex-col py-4 px-3">
        <div className="flex items-center gap-2 w-full">
          <IconButton name={playing ? 'pause' : 'play_arrow'} onClick={() => player?.toggle()} />
          <IconButton name={muted ? 'volume_off' : 'volume_up'} onClick={() => (muted ? player?.unmute() : player?.mute())} />
          <span className="text-sm ">
            {formatTime(Math.round(seconds))} <span className="hidden md:inline-block">/ {formatTime(duration)}</span>
          </span>

          <Download props={props} />
          <div className="relative" ref={settingsRef}>
            {showSettings && <SettingsMenu props={props} setProps={setProps} files={files} />}
            <IconButton name="settings" onClick={() => setShowSettings(!showSettings)} />
          </div>
          <IconButton
            name={fullscreen ? 'fullscreen_exit' : 'fullscreen'}
            onClick={() => (fullscreen ? document.exitFullscreen() : fullscreenRef.current?.requestFullscreen())}
          />
        </div>
        <Timeline playerRef={playerRef} />
      </div>
    </div>
  )
}

export const RouteVideoPlayer = ({ playerRef, route, files }: { playerRef: RefObject<PlayerRef | null>; route: Route; files: Files }) => {
  const { routeName } = useParams()
  const duration = getRouteDuration(route)!.asSeconds()
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const [props, setProps] = useState<PreviewProps>({
    routeName,
    largeCameraType: 'qcameras',
    smallCameraType: undefined,
    logType: undefined,
    data: { files, route },
    showPath: undefined,
  })

  useEffect(() => {
    setProps((p) => ({ ...p, data: { files, route } }))
  }, [files, route])

  const generated = useAsyncMemo(() => getPreviewGenerated(props), [props])

  return (
    <div ref={fullscreenRef} className="relative">
      <Player
        ref={playerRef}
        component={Preview}
        compositionHeight={HEIGHT}
        compositionWidth={WIDTH}
        durationInFrames={duration * FPS}
        fps={FPS}
        style={{ width: '100%' }}
        className="rounded-lg"
        inputProps={{ ...props, generated }}
        initiallyMuted
        acknowledgeRemotionLicense
      />
      <Controls playerRef={playerRef} fullscreenRef={fullscreenRef} duration={duration} props={props} setProps={setProps} files={files} />
    </div>
  )
}
