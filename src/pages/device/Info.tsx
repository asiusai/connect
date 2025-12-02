import { useRoutes } from '../../api/queries'
import { DetailRow } from '../../components/DetailRow'
import { useParams } from '../../utils/hooks'

export const Info = () => {
  const { dongleId } = useParams()
  const [routes] = useRoutes(dongleId, 1)
  const route = routes?.[0]
  return (
    <div className="flex flex-col gap-4 pb-10">
      <h2 className="text-xl font-bold px-2">Vehicle Info</h2>
      <div className="bg-background-alt rounded-xl px-4 py-3 flex flex-col">
        {!!route && (
          <>
            <DetailRow label="Repo" value={route.git_remote} href={route.git_remote ? `https://${route.git_remote}` : undefined} />
            <DetailRow label="Branch" value={route.git_branch} mono copyable />
            <DetailRow
              label="Commit"
              value={route.git_commit ? `${route.git_commit.slice(0, 7)} (${route.git_commit_date?.slice(0, 10) ?? '-'})` : undefined}
              mono
              copyable
            />
            <DetailRow label="Version" value={route.version} mono copyable />
            <DetailRow label="Make" value={route.make} copyable />
            <DetailRow label="Platform" value={route.platform} copyable />
            <DetailRow label="VIN" value={route.vin} mono copyable />
          </>
        )}
      </div>
    </div>
  )
}
