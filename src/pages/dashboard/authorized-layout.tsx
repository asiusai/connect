import { Drawer, useDrawerContext } from "~/components/material/Drawer"
import { Navigate, Outlet } from "react-router-dom"
import { isSignedIn } from "~/api/auth/client"
import { IconButton } from "~/components/material/IconButton"
import { TopAppBar } from "~/components/material/TopAppBar"
import { DeviceList } from "./components/DeviceList"
import { Button } from "~/components/material/Button"
import { ButtonBase } from "~/components/material/ButtonBase"
import { Suspense } from "react"
import { Icon } from "~/components/material/Icon"
import { USERADMIN_URL } from "~/api/config"
import { Device } from "~/api/types"
import { FirstPairActivity } from "./activities/FirstPairActivity"


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



export const Component = () => {
  // TODO
  // const [devices, { refetch }] = createResource(getDevices, { initialValue: undefined })
  const devices = { data: [] }

  if (!isSignedIn()) return <Navigate to="/login" />
  return <Drawer drawer={<DashboardDrawer devices={devices.data} />}>
    {devices.data.length !== 0 ? <Outlet /> : <FirstPairActivity />}
  </Drawer>
}
