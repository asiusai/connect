import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { useIsDeviceOwner, useRouteParams } from '../../utils/hooks'
import { Prime } from './Prime'
import { Preferences } from './Preferences'
import { Users } from './Users'
import { Device } from './Device'
import { provider } from '../../../../shared/provider'
import { api } from '../../api'
import { isSignedIn } from '../../utils/helpers'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [profile] = api.auth.me.useQuery({ enabled: isSignedIn() })
  const isOwner = useIsDeviceOwner()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Settings</TopAppBar>
      <div className="flex flex-col gap-8 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        {isOwner && <Device />}
        <Preferences />
        {isOwner && <Users />}
        {!!provider.BILLING_URL && isOwner && <Prime />}

        {profile && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold px-2">Account</h2>
            <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium">{profile.email ?? profile.id}</span>
                <span className="text-xs text-white/60">Signed in</span>
              </div>
              <Button href="/logout" color="error" leading={<Icon name="logout" />}>
                Log out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
