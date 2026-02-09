import { LogReader } from '../../../../../shared/log-reader'
import { useFiles } from '../../../api/queries'
import { useRouteLocation } from '../../../hooks/useRouteLocation'
import { usePreviewProps } from '../../../hooks/usePreviewProps'
import { useAsyncEffect, useRouteParams } from '../../../hooks'
import { api } from '../../../api'
import { TopAppBar } from '../../../components/TopAppBar'
import { formatDate, formatTime } from '../../../utils/format'
import { RouteVideoPlayer, VideoControls } from '../VideoPlayer'

const NAME = 'Can'
export const Cabana = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })

  const [files] = useFiles(routeName, route)
  const url = files?.logs[0]
  useAsyncEffect(async () => {
    if (!url) return

    const res = await fetch(url)
    if (!res.ok || !res.body) return

    const reader = LogReader(res.body)
    if (!reader) return

    let count = 0
    const data = []
    const limit = 20
    for await (const event of reader) {
      if (!(NAME in event)) continue
      if (count >= limit) break
      console.log()
      const LogMonoTime = Number(new BigUint64Array(event.LogMonoTime.buffer.buffer).at(0)! / 1_000_000n)
      data.push({ LogMonoTime, ...event[NAME] })

      count++
    }
    console.log(JSON.stringify(data))
  }, [url])

  return null
}

export const Component = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const previewProps = usePreviewProps()

  const location = useRouteLocation(route)

  if (!route) return null

  return (
    <>
      <TopAppBar>
        <span>{location}</span>
        {route.start_time && (
          <span className="text-xs md:text-sm font-medium text-white/60">
            {formatDate(route.start_time)} {formatTime(route.start_time)}
          </span>
        )}
      </TopAppBar>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4 p-4 max-w-7xl mx-auto w-full">
        <RouteVideoPlayer className="md:col-span-2 md:order-1" props={previewProps} />
        <VideoControls className="md:col-span-2 md:order-3" />
        <Cabana />
        {/* <Stats route={route} className="md:order-6" /> */}
        {/* <Actions route={route} className="md:order-4" /> */}
        {/* <RouteFiles route={route} className="md:col-span-2 md:row-span-3 md:order-5" /> */}
        {/* <DynamicMap route={route} className="md:order-2" /> */}
        {/* <Info route={route} className="md:order-7" /> */}
      </div>
    </>
  )
}
