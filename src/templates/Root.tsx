import { Composition, Folder } from 'remotion'
import { calculateMetadata, defaultStyle, Main, MainProps } from './Main'
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '../utils/consts'

const EXAMPLE_ROUTES = {
  Short: '9748a98e983e0b39/0000002c--d68dde99ca',
  Long: '9748a98e983e0b39/00000017--7256bd6447',
}
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={100}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        schema={MainProps}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          routeName: '',
          style: defaultStyle,
          disableCache: false,
        }}
      />
      <Folder name="Examples">
        {Object.entries(EXAMPLE_ROUTES).map(([id, routeName]) => (
          <Composition
            key={id}
            id={id}
            component={Main}
            durationInFrames={100}
            fps={VIDEO_FPS}
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            schema={MainProps}
            calculateMetadata={calculateMetadata}
            defaultProps={{
              routeName,
              style: defaultStyle,
              disableCache: false,
            }}
          />
        ))}
      </Folder>
    </>
  )
}
