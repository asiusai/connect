import '../index.css'
import { Composition, Still } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview } from './Preview'
import { PreviewProps } from '../../../shared/types'
import { env } from '../../../shared/env'
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
        defaultProps={{
          routeName: env.EXAMPLE_ROUTE_NAME!,
          largeCameraType: 'cameras',
          smallCameraType: 'dcameras',
        }}
      />
      <Still
        id="OG"
        component={OG}
        height={630}
        width={1200}
        schema={OGProps}
        calculateMetadata={ogCalculateMetadata}
        defaultProps={{
          routeName: env.EXAMPLE_ROUTE_NAME!,
        }}
      />
    </>
  )
}
