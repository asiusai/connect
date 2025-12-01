import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { usePreservedRoutes } from '../api/queries'
import { Route } from '../types'
import { Button } from './material/Button'
import { RouteCard } from './RouteCard'
import { Slider } from './material/Slider'

dayjs.extend(utc)
dayjs.extend(timezone)

const PAGE_SIZE = 10

const getDayHeader = (route: Route) => {
  const date = dayjs.utc(route.start_time).local()
  if (date.isSame(dayjs(), 'day')) return `Today – ${date.format('dddd, MMM D')}`
  else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return `Yesterday – ${date.format('dddd, MMM D')}`
  else if (date.year() === dayjs().year()) return date.format('dddd, MMM D')
  else return date.format('dddd, MMM D, YYYY')
}

export const DriveList = ({ dongleId, className }: { dongleId: string; className?: string }) => {
  const [preserved] = usePreservedRoutes(dongleId)
  const query = api.routes.allRoutes.useInfiniteQuery({
    queryKey: ['allRoutes', dongleId],
    queryData: ({ pageParam }) => ({ query: pageParam as any, params: { dongleId } }),
    initialPageParam: { created_before: undefined, limit: PAGE_SIZE },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.body.length !== PAGE_SIZE) return undefined
      return { created_before: lastPage.body[lastPage.body.length - 1].create_time, limit: PAGE_SIZE }
    },
  })

  let prevDayHeader: string | null = null

  const [params, setParams] = useSearchParams()
  const show = params.has('preserved') ? 'preserved' : 'all'

  const routes = show === 'all' ? query.data?.pages.flatMap((x) => x.body) : preserved
  const hasNextPage = show === 'all' ? query.hasNextPage : false

  return (
    <div className={`relative flex flex-col gap-4 ${className || ''}`}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Drives</h2>
        <Slider
          options={{ all: 'All', preserved: 'Preserved' }}
          value={show}
          onChange={(val) => setParams(val === 'all' ? undefined : { preserved: 'true' }, { replace: true })}
        />
      </div>

      <div className="flex flex-col gap-3">
        {routes?.map((route) => {
          let dayHeader: string | null = getDayHeader(route)

          if (dayHeader === prevDayHeader) dayHeader = null
          else prevDayHeader = dayHeader
          return (
            <Fragment key={`${route.id}-${route.start_time}`}>
              {dayHeader && (
                <div className="pt-4 pb-2 px-2">
                  <h2 className="text-sm font-bold text-white/60">{dayHeader}</h2>
                </div>
              )}
              <RouteCard route={route} />
            </Fragment>
          )
        })}
      </div>
      {hasNextPage && (
        <div className="py-8 flex justify-center col-span-full">
          <Button onClick={() => query.fetchNextPage()}>Load more</Button>
        </div>
      )}
    </div>
  )
}
