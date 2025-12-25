import clsx from 'clsx'
import { useRoutesSegments } from '../../api/queries'
import { DetailRow } from '../../components/DetailRow'
import { useRouteParams } from '../../utils/hooks'
import { useStorage } from '../../utils/storage'
import { env } from '../../utils/env'

export const Info = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const [routes] = useRoutesSegments(dongleId, { limit: 1 })
  const route = routes?.[0]

  // Automatically toggle if using correct fork
  const [usingCorrectFork, setUsingCorrectFork] = useStorage('usingCorrectFork')
  if (usingCorrectFork === undefined && route?.git_remote?.includes(env.FORK)) setUsingCorrectFork(true)

  return (
    <div className={clsx('flex flex-col gap-4 pb-10', className)}>
      <h2 className="text-xl font-bold px-1">Vehicle Info</h2>
      <div className="bg-background-alt/50 rounded-xl px-4 py-3 flex flex-col border border-white/5">
        {!!route && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
