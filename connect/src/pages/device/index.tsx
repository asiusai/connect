import { Loading } from '../../components/Loading'
import { api } from '../../api'
import { Location } from './Location'
import { RoutesTab } from './RoutesTab'
import { ControlsTab } from './ControlsTab'
import { DeviceTab } from './DeviceTab'
import { DeveloperTab } from './DeveloperTab'
import { LiveCamera, useLiveView } from './LiveCamera'
import { LiveData } from './LiveData'
import { AppsTab } from './AppsTab'
import { useRouteParams, useScroll } from '../../hooks'
import { DeviceTitle } from './DeviceTitle'
import { DeviceSheet, AccountSheet } from './TopMenu'
import { Navigate } from 'react-router-dom'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../../../shared/helpers'
import { CarIcon, SlidersHorizontalIcon, SmartphoneIcon, CodeIcon, BlocksIcon, type LucideIcon } from 'lucide-react'

type Tab = 'drives' | 'controls' | 'device' | 'developer' | 'apps'

const TABS: { key: Tab; label: string; icon: LucideIcon; requiresPilot?: boolean }[] = [
  { key: 'drives', label: 'Drives', icon: CarIcon },
  { key: 'device', label: 'Device', icon: SmartphoneIcon },
  { key: 'controls', label: 'Controls', icon: SlidersHorizontalIcon, requiresPilot: true },
  { key: 'developer', label: 'Developer', icon: CodeIcon, requiresPilot: true },
  { key: 'apps', label: 'Apps', icon: BlocksIcon, requiresPilot: true },
]

const Tabs = () => {
  const { homeTab, usingAsiusPilot, set } = useSettings()

  const selectedTab = TABS.find((t) => t.key === homeTab)
  const tabDisabled = selectedTab?.requiresPilot && !usingAsiusPilot
  const currentTab = tabDisabled ? TABS[0] : (selectedTab ?? TABS[0])
  const activeIdx = TABS.findIndex((t) => t.key === currentTab.key)
  return (
    <div className="flex justify-center bottom-full z-10 mb-2 absolute left-[50%] -translate-x-1/2">
      <div className="flex bg-background-alt rounded-xl p-1 gap-1 relative">
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-white transition-all duration-200 ease-out"
          style={{ width: `calc(${100 / TABS.length}% - 4px)`, left: `calc(${(activeIdx * 100) / TABS.length}% + 2px)` }}
        />
        {TABS.map(({ key, icon: Icon, requiresPilot }) => {
          const disabled = requiresPilot && !usingAsiusPilot
          return (
            <button
              key={key}
              onClick={() => !disabled && set({ homeTab: key })}
              className={cn(
                'relative z-10 aspect-square w-11 flex items-center justify-center rounded-lg transition-colors duration-200',
                disabled ? 'text-white/15 cursor-not-allowed' : homeTab === key ? 'text-black' : 'text-white/60 hover:text-white',
              )}
            >
              <Icon className="text-xl!" strokeWidth={homeTab === key && !disabled ? 2.5 : 1.75} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
export const Component = () => {
  const { dongleId } = useRouteParams()
  const [device, { loading, error }] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const { homeTab, routesType, usingAsiusPilot, set } = useSettings()
  const viewMode = useLiveView((x) => x.viewMode)

  const scroll = useScroll()

  if (loading) return <Loading className="h-screen w-screen" />
  if (error) return <Navigate to="/" />

  const selectedTab = TABS.find((t) => t.key === homeTab)
  const tabDisabled = selectedTab?.requiresPilot && !usingAsiusPilot
  const currentTab = tabDisabled ? TABS[0] : (selectedTab ?? TABS[0])
  const height = 400
  return (
    <>
      <DeviceSheet />
      <AccountSheet />
      <div className="w-full sticky top-0" style={{ height }}>
        {viewMode === 'camera' ? <LiveCamera /> : viewMode === 'data' ? <LiveData /> : <Location device={device} className="h-full w-full" />}
        <DeviceTitle style={{ opacity: 1 - scroll / height, pointerEvents: scroll >= height ? 'none' : 'auto' }} />
        <div className="pointer-events-none absolute inset-0 bg-background z-999" style={{ opacity: scroll / height }} />
      </div>

      <div className="flex flex-col bg-background relative flex-1">
        <Tabs />
        <div className="flex flex-col px-6 pt-4 pb-6 gap-4 max-w-3xl w-full mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{currentTab.label}</h2>
            {currentTab.key === 'drives' && (
              <button
                onClick={() => set({ routesType: routesType === 'preserved' ? 'all' : 'preserved' })}
                className={cn('text-sm font-medium transition-all', routesType === 'preserved' ? 'text-white' : 'text-white/30 hover:text-white/50')}
              >
                {routesType === 'preserved' ? 'Show all' : 'Preserved'}
              </button>
            )}
          </div>

          {currentTab.key === 'drives' && <RoutesTab />}
          {currentTab.key === 'controls' && <ControlsTab />}
          {currentTab.key === 'device' && <DeviceTab />}
          {currentTab.key === 'developer' && <DeveloperTab />}
          {currentTab.key === 'apps' && <AppsTab />}
        </div>
      </div>
    </>
  )
}
