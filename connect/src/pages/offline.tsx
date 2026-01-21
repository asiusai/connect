import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { provider } from '../../../shared/provider'

export const OfflinePage = () => {
  return (
    <div className="flex min-h-screen flex-col gap-12 items-center justify-center bg-background p-6">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <Logo className="h-24 w-24" />
        <div className="flex flex-col gap-2 items-center">
          <h1 className="text-2xl">{provider.NAME}</h1>
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-error-alt" />
            <p className="text-lg">offline</p>
          </div>
        </div>
      </div>
      <p className="text-md">Please check your network connection</p>
      <Button color="secondary" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  )
}
