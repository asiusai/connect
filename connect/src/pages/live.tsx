import { useEffect, useRef, useState } from 'react'
import { useRouteParams } from '../hooks'
import { toast } from 'sonner'
import { HEIGHT, WIDTH } from '../templates/shared'
import {
  CarIcon,
  GamepadIcon,
  LayoutGridIcon,
  LoaderIcon,
  LucideIcon,
  MicIcon,
  MicOffIcon,
  RefreshCwIcon,
  UserIcon,
  Volume2Icon,
  VolumeOffIcon,
} from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { cn } from '../../../shared/helpers'
import { TopAppBar } from '../components/TopAppBar'
import { IconButton } from '../components/IconButton'
import { useAthena } from '../hooks/useAthena'

export const ControlButton = ({
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  active,
  disabled,
  icon: Icon,
  label,
  primary,
  spin,
}: {
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  active?: boolean
  disabled?: boolean
  icon: LucideIcon
  label: string
  primary?: boolean
  spin?: boolean
}) => (
  <button
    onClick={onClick}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    disabled={disabled}
    className={cn(
      'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all min-w-18',
      primary
        ? active
          ? 'bg-primary text-black'
          : 'bg-white/10 text-white hover:bg-white/20'
        : active
          ? 'bg-white/10 text-white'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
      disabled && 'opacity-50 cursor-not-allowed',
    )}
  >
    <Icon className={cn('text-xl', spin && 'animate-spin')} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
)

