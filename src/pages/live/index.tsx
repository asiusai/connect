import { useState, useEffect, useRef } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { callAthena } from '../../api/athena'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [streams, setStreams] = useState<{ stream: MediaStream; label: string }[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const rtcConnection = useRef<RTCPeerConnection | null>(null)
  const localAudioTrack = useRef<MediaStreamTrack | null>(null)

  useEffect(() => {
    setupRTCConnection()
    return () => disconnectRTCConnection()
  }, [dongleId])

  const disconnectRTCConnection = () => {
    if (rtcConnection.current) {
      rtcConnection.current.close()
      rtcConnection.current = null
    }
    if (localAudioTrack.current) {
      localAudioTrack.current.stop()
      localAudioTrack.current = null
    }
    setStreams([])
    setIsSpeaking(false)
  }

  const setupRTCConnection = async () => {
    if (!dongleId) return

    disconnectRTCConnection()
    setReconnecting(true)
    setError(null)
    setStatus('Initiating connection...')

    try {
      // Get local audio stream
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localAudioTrack.current = localStream.getAudioTracks()[0]
        localAudioTrack.current.enabled = false
      } catch (e) {
        console.warn('Failed to get user media', e)
        setError('Microphone access denied or unavailable')
      }

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

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })

      const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
      if (localAudioTrack.current) {
        audioTransceiver.sender.replaceTrack(localAudioTrack.current)
      }

      pc.ontrack = (event) => {
        const newTrack = event.track
        const newStream = new MediaStream([newTrack])
        setStreams((prev) => {
          const id = newTrack.id
          if (prev.some((s) => s.label === id)) return prev
          return [...prev, { stream: newStream, label: id }]
        })
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
          bridge_services_in: [],
          bridge_services_out: [],
        },
        dongleId,
      })

      if (!resp || resp.error) throw new Error(resp?.error?.message || 'Unknown error from Athena')

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

  const handleStartSpeaking = () => {
    if (localAudioTrack.current) {
      localAudioTrack.current.enabled = true
      setIsSpeaking(true)
    }
  }

  const handleStopSpeaking = () => {
    if (localAudioTrack.current) {
      localAudioTrack.current.enabled = false
      setIsSpeaking(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground gap-4">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Live</TopAppBar>
      {status && <div className="text-center">{status}</div>}
      {error && <div className="text-red-500 text-center">{error}</div>}

      <div className="p-4 flex flex-col gap-4 flex-1">
        <div className="grid md:grid-cols-2 gap-4">
          {streams.map((item, i) => (
            <video
              key={i}
              autoPlay
              playsInline
              ref={(video) => {
                if (video) video.srcObject = item.stream
              }}
              className="rounded w-full bg-black/10"
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-end items-center gap-4">
          <button
            className={`w-32 h-32 rounded-full font-bold text-xl transition-all ${
              isSpeaking ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-primary hover:bg-primary/90'
            }`}
            onPointerDown={handleStartSpeaking}
            onPointerUp={handleStopSpeaking}
            onPointerLeave={handleStopSpeaking}
          >
            {isSpeaking ? 'Speaking' : 'Hold to Speak'}
          </button>

          <Button onClick={setupRTCConnection} loading={reconnecting} className="w-full max-w-sm">
            {reconnecting ? 'Reconnect...' : 'Reconnect'}
          </Button>
        </div>
      </div>
    </div>
  )
}
