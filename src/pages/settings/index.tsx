import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { useRouteParams } from '../../utils/hooks'
import { Prime } from './Prime'
import { Preferences } from './Preferences'
import { Users } from './Users'
import { Device } from './Device'
import { env } from '../../utils/env'

export const Component = () => {
  const { dongleId } = useRouteParams()
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Settings</TopAppBar>
      <div className="flex flex-col gap-8 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        <Device />
        <Preferences />
        <Users />
        {!!env.BILLING_URL && <Prime />}
      </div>
    </div>
  )
}
