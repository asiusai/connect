import clsx from 'clsx'

import { Loading } from './material/Loading'
import { Player } from '@remotion/player'
import { createQCameraStreamUrl } from '../utils/helpers'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { Preview } from '../../templates/Preview'
import { useShareSignature } from '../api/queries'
import { Route } from '../types'
import { getRouteDuration } from '../utils/format'

export const RouteVideoPlayer = ({ route, className }: { route: Route; className?: string }) => {
  const routeName = route.fullname
  const [signature] = useShareSignature(routeName)
  const duration = getRouteDuration(route)!.asSeconds()
  return (
    <div
      className={clsx(
        'relative flex aspect-[241/151] items-center justify-center self-stretch overflow-hidden rounded-t-md bg-surface-container-low isolate',
        className,
      )}
    >
      {signature && (
        <Player
          component={Preview}
          compositionHeight={HEIGHT}
          compositionWidth={WIDTH}
          durationInFrames={duration * FPS}
          fps={FPS}
          style={{ width: '100%' }}
          inputProps={{ routeName, qCamUrl: createQCameraStreamUrl(routeName, signature) }}
          className="size-full object-cover"
          data-testid="route-video"
          autoPlay
          controls
          loop
          allowFullscreen
        />
      )}

      {!signature && <Loading className="absolute inset-0 z-0" />}
    </div>
  )
}
