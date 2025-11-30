import clsx from 'clsx'

import { getRouteDuration } from '../utils/format'
import { getTimelineEvents, TimelineEvent } from '../utils/derived'
import { useRef } from 'react'
import { FPS } from '../../templates/shared'
import { PlayerRef } from '@remotion/player'
import { useAsyncMemo, useCurrentPlayerFrame, useParams } from '../utils/hooks'
import { useRoute } from '../api/queries'

const getEventInfo = (event: TimelineEvent) => {
  if (event.type === 'engaged') return ['Engaged', 'bg-[#00c853] min-w-[1px]', '1']
  if (event.type === 'overriding') return ['Overriding', 'bg-gray-500 min-w-[1px]', '2']
  if (event.type === 'user_flag') return ['User flag', 'bg-yellow-400 min-w-[2px]', '4']
  if (event.type === 'alert') {
    if (event.alertStatus === 1) return ['User prompt alert', 'bg-amber-400 min-w-[2px]', '3']
    else return ['Critical alert', 'bg-red-600 min-w-[2px]', '3']
  }
  throw new Error(`Invalid event type ${JSON.stringify(event)}`)
}

const MARKER_WIDTH = 3

export const Timeline = ({ playerRef }: { className?: string; playerRef: React.RefObject<PlayerRef | null> }) => {
  const { routeName } = useParams()
  const [route] = useRoute(routeName)
  const events = useAsyncMemo(async () => (route ? await getTimelineEvents(route) : undefined), [route])

  const duration = getRouteDuration(route)?.asSeconds() ?? 0
  const frame = useCurrentPlayerFrame(playerRef)
  let ref = useRef<HTMLDivElement>(null)

  const updateMarker = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width - MARKER_WIDTH)
    playerRef.current?.seekTo(Math.floor((x / rect.width) * duration * FPS))
  }

  const onStart = () => {
    const onMouseMove = (ev: MouseEvent) => updateMarker(ev.clientX)
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return
      updateMarker(ev.touches[0].clientX)
    }
    const onStop = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup', onStop)
      window.removeEventListener('touchend', onStop)
      window.removeEventListener('touchcancel', onStop)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('mouseup', onStop)
    window.addEventListener('touchend', onStop)
    window.addEventListener('touchcancel', onStop)
  }

  const markerOffset = (frame / FPS / duration) * 100
  const durationMs = duration * 1000
  return (
    <div
      ref={ref}
      onMouseDown={(ev) => {
        if (!route) return
        updateMarker(ev.clientX)
        onStart()
      }}
      onTouchStart={(ev) => {
        if (ev.touches.length !== 1 || !route) return
        updateMarker(ev.touches[0].clientX)
        onStart()
      }}
      className={clsx(
        'relative isolate flex h-[10px] cursor-pointer touch-none self-stretch rounded-full bg-blue-900',
        'after:absolute after:inset-0 after:rounded-b-md after:bg-gradient-to-b after:from-black/0 after:via-black/10 after:to-black/30 overflow-hidden',
      )}
      title="Disengaged"
    >
      <div className="absolute inset-0 size-full rounded-b-md ">
        {events?.map((event, i) => {
          const left = (event.route_offset_millis / durationMs) * 100
          const width = event.type === 'user_flag' ? (1000 / durationMs) * 100 : (event.end_route_offset_millis / durationMs) * 100 - left

          const [title, classes, zIndex] = getEventInfo(event)
          return (
            <div
              key={i}
              title={title}
              className={clsx('absolute top-0 h-full', classes)}
              style={{ left: `${left}%`, width: `${width}%`, zIndex }}
            />
          )
        })}
      </div>
      <div
        className="absolute top-0 z-10 h-full"
        style={{
          width: `${MARKER_WIDTH}px`,
          left: `${markerOffset}%`,
        }}
      >
        <div className="absolute inset-x-0 h-full bg-white" style={{ width: MARKER_WIDTH }} />
      </div>
    </div>
  )
}
