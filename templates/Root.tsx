import { Composition, Folder } from 'remotion'
import { defaultOpenpilotStyle, Openpilot, openpilotCalculateMetadata, OpenpilotProps } from './Openpilot'
import { FPS, HEIGHT, WIDTH } from './shared'
import { Preview, previewCalculateMetadata, PreviewProps } from './Preview'

const EXAMPLE_ROUTES = {
  Short: '9748a98e983e0b39/0000002c--d68dde99ca',
  Long: '9748a98e983e0b39/00000017--7256bd6447',
}

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
          routeName: '9748a98e983e0b39/0000002c--d68dde99ca',
        }}
      />
      <Composition
        id="Openpilot"
        component={Openpilot}
        durationInFrames={100}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={OpenpilotProps}
        calculateMetadata={openpilotCalculateMetadata}
        defaultProps={{
          routeName: '',
          style: defaultOpenpilotStyle,
          disableCache: false,
        }}
      />
      <Folder name="Examples">
        {Object.entries(EXAMPLE_ROUTES).map(([id, routeName]) => (
          <Composition
            key={id}
            id={id}
            component={Openpilot}
            durationInFrames={100}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
            schema={OpenpilotProps}
            calculateMetadata={openpilotCalculateMetadata}
            defaultProps={{
              routeName,
              style: defaultOpenpilotStyle,
              disableCache: false,
            }}
          />
        ))}
      </Folder>
    </>
  )
}
