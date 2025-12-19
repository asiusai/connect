import { useState, useEffect, useRef } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { callAthena } from '../../api/athena'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { Icon } from '../../components/Icon'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [joystickEnabled, setJoystickEnabled] = useState(false)
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const [joystickSensitivity, setJoystickSensitivity] = useState(0.25)

  const rtcConnection = useRef<RTCPeerConnection | null>(null)
  const localAudioTrack = useRef<MediaStreamTrack | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const driverRef = useRef<HTMLVideoElement | null>(null)
  const roadRef = useRef<HTMLVideoElement | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const joystickIntervalRef = useRef<number | null>(null)
  const joystickBaseRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    setupRTCConnection()
    return () => disconnectRTCConnection()
  }, [dongleId])

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
    setError(null)
    setStatus('Initiating connection...')

    try {
      // Create a silent audio track for initial negotiation (avoids mic permission prompt)
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
          setError('Connection failed')
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

      const resp = await callAthena({
        type: 'webrtc',
        params: {
          sdp: sdp!,
          cameras: ['driver', 'wideRoad'],
          bridge_services_in: ['testJoystick'],
          bridge_services_out: [],
        },
        dongleId,
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
      setError('Failed to connect: ' + String(err))
      setReconnecting(false)
    }
  }

  const handleStartSpeaking = async () => {
    // Request mic on first use
    if (!localAudioTrack.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localAudioTrack.current = stream.getAudioTracks()[0]
        if (audioSenderRef.current) {
          await audioSenderRef.current.replaceTrack(localAudioTrack.current)
        }
      } catch (e) {
        console.warn('Failed to get user media', e)
        setError('Microphone access denied')
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
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted
      setIsMuted(remoteAudioRef.current.muted)
    }
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
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4 relative">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />} className="z-10 bg-transparent">
        Live
      </TopAppBar>

      {/* Hidden Audio Element */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Status Overlay */}
      {status && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background-alt p-4 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">{status}</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2">
          <Icon name="error" className="text-xl" />
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 grid md:grid-cols-2 gap-px bg-black relative">
          {[driverRef, roadRef].map((ref, i) => (
            <div key={i} className="relative bg-black flex items-center justify-center overflow-hidden">
              <video autoPlay playsInline ref={ref} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>

        {/* Bottom Control Bar */}
        <div className="bg-background-alt/80 backdrop-blur-md border-t border-white/5 p-4 pb-6">
          {joystickEnabled ? (
            <div className="flex flex-col items-center gap-4">
              {/* Joystick */}
              <div
                className="touch-none"
                onPointerDown={handleJoystickStart}
                onPointerMove={handleJoystickMove}
                onPointerUp={handleJoystickEnd}
                onPointerLeave={handleJoystickEnd}
                onPointerCancel={handleJoystickEnd}
              >
                <div ref={joystickBaseRef} className="w-36 h-36 rounded-full bg-white/10 border-2 border-white/30 relative">
                  <div
                    className="w-14 h-14 rounded-full bg-white/90 absolute top-1/2 left-1/2 pointer-events-none"
                    style={{
                      transform: `translate(calc(-50% + ${joystickPosition.x * 44}px), calc(-50% + ${-joystickPosition.y * 44}px))`,
                    }}
                  />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center gap-8">
                {/* Speed Slider */}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={joystickSensitivity}
                    onChange={(e) => setJoystickSensitivity(Number(e.target.value))}
                    className="w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                  <span className="text-[10px] text-white/40">Speed {Math.round(joystickSensitivity * 100)}%</span>
                </div>

                {/* Status */}
                <div className="text-xs text-white/50 min-w-[80px] text-center">
                  {joystickPosition.y > 0.1 ? '▲ Accel' : joystickPosition.y < -0.1 ? '▼ Brake' : ''}
                  {Math.abs(joystickPosition.x) > 0.1 && Math.abs(joystickPosition.y) > 0.1 ? ' · ' : ''}
                  {joystickPosition.x > 0.1 ? '→ Right' : joystickPosition.x < -0.1 ? '← Left' : ''}
                  {Math.abs(joystickPosition.x) <= 0.1 && Math.abs(joystickPosition.y) <= 0.1 ? 'Drag joystick' : ''}
                </div>

                {/* Exit Button */}
                <button
                  onClick={() => setJoystickEnabled(false)}
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto flex items-center justify-between gap-6">
              {/* Mute Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Icon name={isMuted ? 'volume_off' : 'volume_up'} className="text-2xl" />
                </button>
                <span className="text-xs font-medium text-white/40">Audio</span>
              </div>

              {/* Hold to Speak */}
              <div className="flex flex-col items-center gap-2 -mt-4">
                <button
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    isSpeaking
                      ? 'bg-primary text-black scale-110 shadow-[0_0_30px_rgba(var(--color-primary),0.4)]'
                      : 'bg-white text-black hover:bg-gray-100 hover:scale-105'
                  }`}
                  onPointerDown={handleStartSpeaking}
                  onPointerUp={handleStopSpeaking}
                  onPointerLeave={handleStopSpeaking}
                >
                  <Icon name={isSpeaking ? 'mic' : 'mic_off'} className="text-3xl" filled={isSpeaking} />
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isSpeaking ? 'text-primary' : 'text-white/40'}`}>
                  {isSpeaking ? 'Speaking' : 'Hold to Speak'}
                </span>
              </div>

              {/* Joystick Toggle */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setJoystickEnabled(true)}
                  className="w-14 h-14 rounded-full bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <Icon name="gamepad" className="text-2xl" />
                </button>
                <span className="text-xs font-medium text-white/40">Joystick</span>
              </div>

              {/* Reconnect */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={setupRTCConnection}
                  disabled={reconnecting}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    reconnecting ? 'bg-white/5 text-white/20 cursor-wait' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Icon name="refresh" className={`text-2xl ${reconnecting ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs font-medium text-white/40">Refresh</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
