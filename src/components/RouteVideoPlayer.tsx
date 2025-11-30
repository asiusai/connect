import { Player, PlayerRef } from '@remotion/player'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { getPreviewGenerated, Preview } from '../../templates/Preview'
import { CameraType, Files, LogType, PreviewProps, Route } from '../types'
import { formatTime, getRouteDuration } from '../utils/format'
import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
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

const Controls = ({
  playerRef,
  duration,
  props,
  fullscreenRef,
}: {
  fullscreenRef: RefObject<HTMLDivElement|null>
  props: PreviewProps
  duration: number
  playerRef: RefObject<PlayerRef | null>
}) => {
  const player = playerRef.current

  const [playing, setPlaying] = useState(player?.isPlaying() ?? false)
  const [muted, setMuted] = useState(player?.isMuted() ?? false)
  const [fullscreen, setFullscreen] = useState( false)
  const [frame, setFrame] = useState(player?.getCurrentFrame() ?? 0)

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
            {formatTime(Math.round(seconds))} <span className='hidden md:inline-block'>/ {formatTime(duration)}</span>
          </span>

          <Download props={props} />
          <IconButton name="settings" />
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
  const [largeCameraType, setLargeCameraType] = useState<CameraType>('qcameras')
  const [smallCameraType, setSmallCameraType] = useState<CameraType | undefined>(undefined)
  const [logType, setLogType] = useState<LogType | undefined>(undefined)

  const props = useMemo(
    () => ({ data: { route, files }, largeCameraType, routeName, logType, smallCameraType }) satisfies PreviewProps,
    [route, files, largeCameraType, routeName, logType, smallCameraType],
  )

  const generated = useAsyncMemo(() => getPreviewGenerated(props), [props])

  const maxLen = route.maxqlog + 1

  const allCameras = CameraType.options.map((x) => ({ value: x, label: FILE_INFO[x].label, disabled: files[x].length !== maxLen }))
  const allLogs = LogType.options.map((x) => ({ value: x, label: FILE_INFO[x].label, disabled: files[x].length !== maxLen }))
  return (
    <>
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
        <Controls playerRef={playerRef} fullscreenRef={fullscreenRef} duration={duration} props={props} />
      </div>

      {/* <div>
        <Select value={largeCameraType} onChange={setLargeCameraType} options={allCameras} />
        <Select
          value={smallCameraType ?? 'none'}
          onChange={(x) => setSmallCameraType(x === 'none' ? undefined : x)}
          options={[...allCameras, { value: 'none', label: 'Hidden' }]}
        />
        <Select
          value={logType ?? 'none'}
          onChange={(x) => setLogType(x === 'none' ? undefined : x)}
          options={[...allLogs, { value: 'none', label: 'Hidden' }]}
        />
      </div> */}
    </>
  )
}
