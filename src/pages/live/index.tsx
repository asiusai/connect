import { useState, useEffect, useRef } from 'react';
import { useRouteParams } from '../../utils/hooks';
import { callAthena } from '../../api/athena';

export const Component = () => {
  const { dongleId } = useRouteParams();
  const [streams, setStreams] = useState<{ stream: MediaStream; label: string }[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const rtcConnection = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    setupRTCConnection();
    return () => {
      disconnectRTCConnection();
    };
  }, [dongleId]);

  const disconnectRTCConnection = () => {
    if (rtcConnection.current) {
      rtcConnection.current.close();
      rtcConnection.current = null;
    }
    setStreams([]);
  };

  const setupRTCConnection = async () => {
    if (!dongleId) return;
    
    disconnectRTCConnection();
    setReconnecting(true);
    setError(null);
    setStatus("Initiating connection...");

    try {
       // Send start signal
       await callAthena({
         type: 'setSdpAnswer',
         params: { answer: { type: "start" } },
         dongleId
       });

       const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "turn:85.190.241.173:3478",
            username: "testuser",
            credential: "testpass",
          },
          {
            urls: ["stun:85.190.241.173:3478", "stun:stun.l.google.com:19302"]
          }
        ],
        iceTransportPolicy: "all",
      });
      rtcConnection.current = pc;

      pc.ontrack = (event) => {
        const newTrack = event.track;
        const newStream = new MediaStream([newTrack]);
        setStreams(prev => {
            if (prev.some(s => s.label === newTrack.label)) return prev;
            return [...prev, { stream: newStream, label: newTrack.label }];
        });
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.type === 'relay') {
            callAthena({
                type: 'setSdpAnswer',
                params: { answer: { type: 'candidate', candidate: event.candidate } },
                dongleId
            });
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE State:", state);
        if (['connected', 'completed'].includes(state)) {
            setStatus(null);
        } else if (['failed', 'disconnected'].includes(state)) {
            setError("Connection failed");
        }
      };

      setStatus("Fetching offer...");
      const offerResp = await callAthena({ type: 'getSdp', params: undefined, dongleId });
      
      if (!offerResp || !offerResp.result || offerResp.result.type !== 'offer') {
          setError("Failed to get offer from device.");
          return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offerResp.result));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
              resolve();
          } else {
              const checkState = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
              }
              pc.addEventListener('icegatheringstatechange', checkState);
              // Fallback timeout in case ice gathering takes too long
              setTimeout(() => {
                   pc.removeEventListener('icegatheringstatechange', checkState);
                   resolve();
              }, 5000); 
          }
      });
      
      await callAthena({
          type: 'setSdpAnswer',
          params: { answer },
          dongleId
      });

      setStatus(null);
      setReconnecting(false);

    } catch (err) {
        console.error(err);
        setError("Failed to connect");
        setReconnecting(false);
    }
  };

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
                    ref={video => {
                        if (video) video.srcObject = item.stream;
                    }}
                    className="w-full rounded"
                />
            </div>
        ))}
      </div>
    </div>
  );
}