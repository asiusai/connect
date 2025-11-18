import clsx from 'clsx'

import { getRouteDuration } from '../utils/format'
import { Route } from '../types'
import { TimelineEvent } from '../utils/derived'
import { useRef } from 'react'
import { FPS } from '../../templates/shared'
import { useCallback, useSyncExternalStore } from 'react'
import { PlayerRef } from '@remotion/player'

export const useCurrentPlayerFrame = (ref: React.RefObject<PlayerRef | null>) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const { current } = ref
      if (!current) return () => undefined
      current.addEventListener('frameupdate', onStoreChange)
      return () => current.removeEventListener('frameupdate', onStoreChange)
    },
    [ref],
  )

  const data = useSyncExternalStore<number>(
    subscribe,
    () => ref.current?.getCurrentFrame() ?? 0,
    () => 0,
  )

  return data
}

const getEventInfo = (event: TimelineEvent) => {
  if (event.type === 'engaged') return ['Engaged', 'bg-green-800 min-w-[1px]', '1']
  if (event.type === 'overriding') return ['Overriding', 'bg-gray-500 min-w-[1px]', '2']
  if (event.type === 'user_flag') return ['User flag', 'bg-yellow-500 min-w-[2px]', '4']
  if (event.type === 'alert') {
    if (event.alertStatus === 1) return ['User prompt alert', 'bg-amber-600 min-w-[2px]', '3']
    else return ['Critical alert', 'bg-red-600 min-w-[2px]', '3']
  }
  throw new Error(`Invalid event type ${JSON.stringify(event)}`)
}
const TimelineEvents = ({ route, events }: { route: Route; events: TimelineEvent[] }) => {
  if (!route) return
  const duration = getRouteDuration(route)?.asMilliseconds() ?? 0
  return (
    <>
      {events.map((event, i) => {
        const left = (event.route_offset_millis / duration) * 100
        const width = event.type === 'user_flag' ? (1000 / duration) * 100 : (event.end_route_offset_millis / duration) * 100 - left

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
    </>
  )
}

const MARKER_WIDTH = 3

export const Timeline = ({
  route,
  className,
  events,
  playerRef,
}: {
  className?: string
  route: Route
  events: TimelineEvent[]
  playerRef: React.RefObject<PlayerRef | null>
}) => {
  const duration = getRouteDuration(route)?.asSeconds() ?? 0
  const frame = useCurrentPlayerFrame(playerRef)
  let ref = useRef<HTMLDivElement>(null)

  const updateMarker = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width - MARKER_WIDTH)
    playerRef.current?.seekTo((x / rect.width) * duration * FPS)
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
  return (
    <div className="flex flex-col">
      <div className="h-1 bg-surface-container-high">
        <div className="h-full bg-white" style={{ width: `calc(${markerOffset}% + 1px)` }} />
      </div>
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
          'relative isolate flex h-8 cursor-pointer touch-none self-stretch rounded-b-md bg-blue-900',
          'after:absolute after:inset-0 after:rounded-b-md after:bg-gradient-to-b after:from-black/0 after:via-black/10 after:to-black/30',
          className,
        )}
        title="Disengaged"
      >
        <div className="absolute inset-0 size-full rounded-b-md overflow-hidden">
          <TimelineEvents route={route} events={events} />
        </div>
        <div
          className="absolute top-0 z-10 h-full"
          style={{
            width: `${MARKER_WIDTH}px`,
            left: `${markerOffset}%`,
          }}
        >
          <div className="absolute inset-x-0 h-full w-px bg-white" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-[calc(50%+1px)]">
            <div className="size-0 border-x-8 border-b-[12px] border-x-transparent border-b-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
