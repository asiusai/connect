import '../src/index.css'
import { Composition } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview, previewCalculateMetadata, PreviewProps } from './Preview'

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
        routeName: '9748a98e983e0b39/0000002c--d68dde99ca',
        largeCamera: 'cameras',
        smallCamera: 'dcameras',
      }}
    />
  )
}
