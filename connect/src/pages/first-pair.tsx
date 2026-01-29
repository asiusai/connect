import { api } from '../api'
import { ButtonBase } from '../components/ButtonBase'
import { CameraIcon, InfoIcon, PlusIcon } from 'lucide-react'
import { TopAppBar } from '../components/TopAppBar'
import { useAuth } from '../hooks/useAuth'

export const Component = () => {
  const { token } = useAuth()
  const [profile] = api.auth.me.useQuery({ enabled: !!token })
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar>Welcome</TopAppBar>

      <div className="flex-1 flex items-center justify-center p-4">
        <section className="flex flex-col gap-6 items-center w-full max-w-md bg-background-alt p-8 rounded-2xl shadow-xl border border-white/5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
              <PlusIcon className="text-white text-4xl" />
            </div>
            <h2 className="text-2xl font-bold">Pair your device</h2>
            <p className="text-base text-white/60">Hey {profile?.email}, scan the QR code on your device to get started.</p>
          </div>

          <div className="w-full bg-background rounded-xl p-4 flex flex-col gap-2 border border-white/5">
            <div className="flex items-center gap-2">
              <InfoIcon className="text-white text-xl" />
              <span className="text-sm font-medium">Don't see a QR code?</span>
            </div>
            <ul className="text-xs text-white/60 flex flex-col gap-1 pl-7">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/40" />
                Check internet connection
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/40" />
                Update openpilot version
              </li>
            </ul>
          </div>

          <p className="text-xs text-center text-white/40 px-4">If you still cannot see a QR code, your device may already be paired to another account.</p>

          <div className="flex flex-col gap-3 w-full">
            <ButtonBase
              className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              href="/pair"
            >
              <CameraIcon />
              Scan QR Code
            </ButtonBase>
            <ButtonBase className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors text-center" href="/logout">
              Sign out
            </ButtonBase>
          </div>
        </section>
      </div>
    </div>
  )
}
