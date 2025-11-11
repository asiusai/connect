import QrScanner from 'qr-scanner'

import { pairDevice } from '~/api/devices'
import { Button } from '~/components/material/Button'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'

import './PairActivity.css'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const toError = (error: unknown): Error => {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('An unknown error occurred', { cause: error })
}

export const Component = () => {
  const onPair = () => {
    // TODO: onPair refetch devices
  }
  const { pair } = useLocation().query
  const pairToken: string | undefined = Array.isArray(pair) ? pair[0] : pair

  const state = createMachine<{
    scanning: {
      value: ReactNode
      to: 'pairing' | 'error'
    }
    pairing: {
      input: { pairToken: string }
      value: ReactNode
      to: 'error'
    }
    error: {
      input: { error: Error }
      value: ReactNode
      to: 'scanning'
    }
  }>({
    initial: pairToken
      ? {
        type: 'pairing',
        input: { pairToken },
      }
      : 'scanning',
    states: {
      scanning(_input, to) {
        let videoRef!: HTMLVideoElement

        onMount(() => {
          const qrScanner = new QrScanner(
            videoRef,
            (result) => {
              qrScanner.destroy()
              to.pairing({ pairToken: result.data })
            },
            {
              highlightScanRegion: true,
            },
          )
          void qrScanner.start().catch((reason) => {
            const error = toError(reason)
            console.error('Error starting QR scanner', error, error.cause)
            to.error({ error })
          })
          onCleanup(() => {
            try {
              qrScanner.destroy()
            } catch (_) { }
          })
        })

        return (
          <div id="video-container" className="fixed inset-0 bg-black text-white">
            <video className="absolute inset-0 size-full object-cover" ref={videoRef} />
            <div className="prose absolute inset-0 flex flex-col justify-between pb-7">
              <TopAppBar trailing={<IconButton name="close" href="/" />}>Add new device</TopAppBar>
              <h2 className="px-8 text-center text-md">Use the viewfinder to scan the QR code on your device</h2>
            </div>
          </div>
        )
      },
      pairing(input, to) {
        const navigate = useNavigate()

        pairDevice(input.pairToken)
          .then((dongleId) => navigate(`/${dongleId}`))
          .then(props.onPaired)
          .catch((reason) => {
            const error = toError(reason)
            console.error('Error pairing device', error, error.cause)
            to.error({ error })
          })

        return (
          <>
            <TopAppBar>Add new device</TopAppBar>

            <div className="flex flex-col items-center gap-4">
              <Icon name="autorenew" className="animate-spin" size="40" />
              <span className="text-md">Pairing your device...</span>
            </div>
          </>
        )
      },
      error(input, to) {
        return (
          <>
            <TopAppBar trailing={<IconButton name="close" href="/" />}>Add new device</TopAppBar>

            <div className="flex flex-col items-center gap-4 px-4 max-w-sm mx-auto">
              An error occurred: {input.error.message}
              <Button color="primary" onClick={() => to.scanning()}>
                Retry
              </Button>
            </div>
          </>
        )
      },
    },
  })

  return <div>{state.value}</div>
}
