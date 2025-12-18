import { useEffect, useState } from 'react'
import { useProfile } from '../../api/queries'
import { Icon } from '../../components/Icon'
import { ButtonBase } from '../../components/ButtonBase'

export const UserMobile = () => {
  const [profile] = useProfile()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = () => setOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!profile) return null
  return (
    <div className="relative">
      <div
        className="flex items-center justify-center w-10 h-10 bg-background backdrop-blur-md rounded-full border border-white/10 cursor-pointer hover:bg-background/80 transition-colors"
        onClick={() => setOpen((x) => !x)}
      >
        <Icon name="person" filled className="text-white" />
      </div>

      {open && (
        <div className="absolute right-0 mt-2 bg-background-alt border border-white/5 rounded-xl shadow-xl overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-200 p-1 flex flex-col gap-1 z-[999]">
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Signed in as</span>
            <span className="text-sm font-medium truncate block text-white">{profile.email}</span>
          </div>
          <ButtonBase href="/logout" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-red-400 transition-colors">
            <Icon name="logout" className="text-lg" />
            <span className="font-medium text-sm">Log out</span>
          </ButtonBase>
        </div>
      )}
    </div>
  )
}
