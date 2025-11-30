import { tsr } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { $ } from 'bun'
import { CameraType, PreviewProps, RenderInfo } from '../src/types'
import { RENDERER_URL, USER_CONTENT_DIR } from '../src/utils/consts'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { getPreviewGenerated } from '../templates/Preview'

const generateId = () => (Math.random() * 1_000_000).toFixed(0)

const queue: Record<string, RenderInfo> = {}

const downloadCamFiles = async (renderId: string, files: string[], type?: CameraType) => {
  if (!type || type === 'qcameras') throw new Error(`Invalid camera type: ${type}`)

  const replaceFile = async (url: string, name: string) => {
    const folder = `${USER_CONTENT_DIR}/${renderId}/input`
    const file = `${folder}/${name}.mp4`
    await $`mkdir -p ${folder}`
    await $`curl ${url} | ffmpeg -f hevc -i pipe:0 -c copy ${file} -y`
    return `${RENDERER_URL}/${file}`
  }

  console.log(`Downloading and re-encoding ${type} cam`)
  return await Promise.all(files.map((file, i) => replaceFile(file, `${type}${i}`)))
}

const render = async ({ props, renderId, serveUrl }: { props: PreviewProps; renderId: string; serveUrl: string }) => {
  try {
    if (!props.data) throw new Error('No data in props')

    props.segmentCount = 1 // To make it faster at first
    props.prefetchLogs = true

    queue[renderId].state = 'generating'
    const generated = await getPreviewGenerated(props)

    queue[renderId].state = 'downloading'
    console.log('Downloading files')
    const [largeCameraFiles, smallCameraFiles] = await Promise.all([
      downloadCamFiles(renderId, generated.largeCameraFiles, props.largeCameraType),
      generated.smallCameraFiles ? downloadCamFiles(renderId, generated.smallCameraFiles, props.smallCameraType) : undefined,
    ])
    props.generated = { ...generated, largeCameraFiles, smallCameraFiles }

    console.log(`Rendering`)
    queue[renderId].state = 'rendering'
    const composition = await selectComposition({
      id: 'Preview',
      serveUrl,
      inputProps: props,
    })

    const out = `${USER_CONTENT_DIR}/${renderId}/output.mp4`
    await renderMedia({
      composition: composition,
      serveUrl,
      codec: 'h264',
      outputLocation: out,
      timeoutInMilliseconds: 120_000,
      onProgress: (p) => {
        queue[renderId].progress = p
      },
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
      },
    })

    queue[renderId].state = 'done'
    queue[renderId].output = `${RENDERER_URL}/${out}`
  } catch (e) {
    queue[renderId].error = String(e)
    queue[renderId].state = 'error'
  }
}
export const router = tsr.platformContext<{}>().router(renderer, {
  status: async () => {
    return { status: 200, body: { alive: true } }
  },
  render: async ({ body: { props, serveUrl } }) => {
    const renderId = generateId()

    render({ props, renderId, serveUrl })
    queue[renderId] = { state: 'started' }
    return { status: 200, body: { renderId } }
  },

  progress: async ({ query: { renderId } }) => {
    const info = queue[renderId]
    if (!info) return { status: 404, body: 'Not found' }
    return { status: 200, body: info }
  },
})
