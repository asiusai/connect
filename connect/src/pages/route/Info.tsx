import clsx from 'clsx'
import { DetailRow } from '../../components/DetailRow'
import { Route } from '../../../../shared/types'

export const Info = ({ route, className }: { route: Route; className?: string }) => {
  return (
    <div className={clsx('bg-background-alt rounded-xl p-4 flex flex-col', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Details</h3>
      <DetailRow label="Route" value={route.fullname.replace('|', '/')} mono copyable />
      <DetailRow label="Dongle ID" value={route.dongle_id} mono copyable />
      <DetailRow label="Vehicle" value={route.platform} copyable />
      <DetailRow label="Repo" value={route.git_remote} href={route.git_remote ? `https://${route.git_remote}` : undefined} />
      <DetailRow label="Branch" value={route.git_branch} mono copyable />
      <DetailRow
        label="Commit"
        value={route.git_commit ? `${route.git_commit.slice(0, 7)} (${route.git_commit_date?.slice(0, 10) ?? '-'})` : undefined}
        mono
        copyable
      />
      <DetailRow label="Version" value={route.version} mono copyable />
    </div>
  )
}
