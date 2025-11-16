import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { api } from '~/api'

import { createQCameraStreamUrl } from '~/api/route'
import { IconButton } from '~/components/material/IconButton'
import { Loading } from './material/Loading'
import { Player } from '@remotion/player'
import { Data, defaultStyle, getData, Main } from '../templates/Main'
import { FPS, HEIGHT, WIDTH } from '~/templates/consts'
import { useShareSignature } from '~/api/queries'

const ERROR_MISSING_SEGMENT = 'This video segment has not uploaded yet or has been deleted.'
const ERROR_UNSUPPORTED_BROWSER = 'This browser does not support Media Source Extensions API.'

const useData = (routeName: string) => {
  const [data, setData] = useState<Data>()
  useEffect(() => void getData(routeName.replace('|', '/')).then(setData), [routeName])
  return data
}
export const RouteVideoPlayer = ({
  routeName,
  className,
}: {
  className?: string
  routeName: string
  selection: { startTime: number; endTime: number | undefined }
}) => {
  const shareSignature = useShareSignature(routeName).data?.body
  const streamUrl = shareSignature ? createQCameraStreamUrl(routeName, shareSignature) : undefined

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const data = useData(routeName)
  return (
    <div
      className={clsx(
        'relative flex aspect-[241/151] items-center justify-center self-stretch overflow-hidden rounded-t-md bg-surface-container-low isolate',
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        {data && (
          <Player
            component={Main}
            compositionHeight={HEIGHT}
            compositionWidth={WIDTH}
            durationInFrames={data.duration * FPS}
            fps={FPS}
            style={{ width: '100%' }}
            inputProps={{ routeName, style: defaultStyle, disableCache: true, data }}
            className="size-full object-cover"
            data-testid="route-video"
            autoPlay
            controls
            loop
            allowFullscreen
          />
        )}
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
