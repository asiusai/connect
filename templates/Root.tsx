import '../src/index.css'
import { Composition, Still } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview, previewCalculateMetadata } from './Preview'
import { PreviewProps } from '../src/types'
import { env } from '../src/utils/env'
import { OG, ogCalculateMetadata, OGProps } from './OG'

export const RemotionRoot = () => {
  return (
    <>
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
          routeName: env.EXAMPLE_ROUTE_NAME,
          largeCameraType: 'cameras',
          smallCameraType: 'dcameras',
        }}
      />
      <Still
        id="OG"
        component={OG}
        height={HEIGHT}
        width={WIDTH}
        schema={OGProps}
        calculateMetadata={ogCalculateMetadata}
        defaultProps={{
          routeName: '9748a98e983e0b39/0000002c--d68dde99ca',
        }}
      />
    </>
  )
}
