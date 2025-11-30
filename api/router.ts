import { tsr } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { $ } from 'bun'
import { CameraType, PreviewProps, RenderProgress } from '../src/types'
import { RENDERER_URL, USER_CONTENT_DIR } from '../src/utils/consts'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { getPreviewGenerated } from '../templates/Preview'

const generateId = () => (Math.random() * 1_000_000).toFixed(0)

const queue: Record<string, { promise: Promise<any>; progress?: RenderProgress; error?: string }> = {}

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

    const generated = await getPreviewGenerated(props)

    console.log('Downloading files')
    const [largeCameraFiles, smallCameraFiles] = await Promise.all([
      downloadCamFiles(renderId, generated.largeCameraFiles, props.largeCameraType),
      generated.smallCameraFiles ? downloadCamFiles(renderId, generated.smallCameraFiles, props.smallCameraType) : undefined,
    ])
    props.generated = { ...generated, largeCameraFiles, smallCameraFiles }

    console.log(`Rendering`)
    const composition = await selectComposition({
      id: 'Preview',
      serveUrl,
      inputProps: props,
    })

    await renderMedia({
      composition: composition,
      serveUrl,
      codec: 'h264',
      outputLocation: `out/${props.routeName}.mp4`,
      timeoutInMilliseconds: 120_000,
      onProgress: (p) => {
        queue[renderId].progress = p
      },
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
      },
    })
  } catch (e) {
    queue[renderId].error = String(e)
  }
}
export const router = tsr.platformContext<{}>().router(renderer, {
  status: async () => {
    return { status: 200, body: { alive: true } }
  },
  render: async ({ body: { props, serveUrl } }) => {
    const renderId = generateId()

    queue[renderId] = { promise: render({ props, renderId, serveUrl }) }
    return { status: 200, body: { renderId } }
  },

  progress: async ({ query: { renderId } }) => {
    const item = queue[renderId]
    return { status: 200, body: { progress: item.progress, error: item.error } }
  },
})
