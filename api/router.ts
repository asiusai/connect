import { tsr } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { $ } from 'bun'
import { CameraType, PreviewProps, RenderProgress } from '../src/types'
import { RENDERER_URL, USER_CONTENT_DIR } from '../src/utils/consts'
import { renderMedia, selectComposition } from '@remotion/renderer'

const generateId = () => (Math.random() * 1_000_000).toFixed(0)

const queue: Record<string, { promise: Promise<any>; progress?: RenderProgress; error?: string }> = {}

const render = async ({ props, renderId, serveUrl }: { props: PreviewProps; renderId: string; serveUrl: string }) => {
  try {
    if (!props.data) throw new Error('No data in props')
    const replaceCamFiles = async (cam?: CameraType) => {
      if (!cam) return
      console.log(`Downloading and re-encoding ${cam} cam`)
      const replaceFile = async (url: string, name: string) => {
        const path = `${USER_CONTENT_DIR}/${renderId}/input/${name}.mp4`
        await $`curl ${url} | ffmpeg -f hevc -i pipe:0 -c copy ${path} -y`
        return `${RENDERER_URL}/${path}`
      }
      // TODO: replace `files` with largeCameraFiles, smallCameraFiles and logFiles
      // TODO: throw on qcamera
      props.data!.files[cam] = await Promise.all(props.data!.files[cam].map((file, i) => replaceFile(file, `${cam}${i}`)))
    }

    await Promise.all([replaceCamFiles(props.largeCamera), replaceCamFiles(props.smallCamera)])

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
