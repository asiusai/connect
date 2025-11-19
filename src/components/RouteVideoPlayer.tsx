import clsx from 'clsx'

import { Loading } from './material/Loading'
import { Player, PlayerRef } from '@remotion/player'
import { createQCameraStreamUrl } from '../utils/helpers'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { Preview } from '../../templates/Preview'
import { useShareSignature } from '../api/queries'
import { Route } from '../types'
import { getRouteDuration } from '../utils/format'
import { RefObject, useEffect } from 'react'

export const RouteVideoPlayer = ({
  playerRef,
  route,
  className,
}: {
  playerRef: RefObject<PlayerRef | null>
  route: Route
  className?: string
}) => {
  const routeName = route.fullname
  const [signature] = useShareSignature(routeName)
  const duration = getRouteDuration(route)!.asSeconds()

  // Removing remotion player timeline
  useEffect(() => document.querySelector('div[style*="user-select: none"][style*="padding-top: 4px"]')?.remove(), [])

  return (
    <div
      className={clsx(
        'relative flex aspect-[241/151] items-center justify-center self-stretch overflow-hidden rounded-t-md bg-surface-container-low isolate',
        className,
      )}
    >
      <Player
        ref={playerRef}
        component={Preview}
        compositionHeight={HEIGHT}
        compositionWidth={WIDTH}
        durationInFrames={duration * FPS}
        fps={FPS}
        style={{ width: '100%' }}
        inputProps={{ routeName, qCamUrl: signature ? createQCameraStreamUrl(routeName, signature) : undefined }}
        autoPlay
        initiallyMuted
        clickToPlay
        controls
        acknowledgeRemotionLicense
        allowFullscreen
      />

      {!signature && <Loading className="absolute h-full w-full" />}
    </div>
  )
}
