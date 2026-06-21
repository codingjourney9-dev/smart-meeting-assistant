/**
 * ============================================================================
 * FILE: client/src/hooks/useVideoCall.js — VIDEO CALL HOOK (WORKS WITHOUT CAMERA)
 *
 * PURPOSE:
 *   Manages WebRTC video/audio calls.
 *   NOW WORKS WITHOUT A CAMERA - only needs a microphone!
 *
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

// Socket.io server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// STUN servers for WebRTC
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function useVideoCall() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [username, setUsername] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);

  // Refs
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const roomIdRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // =========================================================================
  // GET LOCAL MEDIA - FLEXIBLE (works with or without camera)
  // =========================================================================
  const getLocalStream = useCallback(async () => {
    try {
      console.log('[video] Requesting media access...');
      
      let mediaStream = null;
      let gotVideo = false;
      let gotAudio = false;
      
      // Try 1: video + audio
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        gotVideo = true;
        gotAudio = true;
        console.log('[video] Got camera AND microphone');
      } catch (err) {
        console.log('[video] No camera, trying audio only...');
        
        // Try 2: audio only
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          gotVideo = false;
          gotAudio = true;
          console.log('[video] Got microphone only (no camera)');
        } catch (audioErr) {
          console.error('[video] No microphone found either');
          throw new Error('No microphone found. Please connect a headset or microphone.');
        }
      }
      
      // Store the stream
      localStreamRef.current = mediaStream;
      setLocalStream(mediaStream);
      
      // Track what we have
      setHasAudio(gotAudio);
      setHasVideo(gotVideo);
      
      // Set initial states
      const audioTrack = mediaStream.getAudioTracks()[0];
      const videoTrack = mediaStream.getVideoTracks()[0];
      
      if (audioTrack) {
        setAudioEnabled(audioTrack.enabled);
        console.log('[video] Audio track enabled:', audioTrack.enabled);
      }
      
      if (videoTrack) {
        setVideoEnabled(videoTrack.enabled);
        console.log('[video] Video track enabled:', videoTrack.enabled);
      }
      
      return mediaStream;
      
    } catch (err) {
      console.error('[video] Media access error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // =========================================================================
  // TOGGLE AUDIO
  // =========================================================================
  const toggleAudio = useCallback(() => {
    console.log('=== TOGGLE AUDIO ===');
    
    if (!localStreamRef.current) {
      console.error('No stream available');
      return;
    }
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    console.log('Audio tracks:', audioTracks.length);
    
    if (audioTracks.length === 0) {
      console.error('No audio track');
      return;
    }
    
    const track = audioTracks[0];
    console.log('Before - enabled:', track.enabled);
    
    const newState = !track.enabled;
    track.enabled = newState;
    
    console.log('After - enabled:', track.enabled);
    setAudioEnabled(newState);
    
    // Notify peers
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('media-state-changed', {
        roomId: roomIdRef.current,
        audioEnabled: newState,
        videoEnabled: videoEnabled
      });
    }
  }, [videoEnabled]);

  // =========================================================================
  // TOGGLE VIDEO
  // =========================================================================
  const toggleVideo = useCallback(() => {
    console.log('=== TOGGLE VIDEO ===');
    
    if (!hasVideo) {
      console.log('No camera available');
      return;
    }
    
    if (!localStreamRef.current) {
      console.error('No stream available');
      return;
    }
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    console.log('Video tracks:', videoTracks.length);
    
    if (videoTracks.length === 0) {
      console.error('No video track');
      return;
    }
    
    const track = videoTracks[0];
    console.log('Before - enabled:', track.enabled);
    
    const newState = !track.enabled;
    track.enabled = newState;
    
    console.log('After - enabled:', track.enabled);
    setVideoEnabled(newState);
    
    // Notify peers
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('media-state-changed', {
        roomId: roomIdRef.current,
        audioEnabled: audioEnabled,
        videoEnabled: newState
      });
    }
  }, [hasVideo, audioEnabled]);

  // =========================================================================
  // CREATE PEER CONNECTION
  // =========================================================================
  const createPeerConnection = useCallback((remoteSocketId, remoteUsername, remoteUserId) => {
    console.log('Creating peer connection with:', remoteUsername);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track from:', remoteUsername);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.set(remoteSocketId, {
          stream: event.streams[0],
          username: remoteUsername,
          userId: remoteUserId
        });
        return newPeers;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          to: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('Connection state with', remoteUsername, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(remoteSocketId);
          return newPeers;
        });
        peerConnections.current.delete(remoteSocketId);
      }
    };

    peerConnections.current.set(remoteSocketId, pc);
    return pc;
  }, []);

  // =========================================================================
  // JOIN ROOM
  // =========================================================================
  const joinRoom = useCallback(async (targetRoomId, targetUsername) => {
    try {
      setError(null);
      setConnectionState('connecting');
      setUsername(targetUsername);
      setRoomId(targetRoomId);
      roomIdRef.current = targetRoomId;

      // Get local media (works with or without camera)
      await getLocalStream();

      // Connect socket
      const sock = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling']
      });

      sock.on('connect', () => {
        console.log('Connected to signaling server');
        setConnectionState('connected');
      });

      sock.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        setError('Failed to connect to video server');
        setConnectionState('disconnected');
      });

      // Socket event handlers
      sock.on('room-users', async ({ participants }) => {
        console.log('Room users:', participants);
        for (const participant of participants) {
          const pc = createPeerConnection(participant.socketId, participant.username, participant.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sock.emit('offer', { to: participant.socketId, offer });
        }
      });

      sock.on('user-joined', ({ userId, username, socketId }) => {
        console.log('User joined:', username);
      });

      sock.on('offer', async ({ from, fromUsername, offer }) => {
        console.log('Received offer from:', fromUsername);
        let pc = peerConnections.current.get(from);
        if (!pc) {
          pc = createPeerConnection(from, fromUsername, null);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('answer', { to: from, answer });
      });

      sock.on('answer', async ({ from, answer }) => {
        console.log('Received answer from:', from);
        const pc = peerConnections.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      sock.on('ice-candidate', async ({ from, candidate }) => {
        const pc = peerConnections.current.get(from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      sock.on('user-left', ({ socketId, username }) => {
        console.log('User left:', username);
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(socketId);
          return newPeers;
        });
        const pc = peerConnections.current.get(socketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(socketId);
        }
      });

      sock.on('room-full', () => {
        setError('Room is full (max 10 participants)');
        setConnectionState('disconnected');
      });

      // Store socket
      setSocket(sock);
      socketRef.current = sock;

      // Join room
      sock.emit('join-room', {
        roomId: targetRoomId,
        userId,
        username: targetUsername
      });

    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message);
      setConnectionState('disconnected');
    }
  }, [getLocalStream, createPeerConnection, userId]);

  // =========================================================================
  // LEAVE ROOM
  // =========================================================================
  const leaveRoom = useCallback(() => {
    console.log('Leaving room...');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: roomIdRef.current });
      socketRef.current.disconnect();
    }

    setLocalStream(null);
    setPeers(new Map());
    setRoomId(null);
    setAudioEnabled(false);
    setVideoEnabled(false);
    setHasAudio(false);
    setHasVideo(false);
    setIsScreenSharing(false);
    setConnectionState('disconnected');
    setSocket(null);
    socketRef.current = null;
    roomIdRef.current = null;
  }, []);

  // =========================================================================
  // SCREEN SHARING
  // =========================================================================
  const startScreenShare = useCallback(async () => {
    try {
      console.log('Starting screen share...');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      videoTrack.onended = () => {
        stopScreenShare();
      };

      if (socketRef.current && roomIdRef.current) {
        socketRef.current.emit('screen-share-started', { roomId: roomIdRef.current });
      }
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError('Failed to start screen sharing');
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    console.log('Stopping screen share...');

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current && hasVideo) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });
    }

    setIsScreenSharing(false);

    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('screen-share-stopped', { roomId: roomIdRef.current });
    }
  }, [hasVideo]);

  // =========================================================================
  // CLEANUP
  // =========================================================================
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================
  return {
    roomId,
    userId,
    username,
    localStream,
    peers,
    audioEnabled,
    videoEnabled,
    hasAudio,
    hasVideo,
    isScreenSharing,
    connectionState,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    setError
  };
}
