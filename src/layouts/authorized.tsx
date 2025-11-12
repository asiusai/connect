import { Drawer, useDrawerContext } from "~/components/material/Drawer"
import { Navigate, Outlet } from "react-router-dom"
import { isSignedIn } from "~/api/auth/client"
import { IconButton } from "~/components/material/IconButton"
import { TopAppBar } from "~/components/material/TopAppBar"
import { DeviceList } from "../components/DeviceList"
import { Button } from "~/components/material/Button"
import { ButtonBase } from "~/components/material/ButtonBase"
import { Suspense } from "react"
import { Icon } from "~/components/material/Icon"
import { USERADMIN_URL } from "~/api/config"
import { Device } from "~/api/types"
import { DrawerToggleButton } from "~/components/material/Drawer"
import { api } from "~/api"
import { Loading } from "~/components/material/Loading"

const FirstPair = () => {
  const { modal } = useDrawerContext()
  return (
    <>
      <TopAppBar
        className="font-bold"
        leading={!modal ? <img alt="" src="/images/comma-white.png" className="h-8" /> : <DrawerToggleButton />}
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

export const DashboardDrawer = (props: { devices?: Device[] }) => {
  const { modal, setOpen } = useDrawerContext()
  const onClose = () => setOpen(false)
  const profile = api.profile.me.useQuery(["me"])

  return (
    <>
      <TopAppBar component="h2" leading={modal ? <IconButton name="arrow_back" onClick={onClose} /> : undefined}>
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
                {profile.data?.status === 200 ? <>
                  <div className="truncate text-sm text-on-surface">{profile.data.body.email}</div>
                  <div className="truncate text-xs text-on-surface-variant">{profile.data.body.user_id}</div>
                </> : <div>Error loading profile</div>}
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


export const Component = () => {
  const devices = api.devices.devices.useQuery(["devices"])

  if (!isSignedIn()) return <Navigate to="/login" />
  if (!devices.data) return <Loading/>
  return <Drawer drawer={<DashboardDrawer devices={devices.data?.body} />}>
    {devices.data?.body.length !== 0 ? <Outlet /> : <FirstPair />}
  </Drawer>
}
