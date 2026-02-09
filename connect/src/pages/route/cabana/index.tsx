import { LogReader } from '../../../../../shared/log-reader'
import { api } from '../../../api'
import { useFiles } from '../../../api/queries'
import { useAsyncEffect, useRouteParams } from '../../../hooks'

const NAME = 'Can'
export const Component = () => {
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
