import clsx from 'clsx'

import { Icon } from '../../components/Icon'
import { Loading } from '../../components/Loading'
import { getDeviceName } from '../../types'
import { useEffect, useState } from 'react'
import { useDevice } from '../../api/queries'
import { callAthena } from '../../api/athena'
import { useParams, useSearchParams } from 'react-router-dom'
import { Location } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { Navigation } from './Navigation'
import { UserMobileMenu } from './UserMobileMenu'
import { Active, Devices } from './Devices'

const getBatteryColor = (value: number) => (value < 12.1 ? 'text-red-400' : value < 12.4 ? 'text-yellow-400' : 'text-green-400')

export const Component = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId || '')

  const [fade, setFade] = useState(1)
  const [battery, setBattery] = useState<number>()
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('devices') === 'true'

  const setOpen = (newOpen: boolean) => setSearchParams(newOpen ? { devices: 'true' } : {})

  useEffect(() => {
    if (dongleId) {
      callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } }).then((x) =>
        setBattery(x ? x.peripheralState.voltage / 1000 : undefined),
      )
    }
  }, [dongleId])

  useEffect(() => {
    const onScroll = () => setFade(Math.max(0, 1 - window.scrollY / 300))

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <>
      {/* Mobile Header & Hero */}
      <div className="md:hidden fixed top-0 w-full h-[500px] overflow-hidden" style={{ opacity: fade }}>
        <div className="inset-x-0 top-0 flex items-start justify-between px-4 py-4 text-white absolute z-[999]">
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(true)}>
                <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
                <Icon name="keyboard_arrow_down" className="drop-shadow-md" />
              </div>
              <div className="flex items-center gap-3 text-sm font-medium drop-shadow-md opacity-90">
                <Active device={device} />
                {battery && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className={clsx('flex gap-1 items-center', getBatteryColor(battery))}>
                      <Icon name="battery_5_bar" className="rotate-90 !text-[18px]" />
                      <p>{battery.toFixed(1)}V</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <UserMobileMenu />
          </div>
        </div>

        <Location device={device} className="h-full w-full absolute" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none " />
        {fade !== 1 && (
          <div
            className="absolute inset-0 z-[999999]"
            onClick={(e) => {
              e.stopPropagation()
              document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          ></div>
        )}
      </div>

      {/* Desktop Layout Container */}
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        {/* Desktop Hero (Map) */}
        <div className="hidden md:block w-full h-[400px] relative overflow-hidden">
          <Location device={device} className="h-full w-full absolute" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>

        <div className="md:hidden h-[430px] pointer-events-none"></div>

        <div className="w-full flex flex-col gap-6 p-6 relative z-10">
          <div className="md:hidden">
            <ActionBar />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="md:hidden">
                <Navigation />
              </div>
              {/* Desktop: Drive List */}
              <div className="hidden md:block">
                <Routes />
              </div>
              {/* Mobile: Statistics */}
              <div className="md:hidden">
                <Stats />
              </div>
            </div>
            <div className="md:col-span-1 flex flex-col gap-6">
              {/* Desktop: Statistics (moved to right column) */}
              <div className="hidden md:block">
                <Stats />
              </div>
              <Info />
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 w-full bg-surface rounded-b-3xl shadow-2xl overflow-hidden">
            <Devices close={() => setOpen(false)} />
          </div>
          <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
