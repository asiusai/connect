import { Composition } from 'remotion'
import { calculateMetadata, Main, MainProps } from './Main'

export const RemotionRoot = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={100}
      fps={30}
      width={1920}
      height={1080}
      schema={MainProps}
      calculateMetadata={calculateMetadata}
      defaultProps={{ routeName: '9748a98e983e0b39/0000002c--d68dde99ca' }}
    />
  )
}
