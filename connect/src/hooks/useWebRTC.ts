import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRouteParams } from '.'
import { useDevice } from './useDevice'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'turn:85.190.241.173:3478', username: 'testuser', credential: 'testpass' },
  { urls: ['stun:85.190.241.173:3478', 'stun:stun.l.google.com:19302'] },
]

type UseWebRTCOptions = {
  audio?: boolean
  dataChannels?: string[]
  bridgeServicesIn?: string[]
  bridgeServicesOut?: string[]
  cameras?: string[]
}

export const useWebRTC = (options: UseWebRTCOptions = {}) => {
  const { audio = false, dataChannels = [], bridgeServicesIn = [], bridgeServicesOut = [], cameras = ['driver', 'wideRoad'] } = options
  const { dongleId } = useRouteParams()
  const { call } = useDevice()

  const [status, setStatus] = useState<string | null>('Connecting...')
  const [stats, setStats] = useState<{ fps: number; latency: number } | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const driverRef = useRef<HTMLVideoElement | null>(null)
  const roadRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localAudioTrack = useRef<MediaStreamTrack | null>(null)
  const audioSenderRef = useRef<RTCRtpSender | null>(null)
  const dataChannelRefs = useRef<Map<string, RTCDataChannel>>(new Map())

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localAudioTrack.current) {
      localAudioTrack.current.stop()
      localAudioTrack.current = null
    }
    audioSenderRef.current = null
    if (driverRef.current) driverRef.current.srcObject = null
    if (roadRef.current) roadRef.current.srcObject = null
    dataChannelRefs.current.clear()
  }, [])

  const connect = useCallback(async () => {
    if (!dongleId || !call) return

    disconnect()
    setStatus('Initiating connection...')

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: 'all' })
      pcRef.current = pc

      for (const name of dataChannels) {
        const ch = pc.createDataChannel(name, { ordered: true })
        ch.onopen = () => dataChannelRefs.current.set(name, ch)
        ch.onclose = () => dataChannelRefs.current.delete(name)
      }

      // Add video transceivers based on requested cameras
      for (let i = 0; i < cameras.length; i++) {
        pc.addTransceiver('video', { direction: 'recvonly' })
      }

      if (audio) {
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const destination = audioContext.createMediaStreamDestination()
        oscillator.connect(destination)
        oscillator.start()
        const silentTrack = destination.stream.getAudioTracks()[0]
        silentTrack.enabled = false

        const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
        audioTransceiver.sender.replaceTrack(silentTrack)
        audioSenderRef.current = audioTransceiver.sender
      }

      let videoTrackCount = 0
      pc.ontrack = (event) => {
        const track = event.track
        const stream = new MediaStream([track])
        if (track.kind === 'audio') {
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream
        } else {
          videoTrackCount++
          if (videoTrackCount === 1 && driverRef.current) driverRef.current.srcObject = stream
          else if (videoTrackCount === 2 && roadRef.current) roadRef.current.srcObject = stream
        }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (['connected', 'completed'].includes(state)) setStatus(null)
        else if (['failed', 'disconnected'].includes(state)) {
          toast.error('Connection lost')
          setStatus('Disconnected')
        }
      }

      // Handle incoming data channels from device (for bridge_services_out)
      pc.ondatachannel = (event) => {
        const channel = event.channel
        dataChannelRefs.current.set(channel.label, channel)
        channel.onclose = () => dataChannelRefs.current.delete(channel.label)
      }

      setStatus('Creating offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve()
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', check)
        setTimeout(() => {
          pc.removeEventListener('icegatheringstatechange', check)
          resolve()
        }, 2000)
      })

      setStatus('Connecting to device...')
      const payload = {
        sdp: pc.localDescription!.sdp,
        cameras,
        bridge_services_in: bridgeServicesIn,
        bridge_services_out: bridgeServicesOut,
      }
      console.log('[WebRTC] Calling webrtc RPC with:', { cameras, bridge_services_in: bridgeServicesIn, bridge_services_out: bridgeServicesOut })
      const res = await call('webrtc', payload)

      if (!res?.sdp || !res?.type) throw new Error('Device unreachable')
      await pc.setRemoteDescription(new RTCSessionDescription({ type: res.type as any, sdp: res.sdp }))
      setStatus(null)
    } catch (err) {
      console.error(err)
      setStatus('Failed to connect')
      toast.error('WebRTC: ' + String(err))
    }
  }, [audio, bridgeServicesIn, bridgeServicesOut, call, cameras, dataChannels, disconnect, dongleId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: only needs to run once
  useEffect(() => {
    if (!dongleId || !call) return
    connect()
    return () => disconnect()
  }, [call, dongleId])

  // Stats polling
  useEffect(() => {
    let prevFrames = 0
    let prevTimestamp = 0

    const interval = setInterval(async () => {
      if (!pcRef.current) return
      const report = await pcRef.current.getStats()
      let fps = 0
      let latency = 0

      report.forEach((r) => {
        if (r.type === 'inbound-rtp' && r.kind === 'video') {
          const frames = r.framesDecoded || 0
          const ts = r.timestamp || 0
          if (prevTimestamp > 0 && ts > prevTimestamp) {
            const elapsed = (ts - prevTimestamp) / 1000
            const newFps = Math.round((frames - prevFrames) / elapsed)
            if (newFps > 0 && newFps < 120) fps = newFps
          }
          prevFrames = frames
          prevTimestamp = ts
        }
        if (r.type === 'candidate-pair' && r.state === 'succeeded') {
          latency = Math.round(r.currentRoundTripTime * 1000) || 0
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

  const startMic = async () => {
    if (!localAudioTrack.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localAudioTrack.current = stream.getAudioTracks()[0]
        if (audioSenderRef.current) await audioSenderRef.current.replaceTrack(localAudioTrack.current)
      } catch {
        toast.error('Microphone access denied')
        return
      }
    }
    localAudioTrack.current.enabled = true
  }

  const stopMic = () => {
    if (localAudioTrack.current) localAudioTrack.current.enabled = false
  }

  const sendDataChannel = (channel: string, data: string) => {
    const ch = dataChannelRefs.current.get(channel)
    if (ch?.readyState === 'open') ch.send(data)
  }

  return {
    status,
    stats,
    connect,
    disconnect,
    driverRef,
    roadRef,
    remoteAudioRef,
    startMic,
    stopMic,
    sendDataChannel,
    dataChannelRefs,
  }
}
