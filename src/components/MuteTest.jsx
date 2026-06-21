/**
 * ============================================================================
 * FILE: client/src/components/MuteTest.jsx — SIMPLE MUTE TEST (FIXED)
 *
 * PURPOSE:
 *   Tests mute/unmute functionality.
 *   Works even WITHOUT a camera - only needs a microphone!
 *
 * ============================================================================
 */

import { useState, useRef, useCallback } from 'react';

export default function MuteTest() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [status, setStatus] = useState('Click "Start Microphone" to begin');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startMicrophone = useCallback(async () => {
    try {
      setStatus('Requesting microphone access...');
      
      // Try to get BOTH video and audio
      let mediaStream = null;
      let gotVideo = false;
      let gotAudio = false;
      
      try {
        // First try: video + audio
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        gotVideo = true;
        gotAudio = true;
        setStatus('✅ Camera AND microphone connected!');
      } catch (err) {
        console.log('No camera found, trying audio only...');
        
        // Second try: audio only (no camera)
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          gotVideo = false;
          gotAudio = true;
          setStatus('✅ Microphone connected! (No camera - that\'s OK!)');
        } catch (audioErr) {
          setStatus('❌ No microphone found. Please connect a headset or microphone.');
          return;
        }
      }
      
      streamRef.current = mediaStream;
      
      // Set video if available
      if (videoRef.current && gotVideo) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Check track states
      const audioTrack = mediaStream.getAudioTracks()[0];
      const videoTrack = mediaStream.getVideoTracks()[0];
      
      setHasAudio(gotAudio);
      setHasVideo(gotVideo);
      setAudioEnabled(audioTrack?.enabled ?? false);
      setVideoEnabled(videoTrack?.enabled ?? false);
      
      setStatus(`Ready! Audio: ${gotAudio ? 'YES ✅' : 'NO ❌'}, Video: ${gotVideo ? 'YES ✅' : 'NO ❌'}`);
      
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    console.log('=== TOGGLE AUDIO ===');
    
    if (!streamRef.current) {
      setStatus('❌ No stream! Click "Start Microphone" first');
      return;
    }
    
    const audioTracks = streamRef.current.getAudioTracks();
    console.log('Audio tracks:', audioTracks.length);
    
    if (audioTracks.length === 0) {
      setStatus('❌ No audio track found!');
      return;
    }
    
    const track = audioTracks[0];
    console.log('Before - enabled:', track.enabled);
    
    // Toggle
    const newState = !track.enabled;
    track.enabled = newState;
    
    console.log('After - enabled:', track.enabled);
    
    setAudioEnabled(newState);
    setStatus(`Audio ${newState ? 'UNMUTED ✅' : 'MUTED 🔇'} (track.enabled = ${newState})`);
  }, []);

  const toggleVideo = useCallback(() => {
    console.log('=== TOGGLE VIDEO ===');
    
    if (!streamRef.current) {
      setStatus('❌ No stream! Click "Start Microphone" first');
      return;
    }
    
    if (!hasVideo) {
      setStatus('❌ No camera available! You can still use audio.');
      return;
    }
    
    const videoTracks = streamRef.current.getVideoTracks();
    console.log('Video tracks:', videoTracks.length);
    
    if (videoTracks.length === 0) {
      setStatus('❌ No video track found!');
      return;
    }
    
    const track = videoTracks[0];
    console.log('Before - enabled:', track.enabled);
    
    const newState = !track.enabled;
    track.enabled = newState;
    
    console.log('After - enabled:', track.enabled);
    
    setVideoEnabled(newState);
    setStatus(`Video ${newState ? 'ON 📹' : 'OFF 📷'} (track.enabled = ${newState})`);
  }, [hasVideo]);

  return (
    <div style={{ padding: '20px', background: '#1e293b', borderRadius: '12px', margin: '20px' }}>
      <h3>🧪 Mute Test Component</h3>
      <p style={{ color: '#94a3b8', marginBottom: '16px' }}>{status}</p>
      
      {/* Video display (only shows if camera available) */}
      {hasVideo && (
        <div style={{ marginBottom: '16px' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '300px', background: '#0f172a', borderRadius: '8px' }}
          />
        </div>
      )}
      
      {/* No camera message */}
      {!hasVideo && hasAudio && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '16px', 
          background: '#334155', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>🎤 Microphone Only Mode</p>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            No camera detected - that's OK! Mute button still works with just a microphone.
          </p>
        </div>
      )}
      
      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={startMicrophone}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            cursor: 'pointer'
          }}
        >
          🎤 Start Microphone
        </button>
        
        <button
          onClick={toggleAudio}
          disabled={!hasAudio}
          style={{
            background: audioEnabled ? '#22c55e' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            cursor: hasAudio ? 'pointer' : 'not-allowed',
            opacity: hasAudio ? 1 : 0.5
          }}
        >
          {audioEnabled ? '🎤 Mute Audio' : '🔇 Unmute Audio'}
        </button>
        
        <button
          onClick={toggleVideo}
          disabled={!hasVideo}
          style={{
            background: videoEnabled ? '#22c55e' : '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            cursor: hasVideo ? 'pointer' : 'not-allowed',
            opacity: hasVideo ? 1 : 0.5
          }}
        >
          {hasVideo ? (videoEnabled ? '📹 Stop Video' : '📷 Start Video') : '📷 No Camera'}
        </button>
      </div>
      
      {/* Debug info */}
      <div style={{ marginTop: '16px', fontSize: '0.9rem', color: '#94a3b8' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Has microphone: {hasAudio ? 'YES ✅' : 'NO ❌'}</p>
        <p>Has camera: {hasVideo ? 'YES ✅' : 'NO ❌'}</p>
        <p>Audio enabled: {audioEnabled ? 'YES ✅' : 'NO ❌'}</p>
        <p>Video enabled: {videoEnabled ? 'YES ✅' : 'NO ❌'}</p>
        <p>Stream available: {streamRef.current ? 'YES ✅' : 'NO ❌'}</p>
      </div>
    </div>
  );
}
