import { tsr } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { $ } from 'bun'
import { PreviewFiles, PreviewProps, RenderInfo } from '../src/types'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { getPreviewGenerated } from '../templates/Preview'
import { env } from '../src/utils/env'

const generateId = () => (Math.random() * 1_000_000_000).toFixed(0)

const queue: Record<string, RenderInfo> = {}

const downloadCamFiles = async (folder: string, files: PreviewFiles) => {
  if (!files.type || files.type === 'qcameras') throw new Error(`Invalid camera type: ${files.type}`)

  const replaceFile = async (url: string, name: string) => {
    const file = `${folder}/${name}.mp4`
    await $`curl ${url} | ffmpeg -f hevc -i pipe:0 -c copy ${file} -y`
    return `${env.RENDERER_URL}/${file}`
  }

  console.log(`Downloading and re-encoding ${files.type} cam`)
  return {
    type: files.type,
    files: await Promise.all(files.files.map((file, i) => (file ? replaceFile(file, `${files.type}${i}`) : undefined))),
  }
}

const render = async ({ props, renderId, serveUrl }: { props: PreviewProps; renderId: string; serveUrl: string }) => {
  const folder = `${env.USER_CONTENT_DIR}/${renderId}/input`
  await $`mkdir -p ${folder}`

  try {
    if (!props.data) throw new Error('No data in props')

    props.segmentCount = 1 // To make it faster at first
    props.prefetchLogs = true // Have to prefetch the data for rendering

    // qcamera can't be rendered
    if (props.largeCameraType === 'qcameras') props.largeCameraType = 'cameras'
    if (props.smallCameraType === 'qcameras') props.smallCameraType = 'cameras'

    queue[renderId].state = 'generating'
    const generated = await getPreviewGenerated(props)
    if (!generated) throw new Error(`Props generation failed!`)

    queue[renderId].state = 'downloading'
    console.log('Downloading files')
    const [largeCameraFiles, smallCameraFiles] = await Promise.all([
      downloadCamFiles(folder, generated.largeCameraFiles),
      generated.smallCameraFiles ? downloadCamFiles(folder, generated.smallCameraFiles) : undefined,
    ])
    props.generated = { ...generated, largeCameraFiles, smallCameraFiles }

    console.log(`Rendering`)
    queue[renderId].state = 'rendering'
    const composition = await selectComposition({
      id: 'Preview',
      serveUrl,
      inputProps: props,
    })

    const out = `${env.USER_CONTENT_DIR}/${renderId}/output.mp4`
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
    queue[renderId].output = `${env.RENDERER_URL}/${out}`
  } catch (e) {
    queue[renderId].error = String(e)
    queue[renderId].state = 'error'
  }

  await $`rm -rf ${folder}`
}
export const router = tsr.platformContext<{}>().router(renderer, {
  status: async () => {
    return { status: 200, body: { alive: true } }
  },
  render: async ({ body: { props, serveUrl } }) => {
    const renderId = generateId()

    queue[renderId] = { state: 'started' }
    render({ props, renderId, serveUrl })
    return { status: 200, body: { renderId } }
  },

  progress: async ({ query: { renderId } }) => {
    const info = queue[renderId]
    if (!info) return { status: 404, body: 'Not found' }
    return { status: 200, body: info }
  },
})
