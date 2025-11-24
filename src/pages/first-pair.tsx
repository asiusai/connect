import { useProfile } from '../api/queries'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'

export const Component = () => {
  const [profile] = useProfile()
  return (
    <div className="min-h-screen w-full bg-surface text-background-x flex items-center justify-center p-4">
      <section className="flex flex-col gap-6 items-center w-full max-w-md bg-background-alt p-8 rounded-2xl shadow-xl border border-white/5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Icon name="add" className="text-primary" size="40" />
          </div>
          <h2 className="text-2xl font-bold">Pair your device</h2>
          <p className="text-base text-background-alt-x">Hey {profile?.email}, scan the QR code on your device to get started.</p>
        </div>

        <div className="w-full bg-background-alt rounded-3xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="info" className="text-primary" size="20" />
            <span className="text-sm font-medium">Don't see a QR code?</span>
          </div>
          <ul className="text-xs text-background-alt-x flex flex-col gap-1 pl-7">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-background-alt-x" />
              Check internet connection
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-background-alt-x" />
              Update openpilot version
            </li>
          </ul>
        </div>

        <p className="text-xs text-center text-background-alt-x px-4">
          If you still cannot see a QR code, your device may already be paired to another account.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button className="w-full py-3 text-sm" leading={<Icon name="camera" />} href="/pair">
            Scan QR Code
          </Button>
          <Button color="text" className="w-full text-background-alt-x hover:text-background-x" href="/logout">
            Sign out
          </Button>
        </div>
      </section>
    </div>
  )
}
