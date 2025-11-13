import { Composition } from 'remotion'
import { HelloWorld, myCompSchema } from './HelloWorld'

export const RemotionRoot = () => {
  return (
    <Composition
      id="HelloWorld"
      component={HelloWorld}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      schema={myCompSchema}
      defaultProps={{
        title: 'COMMA CONNECT',
      }}
    />
  )
}
