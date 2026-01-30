import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { useRouteParams } from '../../hooks'
import { Prime } from './Prime'
import { Preferences } from './Preferences'
import { Users } from './Users'
import { Device } from './Device'
import { ClearCache } from './ClearCache'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useAuth } from '../../hooks/useAuth'
import { getProviderInfo } from '../../../../shared/provider'

export const Component = () => {
  const { provider } = useAuth()
  const info = getProviderInfo(provider)
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Settings</TopAppBar>
      <div className="flex flex-col gap-8 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        {isOwner && <Device />}
        <Preferences />
        {isOwner && <Users />}
        {!!info.billingUrl && isOwner && <Prime />}
        <ClearCache />
      </div>
    </div>
  )
}
