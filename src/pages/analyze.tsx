import { BackButton } from '../components/BackButton'
import { TopAppBar } from '../components/TopAppBar'
import { useAsyncMemo, useRouteParams } from '../utils/hooks'
import { callAthena } from '../api/athena'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const res = useAsyncMemo(async () => {
    console.log('Calling athena')
    const res = await callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } })
    return JSON.stringify(res, null, 2)
  }, [])
  return (
    <>
      <TopAppBar leading={<BackButton fallback={`/${dongleId}`} />}>Analyze</TopAppBar>
      <div className="whitespace-pre">{res}</div>
    </>
  )
}
