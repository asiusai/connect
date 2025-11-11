import clsx from 'clsx'

import { takeSnapshot } from '~/api/athena'
import { getDevice, SHARED_DEVICE } from '~/api/devices'
import { DrawerToggleButton, useDrawerContext } from '~/components/material/Drawer'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { DeviceLocation } from '~/components/DeviceLocation'
import { DeviceStatistics } from '~/components/DeviceStatistics'
import { UploadQueue } from '~/components/UploadQueue'
import { getDeviceName } from '~/utils/device'

import {RouteList} from '../components/RouteList'

type DeviceActivityProps = {
  dongleId: string
}

export const DeviceActivity = (props: DeviceActivityProps) => {
  // TODO: device should be passed in from DeviceList
  const [device] = createResource(() => props.dongleId, getDevice)
  // Resource as source of another resource blocks component initialization
  const deviceName = () => (device.latest ? getDeviceName(device.latest) : '')
  // TODO: remove this. if we're listing the routes for a device you should always be a user, this is for viewing public routes which are being removed
  const isDeviceUser = () => (device.loading ? true : device.latest?.is_owner || device.latest?.alias !== SHARED_DEVICE)
  const [queueVisible, setQueueVisible] = createSignal(false)
  const [snapshot, setSnapshot] = createStore<{
    error: string | null
    fetching: boolean
    images: string[]
  }>({
    error: null,
    fetching: false,
    images: [],
  })

  const onClickSnapshot = async () => {
    setSnapshot({ error: null, fetching: true })
    try {
      const resp = await takeSnapshot(props.dongleId)
      const images = [resp.result?.jpegFront, resp.result?.jpegBack].filter((it) => it !== undefined)
      if (images.length > 0) {
        setSnapshot('images', images)
      } else {
        throw new Error('No images found.')
      }
    } catch (err) {
      let error = (err as Error).message
      if (error.includes('Device not registered')) {
        error = 'Device offline'
      }
      setSnapshot('error', error)
    } finally {
      setSnapshot('fetching', false)
    }
  }

  const downloadSnapshot = (image: string, index: number) => {
    const link = document.createElement('a')
    link.href = `data:image/jpeg;base64,${image}`
    link.download = `snapshot${index + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearImage = (index: number) => {
    const newImages = snapshot.images.filter((_, i) => i !== index)
    setSnapshot('images', newImages)
  }

  const clearError = () => setSnapshot('error', null)

  const { modal } = useDrawerContext()

  return (
    <>
      <TopAppBar
        className="font-bold"
        leading={
          <Show when={!modal()} fallback={<DrawerToggleButton />}>
            <img alt="" src="/images/comma-white.png" className="h-8" />
          </Show>
        }
      >
        connect
      </TopAppBar>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="h-min overflow-hidden rounded-lg bg-surface-container-low">
          <Suspense fallback={<div className="h-[240px] skeleton-loader size-full" />}>
            <DeviceLocation dongleId={props.dongleId} deviceName={deviceName()!} />
          </Suspense>
          <div className="flex items-center justify-between p-4">
            <Suspense fallback={<div className="h-[32px] skeleton-loader size-full rounded-xs" />}>
              <div className="inline-flex items-center gap-2">
                <div class={clsx('m-2 size-2 shrink-0 rounded-full', device.latest?.is_online ? 'bg-green-400' : 'bg-gray-400')} />

                {<div className="text-lg font-bold">{deviceName()}</div>}
              </div>
            </Suspense>
            <div className="flex gap-4">
              <IconButton name="camera" onClick={onClickSnapshot} />
              <IconButton name="settings" href={`/${props.dongleId}/settings`} />
            </div>
          </div>
          <Show when={isDeviceUser()}>
            <DeviceStatistics dongleId={props.dongleId} className="p-4" />
            <Show when={queueVisible()}>
              <UploadQueue dongleId={props.dongleId} />
            </Show>
            <button
              class={clsx(
                'flex w-full cursor-pointer justify-center rounded-b-lg bg-surface-container-lowest p-2',
                queueVisible() && 'border-t-2 border-t-surface-container-low',
              )}
              onClick={() => setQueueVisible(!queueVisible())}
            >
              <p className="mr-2">Upload Queue</p>
              <Icon className="text-zinc-500" name={queueVisible() ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} />
            </button>
          </Show>
        </div>
        <div className="flex flex-col gap-2">
          <For each={snapshot.images}>
            {(image, index) => (
              <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
                <div className="relative p-4">
                  <img src={`data:image/jpeg;base64,${image}`} alt={`Device Snapshot ${index() + 1}`} />
                  <div className="absolute right-4 top-4 p-4">
                    <IconButton className="text-white" name="download" onClick={() => downloadSnapshot(image, index())} />
                    <IconButton className="text-white" name="clear" onClick={() => clearImage(index())} />
                  </div>
                </div>
              </div>
            )}
          </For>
          <Show when={snapshot.fetching}>
            <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
              <div className="p-4">
                <div>Loading snapshots...</div>
              </div>
            </div>
          </Show>
          <Show when={snapshot.error}>
            <div className="flex-1 overflow-hidden rounded-lg bg-surface-container-low">
              <div className="flex items-center p-4">
                <IconButton className="text-white" name="clear" onClick={clearError} />
                <span>Error: {snapshot.error}</span>
              </div>
            </div>
          </Show>
        </div>
        <RouteList dongleId={props.dongleId} />
      </div>
    </>
  )
}
