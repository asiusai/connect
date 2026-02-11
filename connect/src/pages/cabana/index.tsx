import { TopAppBar } from '../../components/TopAppBar'
import { MessageList } from '../route/cabana/MessageList'
import { MessageDetail } from '../route/cabana/MessageDetail'
import { DbcSelector } from '../route/cabana/DBCSelector'
import { useDbc } from '../route/cabana/useDbc'
import { useLiveCan } from './useLiveCan'
import { useCabanaStore } from '../route/cabana/store'

export const Component = () => {
  const { status } = useLiveCan()
  useDbc()

  const loading = useCabanaStore((s) => s.loading)
  const messageCount = useCabanaStore((s) => s.messages.size)

  return (
    <div className="flex flex-col h-screen">
      <TopAppBar trailing={<DbcSelector />}>
        <span className="font-medium">Live CAN</span>
        {status && <span className="text-xs text-white/50">{status}</span>}
        {!status && loading && <span className="text-xs text-white/50">Waiting for data...</span>}
        {!status && !loading && <span className="text-xs text-green-400">{messageCount} messages</span>}
      </TopAppBar>
      <div className="flex-1 grid md:grid-cols-2 gap-4 p-4 min-h-0">
        <MessageList className="" />
        <MessageDetail className="" />
      </div>
    </div>
  )
}
