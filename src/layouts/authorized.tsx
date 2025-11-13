import { Drawer, useDrawerContext } from '~/components/material/Drawer'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { isSignedIn } from '~/api/auth/client'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { Button } from '~/components/material/Button'
import { ButtonBase } from '~/components/material/ButtonBase'
import { Icon } from '~/components/material/Icon'
import { USERADMIN_URL } from '~/api/config'
import { Device } from '~/api/types'
import { DrawerToggleButton } from '~/components/material/Drawer'
import { api } from '~/api'
import clsx from 'clsx'
import { List, ListItem, ListItemContent } from '~/components/material/List'
import storage from '~/utils/storage'
import { useLocation } from 'react-router-dom'
import { Loading } from '~/components/material/Loading'

const DeviceList = () => {
  const location = useLocation()
  const { setOpen } = useDrawerContext()
  const devices = api.devices.devices.useQuery({ queryKey: ['devices'] })

  const isSelected = (device: Device) => location.pathname.includes(device.dongle_id)
  const onClick = (device: Device) => () => {
    setOpen(false)
    storage.setItem('lastSelectedDongleId', device.dongle_id)
  }

  return (
    <List variant="nav" className="overflow-y-auto p-2">
      {devices.isLoading ? (
        <Loading className="h-14 rounded-xl" />
      ) : devices.data?.body.length ? (
        devices.data.body.map((device) => (
          <ListItem
            key={device.dongle_id}
            variant="nav"
            leading={<div className={clsx('m-2 size-2 shrink-0 rounded-full', device.is_online ? 'bg-green-400' : 'bg-gray-400')} />}
            selected={isSelected(device)}
            onClick={onClick(device)}
            href={`/${device.dongle_id}`}
            activeClass="before:bg-primary"
          >
            <ListItemContent
              headline={<span className="font-medium">{device.name}</span>}
              subhead={<span className="font-mono text-xs lowercase">{device.dongle_id}</span>}
            />
          </ListItem>
        ))
      ) : (
        <span className="text-md mx-2 text-on-surface-variant">No devices found</span>
      )}
    </List>
  )
}

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

export const DashboardDrawer = () => {
  const { modal, setOpen } = useDrawerContext()
  const onClose = () => setOpen(false)
  const profile = api.profile.me.useQuery({ queryKey: ['me'] })

  return (
    <>
      <TopAppBar component="h2" leading={modal ? <IconButton name="arrow_back" onClick={onClose} /> : undefined}>
        Devices
      </TopAppBar>
      <DeviceList />
      <div className="grow" />
      <Button className="m-4" leading={<Icon name="add" />} href="/pair" onClick={onClose}>
        Add new device
      </Button>
      <div className="m-4 mt-0">
        {profile.isLoading ? (
          <Loading className="min-h-16 rounded-md" />
        ) : (
          <div className="flex max-w-full items-center px-3 rounded-md outline outline-1 outline-outline-variant min-h-16">
            <div className="shrink-0 size-10 inline-flex items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="person" filled />
            </div>
            <div className="min-w-0 mx-3">
              {profile.data?.status === 200 ? (
                <ButtonBase href={USERADMIN_URL}>
                  <div className="truncate text-sm text-on-surface">{profile.data.body.email}</div>
                  <div className="truncate text-xs text-on-surface-variant">{profile.data.body.user_id}</div>
                </ButtonBase>
              ) : (
                <div>Error loading profile</div>
              )}
            </div>
            <div className="grow" />
            <IconButton name="logout" href="/logout" />
          </div>
        )}
      </div>
    </>
  )
}

export const Component = () => {
  const params = useParams()
  const devices = api.devices.devices.useQuery({ queryKey: ['devices'] })

  const getDefaultDongleId = () => {
    // Do not redirect if dongle ID already selected
    if (params.dongleId) return undefined

    const lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
    if (devices.data?.body.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
    return devices.data?.body[0]?.dongle_id
  }

  if (!isSignedIn()) return <Navigate to="/login" />
  if (getDefaultDongleId()) return <Navigate to={`/${getDefaultDongleId()}`} />
  return <Drawer drawer={<DashboardDrawer />}>{devices.data ? devices.data?.body.length !== 0 ? <Outlet /> : <FirstPair /> : null}</Drawer>
}
