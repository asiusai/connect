import { Drawer, useDrawerContext } from '../components/material/Drawer'
import { Navigate, Outlet } from 'react-router-dom'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { Button } from '../components/material/Button'
import { ButtonBase } from '../components/material/ButtonBase'
import { Icon } from '../components/material/Icon'
import { USERADMIN_URL } from '../utils/consts'
import { Device } from '../types'
import { DrawerToggleButton } from '../components/material/Drawer'
import clsx from 'clsx'
import { List, ListItem, ListItemContent } from '../components/material/List'
import { useLocation } from 'react-router-dom'
import { Loading } from '../components/material/Loading'
import { useDevices, useProfile } from '../api/queries'
import { isSignedIn, storage } from '../utils/helpers'
import { useDongleId } from '../utils/hooks'

const DeviceList = () => {
  const location = useLocation()
  const { setOpen } = useDrawerContext()
  const [devices] = useDevices()

  const isSelected = (device: Device) => location.pathname.includes(device.dongle_id)
  const onClick = (device: Device) => () => {
    setOpen(false)
    storage.setItem('lastSelectedDongleId', device.dongle_id)
  }

  return (
    <List variant="nav" className="overflow-y-auto p-2">
      {!devices ? (
        <Loading className="h-14 rounded-xl" />
      ) : devices.length ? (
        devices.map((device) => (
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

export const DashboardDrawer = () => {
  const { modal, setOpen } = useDrawerContext()
  const onClose = () => setOpen(false)
  const [profile] = useProfile()

  return (
    <>
      <TopAppBar component="h2" leading={modal ? <IconButton name="close" onClick={onClose} /> : undefined}>
        Devices
      </TopAppBar>
      <DeviceList />
      <div className="grow" />
      <Button className="m-4" leading={<Icon name="add" />} href="/pair" onClick={onClose}>
        Add new device
      </Button>
      <div className="m-4 mt-0">
        {!profile ? (
          <Loading className="min-h-16 rounded-md" />
        ) : (
          <div className="flex max-w-full items-center px-3 rounded-md outline outline-1 outline-outline-variant min-h-16">
            <div className="shrink-0 size-10 inline-flex items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="person" filled />
            </div>
            <div className="min-w-0 mx-3">
              <ButtonBase href={USERADMIN_URL}>
                <div className="truncate text-sm text-on-surface">{profile.email}</div>
                <div className="truncate text-xs text-on-surface-variant">{profile.user_id}</div>
              </ButtonBase>
            </div>
            <div className="grow" />
            <IconButton name="logout" href="/logout" />
          </div>
        )}
      </div>
    </>
  )
}

const LoggedIn = () => {
  const [devices] = useDevices()
  const isHome = useLocation().pathname.replace('/', '') === ''

  // We never want them to at /
  if (isHome) {
    const getDefaultDongleId = () => {
      let lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
      if (devices?.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
      return devices?.[0]?.dongle_id
    }
    if (getDefaultDongleId()) return <Navigate to={`/${getDefaultDongleId()}`} />
    else return <Navigate to="/pair" />
  }

  return (
    <Drawer drawer={<DashboardDrawer />}>
      <Outlet />
    </Drawer>
  )
}

export const Component = () => {
  if (!isSignedIn()) return <Navigate to="/login" />
  return <LoggedIn />
}
