import { useProfile } from '../api/queries'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'

export const Component = () => {
  const [profile] = useProfile()
  return (
    <section className="flex flex-col gap-4 py-2 items-center mx-auto max-w-md px-4 mt-4 sm:mt-8 md:mt-16">
      <h2 className="text-xl">Hey {profile?.email}, pair your device!</h2>
      <p className="text-lg">Scan the QR code on your device</p>
      <p className="text-md mt-4">If you cannot see a QR code, check the following:</p>
      <ul className="text-md list-disc list-inside">
        <li>Your device is connected to the internet</li>
        <li>You have installed the latest version of openpilot</li>
      </ul>
      <p className="text-md">
        If you still cannot see a QR code, your device may already be paired to another account. Make sure you have signed in to connect
        with the same account you may have used previously.
      </p>
      <Button className="mt-4" leading={<Icon name="add" />} href="/pair">
        Add new device
      </Button>
      <Button href="/logout">Logout</Button>
    </section>
  )
}
