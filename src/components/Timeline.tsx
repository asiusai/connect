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

const TimelineEvents = ({ route, events }: { route: Route; events: TimelineEvent[] }) => {
  if (!route) return
  const duration = getRouteDuration(route)?.asMilliseconds() ?? 0
  return (
    <>
      {events.map((event, i) => {
        let left = ''
        let width = ''
        switch (event.type) {
          case 'engaged':
          case 'overriding':
          case 'alert': {
            const { route_offset_millis, end_route_offset_millis } = event
            const offsetPct = (route_offset_millis / duration) * 100
            const endOffsetPct = (end_route_offset_millis / duration) * 100
            const widthPct = endOffsetPct - offsetPct

            left = `${offsetPct}%`
            width = `${widthPct}%`
            break
          }
          case 'user_flag': {
            const { route_offset_millis } = event
            const offsetPct = (route_offset_millis / duration) * 100
            const widthPct = (1000 / duration) * 100

            left = `${offsetPct}%`
            width = `${widthPct}%`
            break
          }
        }

        let classes = ''
        let title = ''
        switch (event.type) {
          case 'engaged':
            title = 'Engaged'
            classes = 'bg-green-800 min-w-[1px]'
            break
          case 'overriding':
            title = 'Overriding'
            classes = 'bg-gray-500 min-w-[1px]'
            break
          case 'alert':
            if (event.alertStatus === 1) {
              title = 'User prompt alert'
              classes = 'bg-amber-600'
            } else {
              title = 'Critical alert'
              classes = 'bg-red-600'
            }
            classes += ' min-w-[2px]'
            break
          case 'user_flag':
            title = 'User flag'
            classes = 'bg-yellow-500 min-w-[2px]'
        }

        const zIndex = {
          engaged: '1',
          overriding: '2',
          alert: '3',
          user_flag: '4',
        }[event.type]

        return <div key={i} title={title} className={clsx('absolute top-0 h-full', classes)} style={{ left, width, zIndex }} />
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
