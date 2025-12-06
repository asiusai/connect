import clsx from 'clsx'
import { DetailRow } from '../../components/DetailRow'
import { Route } from '../../types'
import { useRouteParams } from '../../utils/hooks'

export const Info = ({ route, className }: { route: Route; className?: string }) => {
  const { routeName } = useRouteParams()
  return (
    <div className={clsx('bg-background-alt rounded-xl p-4 flex flex-col', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Details</h3>
      <DetailRow label="Route" value={routeName} mono copyable />
      <DetailRow label="Vehicle" value={route.make || route.platform} copyable />
      <DetailRow label="Dongle ID" value={route.dongle_id} mono copyable />
      <DetailRow label="Version" value={route.version} mono copyable />
      <DetailRow label="Git Branch" value={route.git_branch} mono copyable />
      <DetailRow label="Git Commit" value={route.git_commit?.substring(0, 7)} mono copyable />
    </div>
  )
}
