import { Player, PlayerRef } from '@remotion/player'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { getPreviewGenerated, Preview } from '../../templates/Preview'
import { CameraType, Files, LogType, PreviewProps, Route } from '../types'
import { getRouteDuration } from '../utils/format'
import { RefObject, useMemo, useState } from 'react'
import { useAsyncMemo, useParams } from '../utils/hooks'
import { api } from '../api'
import { Select } from './material/Select'
import { FILE_INFO } from './RouteFiles'
import { Button } from './material/Button'
import { TEMPLATES_URL } from '../utils/consts'
import { useRendererStatus, useRenderProgress } from '../api/queries'

export const RouteVideoPlayer = ({ playerRef, route, files }: { playerRef: RefObject<PlayerRef | null>; route: Route; files: Files }) => {
  const { routeName } = useParams()
  const duration = getRouteDuration(route)!.asSeconds()

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
    <div className="">
      {generated && (
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
          clickToPlay
          controls
          acknowledgeRemotionLicense
          allowFullscreen
        />
      )}
      <div>
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
        <Render props={props} />
      </div>
    </div>
  )
}

const Render = ({ props }: { props: PreviewProps }) => {
  const { data, mutate } = api.renderer.render.useMutation()
  const [status] = useRendererStatus()
  const [progress] = useRenderProgress(data?.body.renderId)
  if (!status) return <div>Renderer is offline</div>
  return (
    <div>
      RenderId: {data?.body.renderId}
      Progress: {JSON.stringify(progress)}
      <Button onClick={() => mutate({ body: { props, serveUrl: TEMPLATES_URL } })}>Render</Button>
    </div>
  )
}
