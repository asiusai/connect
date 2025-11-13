import { AbsoluteFill, CalculateMetadataFunction, Html5Video } from 'remotion'
import { z } from 'zod'
import { api } from '../api'
import { Files, RouteSegment } from '../api/types'
import { createQCameraStreamUrl } from '../api/route'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const FPS = 30

const Data = z.object({
  segments: RouteSegment.array().optional(),
  qCamUrl: z.string().optional(),
  files: Files,
})

export const MainProps = z.object({
  routeName: z.string(),
  data: Data.optional(),
})
export type MainProps = z.infer<typeof MainProps>

const convert = async (file: string) => {
  const ffmpeg = new FFmpeg()
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd'
  ffmpeg.on('log', ({ message }) => console.log(message))
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  await ffmpeg.writeFile('input.hevc', await fetchFile(file))
  await ffmpeg.exec(['-r', '20', '-i', 'input.hevc', '-c', 'copy', '-map', '0', '-vtag', 'hvc1', 'output.mp4'])
  const data = await ffmpeg.readFile('output.mp4')
  const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }))
  return url
}

export const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({ props: { routeName } }) => {
  const [dongleId] = routeName.split('/')

  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const segment = segments.body[0]

  const durationInSeconds = (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000
  const qCamUrl = createQCameraStreamUrl(routeName.replace('/', '%7C'), { exp: segment.share_exp, sig: segment.share_sig })
  const files = await api.file.files.query({ params: { routeName: routeName.replace('/', '%7C') } })
  if (files.status !== 200) throw new Error('Failed getting files!')

  const url = await convert(files.body.dcameras[0])

  const data = {
    segments: segments.body,
    files: files.body,
    qCamUrl: url,
  }

  return {
    durationInFrames: durationInSeconds * FPS,
    props: { routeName, data },
  }
}

export const Main = (props: MainProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
      {props.data && <Html5Video src={props.data.qCamUrl} style={{ width: '100%' }} />}
    </AbsoluteFill>
  )
}
