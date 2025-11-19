import QrScanner from 'qr-scanner'

import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'

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
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <div className="relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <video className="w-full h-full object-cover" ref={videoRef} />
          <div className="absolute inset-0 border-[2px] border-white/20 rounded-3xl pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-primary/50 rounded-xl relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="flex flex-col items-center gap-2">
            <Icon name="camera" size="40" className="text-primary mb-2" />
            <h2 className="text-headline-sm font-bold">Scan QR Code</h2>
            <p className="text-body-lg text-on-surface-variant">Point your camera at the QR code displayed on your device screen.</p>
          </div>
          <Button color="text" href="/" leading={<Icon name="arrow_back" />}>
            Go Back
          </Button>
        </div>
      </div>
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
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col items-center justify-center p-4">
      <div className="bg-surface-container-low p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Icon name="autorenew" className="animate-spin text-primary relative z-10" size="48" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-headline-sm font-bold">Pairing device...</h2>
          <p className="text-body-md text-on-surface-variant">Please wait while we verify your device.</p>
        </div>
      </div>
    </div>
  )
}

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('pair')
  const error = params.get('error')

  if (error)
    return (
      <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col items-center justify-center p-4">
        <div className="bg-surface-container-low p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <Icon name="error" className="text-error" size="40" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-headline-sm font-bold">Pairing Failed</h2>
            <p className="text-body-md text-on-surface-variant">{error}</p>
          </div>
          <Button color="primary" onClick={() => navigate(`/pair`)} className="w-full">
            Try Again
          </Button>
          <Button color="text" href="/" className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    )
  else if (token) return <Pairing token={token} />
  else return <Scanning />
}
