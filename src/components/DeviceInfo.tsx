import clsx from 'clsx'

import { SHARED_DEVICE } from '~/api/devices'
import { DrawerToggleButton, useDrawerContext } from '~/components/material/Drawer'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { DeviceLocation } from '~/components/DeviceLocation'
import { DeviceStatistics } from '~/components/DeviceStatistics'

import { RouteList } from './RouteList'
import { api } from '~/api'
import { useState } from 'react'
import { Loading } from './material/Loading'

export const DeviceInfo = ({ dongleId }: { dongleId: string }) => {
  const res = api.devices.get.useQuery(['device', dongleId], { params: { dongleId } })
  const device = res.data?.status === 200 ? res.data.body : undefined
  // TODO: remove this. if we're listing the routes for a device you should always be a user, this is for viewing public routes which are being removed
  const isDeviceUser = res.isLoading ? true : device?.is_owner || device?.alias !== SHARED_DEVICE
  const [queueVisible, setQueueVisible] = useState(false)
  const snapshot = api.athena.athena.useMutation({
    onSuccess: (x: any) => setImages([x.body.result.jpegFront, x.body.result.jpegBack]),
  })
  const [images, setImages] = useState<string[]>([])

  const onClickSnapshot = () => {
    setImages([])
    snapshot.mutate({ body: { id: 0, jsonrpc: '2.0', method: 'takeSnapshot', expiry: undefined }, params: { dongleId } })
  }

  const downloadSnapshot = (image: string, index: number) => {
    const link = document.createElement('a')
    link.href = `data:image/jpeg;base64,${image}`
    link.download = `snapshot${index + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const { modal } = useDrawerContext()
  return (
    <>
      <TopAppBar
        className="font-bold"
        leading={!modal ? <img alt="" src="/images/comma-white.png" className="h-8" /> : <DrawerToggleButton />}
      >
        connect
      </TopAppBar>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="h-min overflow-hidden rounded-lg bg-surface-container-low">
          {!device ? <Loading className="h-[240px] size-full" /> : <DeviceLocation dongleId={dongleId} deviceName={device.name} />}
          <div className="flex items-center justify-between p-4">
            {!device ? (
              <div className="h-[32px] skeleton-loader size-full rounded-xs" />
            ) : (
              <div className="inline-flex items-center gap-2">
                <div className={clsx('m-2 size-2 shrink-0 rounded-full', device.is_online ? 'bg-green-400' : 'bg-gray-400')} />

                {<div className="text-lg font-bold">{device.name}</div>}
              </div>
            )}
            <div className="flex gap-4">
              <IconButton name="camera" onClick={onClickSnapshot} />
              <IconButton name="settings" href={`/${dongleId}/settings`} />
            </div>
          </div>
          {isDeviceUser && (
            <>
              <DeviceStatistics dongleId={dongleId} className="p-4" />
              {/* {queueVisible && <UploadQueue dongleId={dongleId} />} */}
              <button
                className={clsx(
                  'flex w-full cursor-pointer justify-center rounded-b-lg bg-surface-container-lowest p-2',
                  queueVisible && 'border-t-2 border-t-surface-container-low',
                )}
                onClick={() => setQueueVisible(!queueVisible)}
              >
                <p className="mr-2">Upload Queue</p>
                <Icon className="text-zinc-500" name={queueVisible ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} />
              </button>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {images.map((image, i) => (
            <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
              <div className="relative p-4">
                <img src={`data:image/jpeg;base64,${image}`} alt={`Device Snapshot ${i + 1}`} />
                <div className="absolute right-4 top-4 p-4">
                  <IconButton className="text-white" name="download" onClick={() => downloadSnapshot(image, i)} />
                  <IconButton className="text-white" name="clear" onClick={() => setImages(images.filter((_, j) => j !== i))} />
                </div>
              </div>
            </div>
          ))}
          {snapshot.isPending && (
            <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
              <div className="p-4">
                <div>Loading snapshots...</div>
              </div>
            </div>
          )}
          {snapshot.isError && (
            <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
              <div className="flex items-center p-4">
                <IconButton className="text-white" name="clear" onClick={() => snapshot.reset()} />
                <span>Error: {snapshot.error.body as any}</span>
              </div>
            </div>
          )}
        </div>
        <RouteList dongleId={dongleId} />
      </div>
    </>
  )
}
