import { BackButton } from '../components/BackButton'
import { TopAppBar } from '../components/TopAppBar'
import { useRouteParams } from '../utils/hooks'

export const Component = () => {
  const { dongleId } = useRouteParams()
  return (
    <>
      <TopAppBar leading={<BackButton fallback={`/${dongleId}`} />}>Analyze</TopAppBar>
      <div></div>
    </>
  )
}
