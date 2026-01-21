import { AbsoluteFill, Sequence } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { FileType, PreviewData, PreviewFiles, PreviewProps, SegmentFiles, UnitFormat } from '../../../shared/types'
import { api } from '../api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { OpenpilotUI } from './OpenpilotUI'
import { Loading } from '../components/Loading'
import clsx from 'clsx'
import { toSegmentFiles } from '../../../shared/helpers'
import { Icon } from '../components/Icon'

export const getPreviewData = async (props: PreviewProps): Promise<PreviewData> => {
  const [dongleId] = props.routeName.split('/')
  const segments = await api.routes.routesSegments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const route = segments.body[0]

  const res = await api.route.files.query({ params: { routeName: props.routeName.replace('/', '|') }, query: {} })
  if (res.status !== 200) throw new Error()
  let files = toSegmentFiles(res.body, route.maxqlog + 1)
  return { route, files }
}
const getFiles = (files: SegmentFiles, preffered?: FileType, fallback?: FileType) => {
  // only use the files if at least some of them are uploaded
  const type = !preffered ? undefined : files[preffered].some(Boolean) ? preffered : fallback
  if (!type) return
  return { type, files: files[type] }
}

const Camera = ({ className, files, name }: { name: string; files?: PreviewFiles; className?: string }) => {
  if (!files) return null
  return (
    <div className={clsx('absolute', className)} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Loading className="absolute inset-0" />
      <div className="relative h-full w-full">
        {files.type === 'qcameras' && <HlsVideo files={files} />}
        {files.files.map((src, i) => (
          <Sequence key={i} from={i * 60 * FPS} name={`${name} ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS} postmountFor={60 * FPS}>
            {files.type !== 'qcameras' && src && <HevcVideo src={src} />}
            {!src && (
              <AbsoluteFill className="bg-black/50 items-center justify-center text-4xl gap-4">
                <Icon name="info" className="text-6xl" />
                <div>This video segment has not uploaded yet or has been deleted.</div>
              </AbsoluteFill>
            )}
          </Sequence>
        ))}
      </div>
    </div>
  )
}

const UI = ({ files, routeName, showPath, unitFormat }: { files?: PreviewFiles; routeName: string; showPath: boolean; unitFormat?: UnitFormat }) => {
  if (!files) return null
  return (
    <>
      {files.files.map((url, i) => (
        <Sequence key={i} name={`UI ${i}`} from={i * 60 * FPS} durationInFrames={60 * FPS} premountFor={60 * FPS} postmountFor={60 * FPS}>
          {url && <OpenpilotUI i={i} unitFormat={unitFormat} routeName={routeName} url={url} showPath={showPath} />}
        </Sequence>
      ))}
    </>
  )
}

export const Preview = ({ routeName, showPath, unitFormat, largeCameraType, smallCameraType, data, logType }: PreviewProps) => {
  if (!data) return null
  return (
    <AbsoluteFill>
      <Camera files={getFiles(data.files, largeCameraType, 'qcameras')} name="Large" className="inset-0" />
      <UI files={getFiles(data.files, logType)} routeName={routeName} showPath={!!showPath} unitFormat={unitFormat} />
      <Camera
        files={getFiles(data.files, smallCameraType)}
        name="Small"
        className="h-[400px] bottom-[30px] right-[30px] rounded-[20px] w-auto overflow-hidden"
      />
    </AbsoluteFill>
  )
}
