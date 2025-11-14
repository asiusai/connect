import { Composition, Folder } from 'remotion'
import { calculateMetadata, defaultStyle, Main, MainProps } from './Main'
import { FPS, HEIGHT, WIDTH } from './consts'

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
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={MainProps}
        calculateMetadata={calculateMetadata}
        defaultProps={{
          routeName: '',
          style: defaultStyle,
          disableCache: false,
        }}
      />
      <Folder name="Examples">
        {Object.entries(EXAMPLE_ROUTES).map(([k, v]) => (
          <Composition
            id={k}
            component={Main}
            durationInFrames={100}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
            schema={MainProps}
            calculateMetadata={calculateMetadata}
            defaultProps={{
              routeName: v,
              style: defaultStyle,
              disableCache: false,
            }}
          />
        ))}
      </Folder>
    </>
  )
}
