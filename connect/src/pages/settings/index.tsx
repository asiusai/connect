import { TopAppBar } from '../../components/TopAppBar'
import { Prime } from './Prime'
import { Preferences } from './Preferences'
import { Users } from './Users'
import { Device } from './Device'
import { ClearCache } from './ClearCache'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useProviderInfo } from '../../hooks/useAuth'

export const Component = () => {
  const info = useProviderInfo()
  const isOwner = useIsDeviceOwner()

  return (
    <>
      <TopAppBar>Settings</TopAppBar>
      <div className="flex flex-col gap-8 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        {isOwner && <Device />}
        <Preferences />
        {isOwner && <Users />}
        {!!info.billingUrl && isOwner && <Prime />}
        <ClearCache />
      </div>
    </>
  )
}
