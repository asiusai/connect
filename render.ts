import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import { defaultOpenpilotStyle, OpenpilotProps, OpenpilotStyle } from './templates/Openpilot'
import { $ } from 'bun'
import { CameraType } from './src/types'
import { CAMERAS, getPublicRouteData } from './templates/shared'

const routeName = `9748a98e983e0b39/0000002c--d68dde99ca`
const style: OpenpilotStyle = { ...defaultOpenpilotStyle }

console.log(`Getting route data`)
const data = await getPublicRouteData(routeName)

console.log('Bundling')
const serveUrl = await bundle({ entryPoint: path.resolve('./templates/index.ts') })

const replaceCamFiles = async (cam?: CameraType) => {
  if (!cam) return
  console.log(`Downloading and re-encoding ${cam} cam`)
  const key = CAMERAS[cam]
  const replaceFile = async (url: string, name: string) => {
    const path = `${serveUrl}/public/${name}`
    await $`curl ${url} > ${path}.hevc`
    await $`ffmpeg -i ${path}.hevc -c copy ${path}.mp4 -y`
    return `/public/${name}.mp4`
  }
  data.files[key] = await Promise.all(data.files[key].map((file, i) => replaceFile(file, `${cam}${i}`)))
}

await Promise.all([replaceCamFiles(style.largeCamera), replaceCamFiles(style.smallCamera)])

console.log(`Rendering`)
const composition = await selectComposition({
  id: 'Main',
  serveUrl,
  inputProps: {
    routeName,
    style,
    disableCache: false,
    data,
  } satisfies OpenpilotProps,
})

await renderMedia({
  composition: composition,
  serveUrl,
  codec: 'h264',
  outputLocation: `out/${routeName}.mp4`,
  timeoutInMilliseconds: 120_000,
  onProgress: console.log,
})

console.log('Render done!')
