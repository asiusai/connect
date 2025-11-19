import QrScanner from 'qr-scanner'

import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'

import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDevices } from '../api/queries'
import { api } from '../api'

const Scanning = () => {
  let videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!videoRef.current) return
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => {
        const token = new URL(result.data).searchParams.get('pair')
        navigate(`/pair?pair=${token}`)
      },
      {},
    )
    void qrScanner.start().catch((reason) => {
      console.error('Error starting QR scanner', reason)
      navigate(`/pair?error=QR code scanner failed`)
    })
    return () => qrScanner.destroy()
  }, [videoRef.current])

  return (
    <div id="video-container" className="flex flex-col gap-4">
      <TopAppBar trailing={<IconButton name="close" href="/" />}>Add new device</TopAppBar>
      <video className="w-full h-[500px]" ref={videoRef} />
      <h2 className="px-8 text-center text-md">Use the viewfinder to scan the QR code on your device</h2>
    </div>
  )
}

const getErrorMessage = (code: number) =>
  ({
    400: 'invalid request',
    401: 'could not decode token - make sure your comma device is connected to the internet',
    403: 'device paired with different owner - make sure you signed in with the correct account',
    404: 'tried to pair invalid device',
    417: 'pair token not true',
  })[code] ?? 'unable to pair'

const Pairing = ({ token }: { token: string }) => {
  const navigate = useNavigate()
  const [_, devices] = useDevices()

  useEffect(() => {
    const effect = async () => {
      try {
        const res = await api.devices.pair.mutate({ body: { pair_token: token } })
        if (res.status !== 200) return navigate(`/pair?error=${getErrorMessage(res.status)}`)

        navigate(`/${res.body.dongle_id}`)
        devices.refetch()
      } catch (error) {
        console.error('Error pairing device', error)
        navigate(`/pair?error=Checking the code failed`)
      }
    }
    effect()
  }, [token])

  return (
    <>
      <TopAppBar>Add new device</TopAppBar>

      <div className="flex flex-col items-center gap-4">
        <Icon name="autorenew" className="animate-spin" size="40" />
        <span className="text-md">Pairing your device...</span>
      </div>
    </>
  )
}

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('pair')
  const error = params.get('error')

  if (error)
    return (
      <>
        <TopAppBar trailing={<IconButton name="close" href="/" />}>Add new device</TopAppBar>

        <div className="flex flex-col items-center gap-4 px-4 max-w-sm mx-auto">
          An error occurred: {error}
          <Button color="primary" onClick={() => navigate(`/pair`)}>
            Retry
          </Button>
        </div>
      </>
    )
  else if (token) return <Pairing token={token} />
  else return <Scanning />
}
