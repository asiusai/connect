import { Composition } from 'remotion'
import { calculateMetadata, defaultStyle, Main, MainProps } from './Main'
import { FPS, HEIGHT, WIDTH } from './consts'

export const RemotionRoot = () => {
  return (
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
        routeName: '9748a98e983e0b39/0000002c--d68dde99ca',
        style: defaultStyle,
        disableCache: false,
      }}
    />
  )
}
