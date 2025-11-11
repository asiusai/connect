import clsx from 'clsx'

import { isSignedIn } from '~/api/auth/client'
import { USERADMIN_URL } from '~/api/config'
import { getDevices } from '~/api/devices'
import { getProfile } from '~/api/profile'
import storage from '~/utils/storage'
import type { Device } from '~/api/types'

import { Button } from '~/components/material/Button'
import { ButtonBase } from '~/components/material/ButtonBase'
import { Drawer, DrawerToggleButton, useDrawerContext } from '~/components/material/Drawer'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'

import { DeviceList } from './components/DeviceList'
import { DeviceActivity } from './activities/DeviceActivity'
import { RouteActivity } from './activities/RouteActivity'
import { SettingsActivity } from './activities/SettingsActivity'
import { BuildInfo } from '~/components/BuildInfo'
import { PairActivity } from './activities/PairActivity'
import { createResource } from '~/fix'
import { ReactNode, Suspense } from 'react'

export const DashboardDrawer = (props: { devices?: Device[] }) => {
  const { modal, setOpen } = useDrawerContext()
  const onClose = () => setOpen(false)

  const [profile] = createResource({}, getProfile)

  return (
    <>
      <TopAppBar component="h2" leading={modal() ? <IconButton name="arrow_back" onClick={onClose} /> : undefined}>
        Devices
      </TopAppBar>
      <DeviceList className="overflow-y-auto p-2" devices={props.devices} />
      <div className="grow" />
      <Button className="m-4" leading={<Icon name="add" />} href="/pair" onClick={onClose}>
        Add new device
      </Button>
      <div className="m-4 mt-0">
        <ButtonBase href={USERADMIN_URL}>
          <Suspense fallback={<div className="min-h-16 rounded-md skeleton-loader" />}>
            <div className="flex max-w-full items-center px-3 rounded-md outline outline-1 outline-outline-variant min-h-16">
              <div className="shrink-0 size-10 inline-flex items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="person" filled />
              </div>
              <div className="min-w-0 mx-3">
                <ErrorBoundary fallback="Error loading profile">
                  <div className="truncate text-sm text-on-surface">{profile.data?.email}</div>
                  <div className="truncate text-xs text-on-surface-variant">{profile.data?.user_id}</div>
                </ErrorBoundary>
              </div>
              <div className="grow" />
              <IconButton name="logout" href="/logout" />
            </div>
          </Suspense>
        </ButtonBase>
      </div>
    </>
  )
}

const DashboardLayout = (props: { paneOne: ReactNode; paneTwo: ReactNode; paneTwoContent: boolean }) => {
  return (
    <div className="relative size-full overflow-hidden">
      <div
        className={clsx(
          'mx-auto size-full max-w-[1600px] md:grid md:grid-cols-2 lg:gap-2',
          // Flex layout for mobile with horizontal transition
          'flex transition-transform duration-300 ease-in-out',
          props.paneTwoContent ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
        )}
      >
        <div className="min-w-full overflow-y-scroll">{props.paneOne}</div>
        <div className="min-w-full overflow-y-scroll">{props.paneTwo}</div>
      </div>
    </div>
  )
}

const FirstPairActivity = () => {
  const { modal } = useDrawerContext()
  return (
    <>
      <TopAppBar
        className="font-bold"
        leading={!modal() ? <img alt="" src="/images/comma-white.png" className="h-8" /> : <DrawerToggleButton />}
      >
        connect
      </TopAppBar>
      <section className="flex flex-col gap-4 py-2 items-center mx-auto max-w-md px-4 mt-4 sm:mt-8 md:mt-16">
        <h2 className="text-xl">Pair your device</h2>
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
      </section>
    </>
  )
}

export const Component = () => {
  const location = useLocation()
  const urlState = createMemo(() => {
    const parts = location.pathname.split('/').slice(1).filter(Boolean)
    const startTime = parts[2] ? Math.max(Number(parts[2]), 0) : 0
    const endTime = parts[3] ? Math.max(Number(parts[3]), startTime + 1) : undefined
    return {
      dongleId: parts[0] as string | undefined,
      dateStr: parts[1] as string | undefined,
      startTime,
      endTime,
    }
  })

  const [devices, { refetch }] = createResource(getDevices, { initialValue: undefined })

  const getDefaultDongleId = () => {
    // Do not redirect if dongle ID already selected
    if (urlState().dongleId) return undefined

    const lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
    if (devices.data?.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
    return devices.data?.[0]?.dongle_id
  }

  return (
    <Drawer drawer={<DashboardDrawer devices={devices.data} />}>
      {!isSignedIn() ? (
        <Navigate href="/login" />
      ) : urlState().dongleId === 'pair' || !!location.query.pair ? (
        <PairActivity onPaired={refetch} />
      ) : urlState().dongleId ? (
        <DashboardLayout
          paneOne={<DeviceActivity dongleId={dongleId} />}
          paneTwoContent={!!urlState().dateStr}
          paneTwo={
            urlState().dateStr === 'settings' || urlState().dateStr === 'prime' ? (
              <SettingsActivity dongleId={dongleId} />
            ) : urlState().dateStr ? (
              <RouteActivity
                dongleId={dongleId}
                dateStr={urlState().dateStr}
                startTime={urlState().startTime}
                endTime={urlState().endTime}
              />
            ) : (
              <div className="hidden size-full flex-col items-center justify-center gap-4 md:flex">
                <Icon name="search" size="48" />
                <span className="text-md">Select a route to view</span>
                <BuildInfo className="absolute bottom-4" />
              </div>
            )
          }
        />
      ) : getDefaultDongleId() ? (
        <Navigate href={`/${defaultDongleId}`} />
      ) : devices.data?.length === 0 ? (
        <FirstPairActivity />
      ) : (
        <></>
      )}
    </Drawer>
  )
}
