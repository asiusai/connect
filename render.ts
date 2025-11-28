import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import { $ } from 'bun'
import { CameraType, getPreviewData, PreviewProps } from './templates/Preview'
import { enableTailwind } from '@remotion/tailwind'
import { EXAMPLE_ROUTE_NAME } from './src/utils/consts'

const props: PreviewProps = {
  routeName: EXAMPLE_ROUTE_NAME,
  largeCamera: 'cameras',
  smallCamera: 'dcameras',
  logType: 'qlogs',
}

console.log(`Getting route data`)
const data = await getPreviewData(props)

console.log('Bundling')
const serveUrl = await bundle({
  entryPoint: path.resolve('./templates/index.ts'),
  webpackOverride: (config) => enableTailwind(config),
})

const replaceCamFiles = async (cam?: CameraType) => {
  if (!cam) return
  console.log(`Downloading and re-encoding ${cam} cam`)
  const replaceFile = async (url: string, name: string) => {
    const path = `${serveUrl}/public/${name}`
    await $`curl ${url} > ${path}.hevc`
    await $`ffmpeg -i ${path}.hevc -c copy ${path}.mp4 -y`
    return `/public/${name}.mp4`
  }
  data.files[cam] = await Promise.all(data.files[cam].map((file, i) => replaceFile(file, `${cam}${i}`)))
}

await Promise.all([replaceCamFiles(props.largeCamera), replaceCamFiles(props.smallCamera)])

console.log(`Rendering`)
const composition = await selectComposition({
  id: 'Preview',
  serveUrl,
  inputProps: { ...props, data } satisfies PreviewProps,
})

await renderMedia({
  composition: composition,
  serveUrl,
  codec: 'h264',
  outputLocation: `out/${props.routeName}.mp4`,
  timeoutInMilliseconds: 120_000,
  onProgress: console.log,
})

console.log('Render done!')
