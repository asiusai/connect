import clsx from 'clsx'
import { useState } from 'react'
import { api } from '~/api'

import { createQCameraStreamUrl } from '~/api/route'
import { IconButton } from '~/components/material/IconButton'
import { Loading } from './material/Loading'
import { Player } from '@remotion/player'
import { Main } from '../templates/Main'

const ERROR_MISSING_SEGMENT = 'This video segment has not uploaded yet or has been deleted.'
const ERROR_UNSUPPORTED_BROWSER = 'This browser does not support Media Source Extensions API.'

export const RouteVideoPlayer = ({
  routeName,
  className,
}: {
  className?: string
  routeName: string
  selection: { startTime: number; endTime: number | undefined }
}) => {
  const shareSignature = api.routes.shareSignature.useQuery({
    queryKey: ['shareSignature', routeName],
    queryData: { params: { routeName } },
  })
  const streamUrl = shareSignature.data ? createQCameraStreamUrl(routeName, shareSignature.data.body) : undefined

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100)

  console.log(streamUrl)
  return (
    <div
      className={clsx(
        'relative flex aspect-[241/151] items-center justify-center self-stretch overflow-hidden rounded-t-md bg-surface-container-low isolate',
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        <Player
          component={Main}
          compositionHeight={1080}
          compositionWidth={1920}
          durationInFrames={duration}
          fps={30}
          style={{ width: '100%' }}
          inputProps={{ routeName }}
          className="size-full object-cover"
          data-testid="route-video"
          autoPlay
          controls
          loop
          allowFullscreen
        />
      </div>

      {/* Loading animation */}
      {isLoading && <Loading className="absolute inset-0 z-0" />}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-1">
          <IconButton name="error" />
          <span className="w-[90%] text-center text-wrap">{error}</span>
        </div>
      )}

      {/* Controls overlay */}
      {/* <div className="absolute inset-0 flex items-end">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="relative flex w-full items-center gap-3 pb-3 px-2">
          <IconButton name={isPlaying ? 'pause' : 'play_arrow'} filled />

          <div className="font-mono text-sm text-on-surface">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </div>
        </div>
      </div> */}
    </div>
  )
}