const LiveView = ({
  setReconnecting,
  setupRTCConnectionRef,
}: {
  setReconnecting: (v: boolean) => void
  setupRTCConnectionRef: React.RefObject<(() => Promise<void>) | null>
}) => {
  const { dongleId } = useRouteParams()
  const [status, setStatus] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const { cameraView, joystickEnabled, set } = useSettings()
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const [joystickSensitivity, setJoystickSensitivity] = useState(0.25)
  const [stats, setStats] = useState<{ fps: number; latency: number } | null>(null)
  const athena = useAthena()

  const rtcConnection = useRef<RTCPeerConnection | null>(null)
  const localAudioTrack = useRef<MediaStreamTrack | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const driverRef = useRef<HTMLVideoElement | null>(null)
  const roadRef = useRef<HTMLVideoElement | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const joystickIntervalRef = useRef<number | null>(null)
  const joystickBaseRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const audioSenderRef = useRef<RTCRtpSender | null>(null)

  const disconnectRTCConnection = () => {
    if (rtcConnection.current) {
      rtcConnection.current.close()
      rtcConnection.current = null
    }
    if (localAudioTrack.current) {
      localAudioTrack.current.stop()
      localAudioTrack.current = null
    }
    audioSenderRef.current = null
    if (driverRef.current) driverRef.current.srcObject = null
    if (roadRef.current) roadRef.current.srcObject = null
    setIsSpeaking(false)
  }

  const setupRTCConnection = async () => {
    if (!dongleId) return

    disconnectRTCConnection()
    setReconnecting(true)
    setStatus('Initiating connection...')

    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const destination = audioContext.createMediaStreamDestination()
      oscillator.connect(destination)
      oscillator.start()
      const silentTrack = destination.stream.getAudioTracks()[0]
      silentTrack.enabled = false

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'turn:85.190.241.173:3478',
            username: 'testuser',
            credential: 'testpass',
          },
          {
            urls: ['stun:85.190.241.173:3478', 'stun:stun.l.google.com:19302'],
          },
        ],
        iceTransportPolicy: 'all',
      })
      rtcConnection.current = pc

      const dataChannel = pc.createDataChannel('data', { ordered: true })
      dataChannel.onopen = () => {
        dataChannelRef.current = dataChannel
      }
      dataChannel.onclose = () => {
        dataChannelRef.current = null
      }

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })

      const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
      audioTransceiver.sender.replaceTrack(silentTrack)
      audioSenderRef.current = audioTransceiver.sender

      let videoTrackCount = 0
      pc.ontrack = (event) => {
        const newTrack = event.track
        const newStream = new MediaStream([newTrack])

        if (newTrack.kind === 'audio') {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = newStream
          }
        } else {
          videoTrackCount++
          if (videoTrackCount === 1 && driverRef.current) {
            driverRef.current.srcObject = newStream
          } else if (videoTrackCount === 2 && roadRef.current) {
            roadRef.current.srcObject = newStream
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        console.log('ICE State:', state)
        if (['connected', 'completed'].includes(state)) {
          setStatus(null)
        } else if (['failed', 'disconnected'].includes(state)) {
          toast.error('Connection failed')
        }
      }

      setStatus('Creating offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') resolve()
        else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', checkState)
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkState)
            resolve()
          }, 2000)
        }
      })

      setStatus('Sending offer via Athena...')
      const sdp = pc.localDescription?.sdp

      const resp = await athena('webrtc', {
        sdp: sdp!,
        cameras: ['driver', 'wideRoad'],
        bridge_services_in: ['testJoystick'],
        bridge_services_out: [],
      })

      if (!resp || resp.error) throw new Error(resp?.error?.data?.message ?? resp?.error?.message ?? 'Unknown error from Athena')

      const answerSdp = resp.result?.sdp
      const answerType = resp.result?.type

      if (!answerSdp || !answerType) throw new Error('Invalid response from webrtcd')

      await pc.setRemoteDescription(new RTCSessionDescription({ type: answerType as any, sdp: answerSdp }))

      setStatus(null)
      setReconnecting(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect: ' + String(err))
      setReconnecting(false)
    }
  }

  useEffect(() => {
    setupRTCConnectionRef.current = setupRTCConnection
  }, [dongleId])

  useEffect(() => {
    setupRTCConnection()
    return () => disconnectRTCConnection()
  }, [dongleId])

  useEffect(() => {
    let prevFrames = 0
    let prevTimestamp = 0

    const interval = setInterval(async () => {
      if (!rtcConnection.current) return

      const statsReport = await rtcConnection.current.getStats()
      let fps = 0
      let latency = 0

      statsReport.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const frames = report.framesDecoded || 0
          const timestamp = report.timestamp || 0
          if (prevTimestamp > 0 && timestamp > prevTimestamp) {
            const elapsed = (timestamp - prevTimestamp) / 1000
            const newFps = Math.round((frames - prevFrames) / elapsed)
            if (newFps > 0 && newFps < 120) {
              fps = newFps
            }
          }
          prevFrames = frames
          prevTimestamp = timestamp
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = Math.round(report.currentRoundTripTime * 1000) || 0
        }
      })

      if (fps > 0 || latency > 0) {
        setStats((prev) => ({
          fps: fps > 0 ? fps : prev?.fps || 0,
          latency: latency > 0 ? latency : prev?.latency || 0,
        }))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStartSpeaking = async () => {
    if (!localAudioTrack.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localAudioTrack.current = stream.getAudioTracks()[0]
        if (audioSenderRef.current) {
          await audioSenderRef.current.replaceTrack(localAudioTrack.current)
        }
      } catch (e) {
        console.warn('Failed to get user media', e)
        toast.error('Microphone access denied')
        return
      }
    }
    localAudioTrack.current.enabled = true
    setIsSpeaking(true)
  }

  const handleStopSpeaking = () => {
    if (localAudioTrack.current) {
      localAudioTrack.current.enabled = false
    }
    setIsSpeaking(false)
  }

  const toggleMute = () => {
    setIsMuted((m) => {
      const newMuted = !m
      if (!newMuted && remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => {})
      }
      return newMuted
    })
  }

  const sendJoystickMessage = (x: number, y: number) => {
    if (dataChannelRef.current?.readyState === 'open') {
      const message = JSON.stringify({
        type: 'testJoystick',
        data: { axes: [y * joystickSensitivity, -x * joystickSensitivity], buttons: [false] },
      })
      dataChannelRef.current.send(message)
    }
  }

  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!joystickEnabled) return

    const updateFromKeys = () => {
      let x = 0
      let y = 0
      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) y = 1
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) y = -1
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) x = -1
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) x = 1
      setJoystickPosition({ x, y })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
        keysPressed.current.add(key)
        updateFromKeys()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.delete(key)
      updateFromKeys()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keysPressed.current.clear()
    }
  }, [joystickEnabled])

  useEffect(() => {
    if (joystickEnabled) {
      joystickIntervalRef.current = window.setInterval(() => {
        sendJoystickMessage(joystickPosition.x, joystickPosition.y)
      }, 50)
    } else {
      if (joystickIntervalRef.current) clearInterval(joystickIntervalRef.current)
      sendJoystickMessage(0, 0)
    }
    return () => {
      if (joystickIntervalRef.current) clearInterval(joystickIntervalRef.current)
    }
  }, [joystickEnabled, joystickPosition])

  const handleJoystickStart = (e: React.PointerEvent) => {
    if (!joystickBaseRef.current) return
    isDraggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateJoystickPosition(e)
  }

  const handleJoystickMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    updateJoystickPosition(e)
  }

  const handleJoystickEnd = () => {
    isDraggingRef.current = false
    setJoystickPosition({ x: 0, y: 0 })
  }

  const updateJoystickPosition = (e: React.PointerEvent) => {
    if (!joystickBaseRef.current) return
    const rect = joystickBaseRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maxRadius = rect.width / 2 - 32

    let dx = e.clientX - centerX
    let dy = centerY - e.clientY

    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius
      dy = (dy / distance) * maxRadius
    }

    setJoystickPosition({
      x: Math.max(-1, Math.min(1, dx / maxRadius)),
      y: Math.max(-1, Math.min(1, dy / maxRadius)),
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay muted={isMuted} />

      <div className="h-full flex flex-col gap-4 p-4 relative overflow-hidden items-center justify-between">
        <div className={cn(' overflow-hidden flex gap-4 flex-col md:flex-row')}>
          {[
            { videoRef: driverRef, hidden: cameraView === 'road' },
            { videoRef: roadRef, hidden: cameraView === 'driver' },
          ].map(({ videoRef, hidden }, i) => (
            <div
              key={i}
              className={cn('relative rounded-xl overflow-hidden border border-white/5 bg-background-alt', hidden && 'hidden')}
              style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
            >
              <video autoPlay playsInline muted ref={videoRef} className=" object-contain" style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }} />
              {status && (
                <div className="absolute inset-0 flex items-center justify-center bg-background-alt/80 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <LoaderIcon className="animate-spin text-2xl text-white/40" />
                    <span className="text-sm text-white/60">{status}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {joystickEnabled && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="touch-none cursor-pointer"
              onPointerDown={handleJoystickStart}
              onPointerMove={handleJoystickMove}
              onPointerUp={handleJoystickEnd}
              onPointerLeave={handleJoystickEnd}
              onPointerCancel={handleJoystickEnd}
            >
              <div ref={joystickBaseRef} className="w-32 h-32 rounded-full bg-white/5 border border-white/10 relative">
                <div
                  className="w-14 h-14 rounded-full bg-white/20 absolute top-1/2 left-1/2 pointer-events-none"
                  style={{
                    transform: `translate(calc(-50% + ${joystickPosition.x * 36}px), calc(-50% + ${-joystickPosition.y * 36}px))`,
                  }}
                />
              </div>
            </div>

            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={joystickSensitivity}
              onChange={(e) => setJoystickSensitivity(Number(e.target.value))}
              className="w-28 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              style={{ writingMode: 'horizontal-tb', direction: 'ltr' }}
            />
          </div>
        )}

        {stats && (
          <div className="absolute right-4 bottom-2 flex gap-4 text-right">
            <div>
              <div className="text-[10px] text-white/40">Latency</div>
              <div className="text-sm text-cyan-400 font-medium">{stats.latency}ms</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">FPS</div>
              <div className="text-sm text-green-400 font-medium">{stats.fps}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-background-alt border-t border-white/5 p-3 flex items-center justify-center gap-2">
        <ControlButton
          onClick={() => set({ cameraView: cameraView === 'both' ? 'driver' : cameraView === 'driver' ? 'road' : 'both' })}
          icon={cameraView === 'both' ? LayoutGridIcon : cameraView === 'driver' ? UserIcon : CarIcon}
          label={cameraView === 'both' ? 'Both' : cameraView === 'driver' ? 'Driver' : 'Road'}
        />
        <ControlButton onClick={toggleMute} active={isMuted} icon={isMuted ? VolumeOffIcon : Volume2Icon} label="Audio" />
        <ControlButton
          onClick={undefined}
          onPointerDown={handleStartSpeaking}
          onPointerUp={handleStopSpeaking}
          onPointerLeave={handleStopSpeaking}
          active={isSpeaking}
          icon={isSpeaking ? MicIcon : MicOffIcon}
          label={isSpeaking ? 'Speaking' : 'Hold'}
          primary
        />
        <ControlButton onClick={() => set({ joystickEnabled: !joystickEnabled })} active={joystickEnabled} icon={GamepadIcon} label="Joystick" />
      </div>
    </div>
  )
}

export const Component = () => {
  const [reconnecting, setReconnecting] = useState(false)
  const setupRTCConnectionRef = useRef<(() => Promise<void>) | null>(null)

  return (
    <>
      <TopAppBar
        trailing={
          <IconButton
            icon={RefreshCwIcon}
            title="Refresh connection"
            className={cn('p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5', reconnecting && 'animate-spin')}
            onClick={() => setupRTCConnectionRef.current?.()}
            disabled={reconnecting}
          />
        }
      >
        Live
      </TopAppBar>

      <LiveView setReconnecting={setReconnecting} setupRTCConnectionRef={setupRTCConnectionRef} />
    </>
  )
}
