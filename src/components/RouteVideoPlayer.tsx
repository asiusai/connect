import clsx from 'clsx'

import { Loading } from './material/Loading'
import { Player, PlayerRef } from '@remotion/player'
import { createQCameraStreamUrl } from '../utils/helpers'
import { FPS, HEIGHT, WIDTH } from '../../templates/shared'
import { Preview } from '../../templates/Preview'
import { useFiles, useShareSignature } from '../api/queries'
import { Route } from '../types'
import { getRouteDuration } from '../utils/format'
import { RefObject, useEffect } from 'react'
import { useParams } from '../utils/hooks'

export const RouteVideoPlayer = ({
  playerRef,
  route,
  className,
}: {
  playerRef: RefObject<PlayerRef | null>
  route: Route
  className?: string
}) => {
  const { routeName } = useParams()
  const [signature] = useShareSignature(routeName)
  const [files] = useFiles(routeName)
  const duration = getRouteDuration(route)!.asSeconds()

  // Removing remotion player timeline
  useEffect(() => document.querySelector('div[style*="user-select: none"][style*="padding-top: 4px"]')?.remove(), [])
  const maxLen = route.maxqlog + 1
  return (
    <div
      className={clsx(
        'relative flex aspect-[241/151] items-center justify-center self-stretch overflow-hidden rounded-t-md bg-background-alt isolate',
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
        inputProps={{
          routeName,
          largeCamera: files?.cameras.length === maxLen ? 'cameras' : 'qcameras',
          logType: 'qlogs',
          smallCamera: files?.dcameras.length === maxLen ? 'dcameras' : undefined,
          data: files ? { files, qCameraUrl: signature ? createQCameraStreamUrl(routeName, signature) : undefined } : undefined,
        }}
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
