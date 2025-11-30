import '../src/index.css'
import { Composition } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview, previewCalculateMetadata } from './Preview'
import { EXAMPLE_ROUTE_NAME } from '../src/utils/consts'
import { PreviewProps } from '../src/types'

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
      calculateMetadata={previewCalculateMetadata}
      defaultProps={{
        routeName: EXAMPLE_ROUTE_NAME,
        largeCameraType: 'cameras',
        smallCameraType: 'dcameras',
      }}
    />
  )
}
