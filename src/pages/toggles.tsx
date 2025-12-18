import { callAthena } from '../api/athena'
import { BackButton } from '../components/BackButton'
import { TopAppBar } from '../components/TopAppBar'
import { useAsyncMemo, useRouteParams } from '../utils/hooks'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const res = useAsyncMemo(async () => {
    return await callAthena({ type: 'getAllParams', dongleId, params: {} })
  }, [])
  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4 relative">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />} className="z-10 bg-transparent">
        Toggles
      </TopAppBar>

      <div className="flex flex-col gap-2">
        {res?.result?.map((x) => (
          <div key={x.key}>
            <span className="text-lg">{x.metadata?.title ?? x.key}</span>
            <span className="opacity-70">{x.metadata?.description}</span>
            <span>{x.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
