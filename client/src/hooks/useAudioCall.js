
import { useCallback, useEffect, useRef, useState } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export default function useAudioCall(socket) {
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const connectedCallIdsRef = useRef(new Set());

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  // Get microphone and camera media.
  const getMedia = useCallback(async (type = 'audio') => {
    let stream = localStreamRef.current;

    if (!stream) {
      stream = new MediaStream();
      localStreamRef.current = stream;
    }

    const hasAudio = stream.getAudioTracks().length > 0;
    const hasVideo = stream.getVideoTracks().length > 0;

    const newTracks = [];

    if (!hasAudio) {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      newTracks.push(...audioStream.getAudioTracks());
    }

    if (type === 'video' && !hasVideo) {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      newTracks.push(...videoStream.getVideoTracks());
    }

    newTracks.forEach((track) => {
      stream.addTrack(track);
    });

    setLocalStream(stream);

    return stream;
  }, []);

  const cleanup = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;

    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }

    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    remoteStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];

    const currentCallId = callRef.current?.id;

    if (currentCallId) {
      connectedCallIdsRef.current.delete(currentCallId);
    }

    callRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setCall(null);
  }, []);

  // Notify backend when WebRTC is genuinely connected.
  const notifyCallConnected = useCallback((callId) => {
    if (
      !callId ||
      !socket?.connected ||
      connectedCallIdsRef.current.has(callId)
    ) {
      return;
    }

    connectedCallIdsRef.current.add(callId);

    socket.emit('call:connected', { callId });
  }, [socket]);

  // Create WebRTC peer.
  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;

    const currentCall = callRef.current;

    if (!currentCall) {
      throw new Error('Call information not found');
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    const stream = await getMedia(currentCall.callType);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Receive remote audio and video.
    pc.ontrack = (event) => {
      let incomingStream = remoteStreamRef.current;

      if (!incomingStream) {
        incomingStream = new MediaStream();
        remoteStreamRef.current = incomingStream;
      }

      const alreadyAdded = incomingStream
        .getTracks()
        .some((track) => track.id === event.track.id);

      if (!alreadyAdded) {
        incomingStream.addTrack(event.track);
      }

      setRemoteStream(incomingStream);
    };

    // Send ICE candidates.
    pc.onicecandidate = (event) => {
      const activeCall = callRef.current;

      if (event.candidate && activeCall?.id) {
        socket.emit('webrtc:ice-candidate', {
          callId: activeCall.id,
          signal: event.candidate,
        });
      }
    };

    // Track real connection status.
    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection:', pc.connectionState);

      if (pc.connectionState === 'connected') {
        const activeCall = callRef.current;

        if (activeCall?.id) {
          notifyCallConnected(activeCall.id);
        }

        setCall((current) =>
          current
            ? {
                ...current,
                status: 'connected',
                startedAt: current.startedAt || Date.now(),
              }
            : current
        );
      }

      if (pc.connectionState === 'failed') {
        console.error('WebRTC connection failed');
        cleanup();
      }
    };

    return pc;
  }, [socket, getMedia, cleanup, notifyCallConnected]);

  // Add ICE candidates received before remote description.
  const flushCandidates = useCallback(async (pc) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of candidates) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // Start an audio or video call.
  const startCall = useCallback(
    async (receiver, callType = 'audio', conversationId) => {
      if (
        !socket?.connected ||
        !receiver?._id ||
        !conversationId ||
        callRef.current
      ) {
        return;
      }

      if (!['audio', 'video'].includes(callType)) return;

      const callId = crypto.randomUUID();

      const newCall = {
        id: callId,
        peerId: receiver._id,
        peerName: receiver.name,
        conversationId,
        direction: 'outgoing',
        status: 'ringing',
        callType,
      };

      callRef.current = newCall;
      setCall(newCall);

      try {
        // Caller camera/microphone starts immediately.
        await getMedia(callType);

        socket.emit('call:invite', {
          to: receiver._id,
          callId,
          callType,
          conversationId,
        });

        console.log('Outgoing call:', callType);
      } catch (error) {
        console.error('Could not access call media:', error);
        cleanup();

        alert(
          callType === 'video'
            ? 'Unable to access camera or microphone. Please check permissions.'
            : 'Unable to access microphone. Please check permissions.'
        );
      }
    },
    [socket, getMedia, cleanup]
  );

  // Accept incoming call.
  const acceptCall = useCallback(async () => {
    const currentCall = callRef.current;

    if (
      !currentCall?.id ||
      currentCall.direction !== 'incoming'
    ) {
      return;
    }

    try {
      await getMedia(currentCall.callType);

      setCall((current) =>
        current
          ? { ...current, status: 'connecting' }
          : current
      );

      socket.emit('call:accept', {
        callId: currentCall.id,
      });
    } catch (error) {
      console.error('Media permission failed:', error);

      socket.emit('call:reject', {
        callId: currentCall.id,
      });

      cleanup();

      alert(
        currentCall.callType === 'video'
          ? 'Please allow camera and microphone access.'
          : 'Please allow microphone access.'
      );
    }
  }, [socket, getMedia, cleanup]);

  const rejectCall = useCallback(() => {
    const currentCall = callRef.current;

    if (currentCall?.id) {
      socket.emit('call:reject', {
        callId: currentCall.id,
      });
    }

    cleanup();
  }, [socket, cleanup]);

  const endCall = useCallback(() => {
    const currentCall = callRef.current;

    if (currentCall?.id) {
      socket.emit('call:end', {
        callId: currentCall.id,
      });
    }

    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    const nextMuted = !muted;

    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];

    if (!tracks.length) return;

    const nextCameraOff = !cameraOff;

    tracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });

    setCameraOff(nextCameraOff);
  }, [cameraOff]);

  // Attach local camera preview.
  useEffect(() => {
    const video = localVideoRef.current;

    if (!video) return;

    video.srcObject = localStream || null;

    if (localStream) {
      video.play().catch((error) => {
        console.error('Local video playback error:', error);
      });
    }

    return () => {
      if (video.srcObject === localStream) {
        video.srcObject = null;
      }
    };
  }, [localStream, call]);

  // Attach remote video and audio.
  useEffect(() => {
    const video = remoteVideoRef.current;
    const audio = remoteAudioRef.current;

    if (video) {
      video.srcObject = remoteStream || null;

      if (remoteStream) {
        video.play().catch((error) => {
          console.error('Remote video playback error:', error);
        });
      }
    }

    if (audio) {
      audio.srcObject = remoteStream || null;

      if (remoteStream) {
        audio.play().catch((error) => {
          console.error('Remote audio playback error:', error);
        });
      }
    }
  }, [remoteStream]);

  // Socket events and WebRTC signaling.
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data) => {
      if (callRef.current) {
        socket.emit('call:reject', {
          callId: data.callId,
        });
        return;
      }

      const incomingCall = {
        id: data.callId,
        peerId: data.caller.id,
        peerName: data.caller.name,
        direction: 'incoming',
        status: 'ringing',
        callType: data.callType || 'audio',
      };

      callRef.current = incomingCall;
      setCall(incomingCall);
    };

    const handleAccepted = async ({ callId }) => {
      try {
        const pc = await createPeer();

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:offer', {
          callId,
          signal: offer,
        });

        setCall((current) =>
          current
            ? { ...current, status: 'connecting' }
            : current
        );
      } catch (error) {
        console.error('Could not create call offer:', error);
        endCall();
      }
    };

    const handleOffer = async ({ callId, signal }) => {
      try {
        const pc = await createPeer();

        await pc.setRemoteDescription(
          new RTCSessionDescription(signal)
        );

        await flushCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          callId,
          signal: answer,
        });
      } catch (error) {
        console.error('Could not answer call:', error);
        endCall();
      }
    };

    const handleAnswer = async ({ signal }) => {
      try {
        const pc = peerRef.current;

        if (pc && !pc.remoteDescription) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal)
          );

          await flushCandidates(pc);
        }
      } catch (error) {
        console.error('Could not set call answer:', error);
        endCall();
      }
    };

    const handleCandidate = async ({ signal }) => {
      try {
        const pc = peerRef.current;

        if (!pc || !pc.remoteDescription) {
          pendingCandidatesRef.current.push(signal);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(signal));
      } catch (error) {
        console.error('ICE candidate error:', error);
      }
    };

    const handleCallFinished = () => cleanup();

    const handleBusy = () => {
      alert('This user is already in another call.');
      cleanup();
    };

    const handleError = ({ message }) => {
      alert(message || 'Call could not be started.');
      cleanup();
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleCallFinished);
    socket.on('call:ended', handleCallFinished);
    socket.on('call:busy', handleBusy);
    socket.on('call:error', handleError);

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleCandidate);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleCallFinished);
      socket.off('call:ended', handleCallFinished);
      socket.off('call:busy', handleBusy);
      socket.off('call:error', handleError);

      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleCandidate);
    };
  }, [socket, createPeer, flushCandidates, cleanup, endCall]);

  // Stop media when the hook unmounts.
  useEffect(() => {
    return () => {
      peerRef.current?.close();

      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      remoteStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  return {
    call,
    localStream,
    remoteStream,
    remoteAudioRef,
    localVideoRef,
    remoteVideoRef,
    muted,
    cameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
