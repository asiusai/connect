import clsx from 'clsx'

import { useDrawerContext } from '~/components/material/Drawer'
import { List, ListItem, ListItemContent } from '~/components/material/List'
import type { Device } from '~/api/types'
import { getDeviceName } from '~/utils/device'
import storage from '~/utils/storage'
import { useLocation } from 'react-router-dom'
import { Suspense } from 'react'

type DeviceListProps = {
  className?: string
  devices: Device[] | undefined
}

export const DeviceList = (props: DeviceListProps) => {
  const location = useLocation()
  const { setOpen } = useDrawerContext()

  const isSelected = (device: Device) => location.pathname.includes(device.dongle_id)
  const onClick = (device: Device) => () => {
    setOpen(false)
    storage.setItem('lastSelectedDongleId', device.dongle_id)
  }

  return (
    <List variant="nav" className={props.className}>
      <Suspense fallback={<div className="h-14 skeleton-loader rounded-xl" />}>
        {props.devices?.length ? (
          props.devices.map((device) => (
            <ListItem
              variant="nav"
              leading={<div className={clsx('m-2 size-2 shrink-0 rounded-full', device.is_online ? 'bg-green-400' : 'bg-gray-400')} />}
              selected={isSelected(device)}
              onClick={onClick(device)}
              href={`/${device.dongle_id}`}
              activeClass="before:bg-primary"
            >
              <ListItemContent
                headline={<span className="font-medium">{getDeviceName(device)}</span>}
                subhead={<span className="font-mono text-xs lowercase">{device.dongle_id}</span>}
              />
            </ListItem>
          ))
        ) : (
          <span className="text-md mx-2 text-on-surface-variant">No devices found</span>
        )}
      </Suspense>
    </List>
  )
}
