import '../../../shared/index.css'
import { Composition } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview } from './Preview'
import { PreviewProps } from '../../../shared/types'
import { env } from '../../../shared/env'

export const RemotionRoot = () => {
  return (
    <Composition
      id="Preview"
      component={Preview}
      durationInFrames={100}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      schema={PreviewProps}
      defaultProps={{
        routeName: env.EXAMPLE_ROUTE_NAME!,
        largeCameraType: 'cameras',
        smallCameraType: 'dcameras',
      }}
    />
  )
}
