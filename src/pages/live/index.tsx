import { useState, useEffect, useRef } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { callAthena } from '../../api/athena'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [streams, setStreams] = useState<{ stream: MediaStream; label: string }[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const rtcConnection = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    setupRTCConnection()
    return () => {
      disconnectRTCConnection()
    }
  }, [dongleId])

  const disconnectRTCConnection = () => {
    if (rtcConnection.current) {
      rtcConnection.current.close()
      rtcConnection.current = null
    }
    setStreams([])
  }

  const setupRTCConnection = async () => {
    if (!dongleId) return

    disconnectRTCConnection()
    setReconnecting(true)
    setError(null)
    setStatus('Initiating connection...')

    try {
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

      // Add transceivers for 2 expected video streams
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        const newTrack = event.track
        const newStream = new MediaStream([newTrack])
        setStreams((prev) => {
          // Simple unique ID based on track ID or standard label
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

      // Wait for ICE gathering to complete (simplest approach for now)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
        } else {
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

      if (!resp || resp.error) {
        console.log(resp)
        throw new Error(resp?.error?.message || 'Unknown error from Athena')
      }

      // webrtcd returns the answer SDP directly
      const answerSdp = resp.result?.sdp
      const answerType = resp.result?.type

      if (!answerSdp || !answerType) {
        throw new Error('Invalid response from webrtcd')
      }

      await pc.setRemoteDescription(new RTCSessionDescription({ type: answerType as any, sdp: answerSdp }))

      setStatus(null)
      setReconnecting(false)
    } catch (err) {
      console.error(err)
      setError('Failed to connect: ' + String(err))
      setReconnecting(false)
    }
  }

  return (
    <div className="p-5 bg-gray-900 min-h-screen text-white">
      <div className="flex gap-4 mb-5">
        <button
          onClick={setupRTCConnection}
          disabled={reconnecting}
          className={`px-4 py-2 rounded ${reconnecting ? 'bg-gray-600' : 'bg-blue-500'} text-white`}
        >
          {reconnecting ? 'Reconnect...' : 'Reconnect'}
        </button>
      </div>

      {status && <div className="text-blue-400 text-center mb-4">{status}</div>}
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}

      <div className="flex flex-col gap-5">
        {streams.map((item, i) => (
          <div key={i} className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-center mb-2 text-lg">{item.label}</h3>
            <video
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video) video.srcObject = item.stream
              }}
              className="w-full rounded"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
