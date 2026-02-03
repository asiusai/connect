import { BarcodeDetector } from 'barcode-detector/ponyfill'

import { ButtonBase } from '../components/ButtonBase'
import { CircleAlertIcon, LoaderIcon } from 'lucide-react'
import { TopAppBar } from '../components/TopAppBar'
import { Button } from '../components/Button'
import { Logo } from '../../../shared/components/Logo'
import { Provider } from '../../../shared/provider'
import { useAuth } from '../hooks/useAuth'

import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'

const Scanning = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()
  const scanningRef = useRef(false)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const detectorRef = useRef<BarcodeDetector | undefined>(undefined)
  const scanFrameIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const startScanning = async () => {
      if (!videoRef.current) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        streamRef.current = stream
        videoRef.current.srcObject = stream

        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        detectorRef.current = detector
        scanningRef.current = true

        const scanFrame = async () => {
          if (!scanningRef.current || !videoRef.current || !detectorRef.current) return

          try {
            const results = await detectorRef.current.detect(videoRef.current)
            if (results.length > 0) {
              const token = new URL(results[0].rawValue).searchParams.get('pair')
              navigate(`/pair?pair=${token}`)
              return
            }
          } catch (e) {
            console.warn(e)
            // Ignore detection errors, continue scanning
          }

          scanFrameIdRef.current = requestAnimationFrame(scanFrame)
        }

        // Wait for video to be ready before starting detection
        await videoRef.current.play()
        scanFrame()
      } catch (error) {
        console.error('Error starting QR scanner', error)
        if ((error as Error).name === 'NotAllowedError') {
          navigate(`/pair?error=Camera permission denied`)
        } else if ((error as Error).name === 'NotFoundError') {
          navigate(`/pair?error=No camera found`)
        } else if ((error as Error).name === 'NotReadableError') {
          navigate(`/pair?error=Camera is in use by another application`)
        } else {
          navigate(`/pair?error=QR code scanner failed`)
        }
      }
    }

    startScanning()

    return () => {
      scanningRef.current = false
      if (scanFrameIdRef.current !== undefined) {
        cancelAnimationFrame(scanFrameIdRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
      <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <video className="w-full h-full object-cover" ref={videoRef} />
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center max-w-xs">
        <h2 className="text-xl font-bold">Scan QR Code</h2>
        <p className="text-sm text-white/60">Point your camera at the QR code displayed on your device screen.</p>
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
  const [_, devices] = api.devices.devices.useQuery({})

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
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="bg-background-alt p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
          <LoaderIcon className="animate-spin text-white relative z-10 text-5xl" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-bold">Pairing device...</h2>
          <p className="text-sm text-white/60">Please wait while we verify your device.</p>
        </div>
      </div>
    </div>
  )
}
const Err = ({ error }: { error: string }) => {
  const navigate = useNavigate()
  const { provider, setProvider } = useAuth()
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="bg-background-alt p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <CircleAlertIcon className="text-red-400 text-4xl" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Pairing Failed</h2>
          <p className="text-sm text-white/60">{error}</p>
        </div>
        <ButtonBase onClick={() => navigate(`/pair`)} className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors">
          Try Again
        </ButtonBase>
        <div className="flex flex-col gap-2 w-full">
          <p className="text-sm text-white/60">
            Are you sure it was a <span className="text-error">{provider}</span> device? Try other providers:
          </p>
          <div className="flex gap-2 justify-center">
            {Provider.options
              .filter((x) => x !== provider)
              .map((x) => (
                <Button
                  key={x}
                  color="secondary"
                  leading={<Logo provider={x} className="size-5" />}
                  onClick={() => {
                    setProvider(x)
                    window.location.reload()
                  }}
                >
                  {x}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export const Component = () => {
  const [params] = useSearchParams()
  const token = params.get('pair')
  const error = params.get('error')

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar>Pair Device</TopAppBar>
      {error ? <Err error={error} /> : token ? <Pairing token={token} /> : <Scanning />}
    </div>
  )
}
