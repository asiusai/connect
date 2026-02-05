import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useWebRTC } from '../hooks/useWebRTC'

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

export const Component = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const { cameraView, joystickEnabled, set } = useSettings()
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const [joystickSensitivity, setJoystickSensitivity] = useState(0.25)

  const { status, stats, driverRef, roadRef, remoteAudioRef, startMic, stopMic, sendDataChannel, connect } = useWebRTC({
    audio: true,
    dataChannels: ['data'],
    bridgeServicesIn: ['testJoystick'],
  })

  const joystickBaseRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const joystickIntervalRef = useRef<number | null>(null)
  const keysPressed = useRef<Set<string>>(new Set())

  const handleStartSpeaking = async () => {
    await startMic()
    setIsSpeaking(true)
  }

  const handleStopSpeaking = () => {
    stopMic()
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

  const sendJoystickMessage = useCallback(
    (x: number, y: number) => {
      sendDataChannel(
        'data',
        JSON.stringify({
          type: 'testJoystick',
          data: { axes: [y * joystickSensitivity, -x * joystickSensitivity], buttons: [false] },
        }),
      )
    },
    [joystickSensitivity, sendDataChannel],
  )

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
  }, [joystickEnabled, joystickPosition, sendJoystickMessage])

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
    <>
      <TopAppBar
        trailing={
          <IconButton
            icon={RefreshCwIcon}
            title="Refresh connection"
            className={cn('p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5', !!status && 'animate-spin')}
            onClick={connect}
            disabled={!!status}
          />
        }
      >
        Live
      </TopAppBar>

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
    </>
  )
}
