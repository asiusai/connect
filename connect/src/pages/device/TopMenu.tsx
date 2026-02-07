import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { cn, ZustandType } from '../../../../shared/helpers'
import { useAuth } from '../../hooks/useAuth'
import { Logo } from '../../../../shared/components/Logo'
import { PlusIcon, XIcon } from 'lucide-react'
import { Devices } from './Devices'
import { create } from 'zustand'
import { createPortal } from 'react-dom'

const init = { devices: false, account: false }
export const useTopMenu = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

const MobileSheet = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-999999 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 md:hidden">
      <div className="absolute top-0 left-0 w-full bg-background rounded-b-3xl shadow-2xl overflow-hidden pt-[env(safe-area-inset-top)]">{children}</div>
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />
    </div>,
    document.body,
  )
}

export const DeviceSheet = () => {
  const { devices, set } = useTopMenu()
  return (
    <MobileSheet open={devices} onClose={() => set({ devices: false })}>
      <Devices close={() => set({ devices: false })} />
    </MobileSheet>
  )
}

export const AccountSheet = () => {
  const navigate = useNavigate()
  const { logins, logIn, logOut, id, token } = useAuth()
  const [user] = api.auth.me.useQuery({ enabled: !!token })
  const { account, set } = useTopMenu()

  if (!user) return null
  return (
    <MobileSheet open={account} onClose={() => set({ account: false })}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <h2 className="text-lg font-bold">Switch Account</h2>
        <div className="p-2 -mr-2 cursor-pointer hover:bg-white/5 rounded-full" onClick={() => set({ account: false })}>
          <XIcon className="text-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {logins.map((account) => (
          <div
            key={account.id}
            onClick={() => {
              logIn(account)
              set({ account: false })
              navigate('/')
            }}
            className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors', account.id === id ? 'bg-white/10' : 'hover:bg-white/5')}
          >
            <Logo provider={account.provider} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold truncate">{account.name}</span>
              <span className="text-xs text-white/40 capitalize">{account.provider}</span>
            </div>
            <button
              className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                logOut(account.id)
              }}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-white/60 hover:text-white transition-colors border border-dashed border-white/10 mt-1"
          onClick={() => {
            set({ account: false })
            navigate('/login')
          }}
        >
          <PlusIcon className="text-xl" />
          <span className="font-medium text-sm">Add account</span>
        </div>
      </div>
      <div className="p-2 border-t border-white/5">
        <button
          onClick={async () => {
            if (!confirm('Clear cache and reload?')) return
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations()
              await Promise.all(regs.map((r) => r.unregister()))
            }
            if ('caches' in window) {
              const names = await caches.keys()
              await Promise.all(names.map((n) => caches.delete(n)))
            }
            window.location.reload()
          }}
          className="w-full p-3 rounded-xl hover:bg-white/5 text-sm text-white/40 hover:text-white/60 transition-colors text-center"
        >
          Clear cache
        </button>
      </div>
    </MobileSheet>
  )
}
