/**
 * ============================================================================
 * FILE: client/src/components/VideoGrid.jsx — VIDEO GRID DISPLAY
 *
 * PURPOSE:
 *   Displays all video streams in a responsive grid layout.
 *   Shows local video (you) and remote videos (other participants).
 *
 * CONNECTIONS:
 *   - Used by: client/src/pages/VideoRoom.jsx
 *   - Receives: localStream, peers (Map), username, media states
 *
 * ============================================================================
 */

import { useEffect, useRef } from 'react';

export default function VideoGrid({
  localStream,
  peers,
  username,
  audioEnabled,
  videoEnabled,
  isScreenSharing
}) {
  const localVideoRef = useRef(null);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('[VideoGrid] Local video stream set');
    }
  }, [localStream]);

  // Log mute state changes
  useEffect(() => {
    console.log('[VideoGrid] Audio enabled:', audioEnabled);
    console.log('[VideoGrid] Video enabled:', videoEnabled);
  }, [audioEnabled, videoEnabled]);

  return (
    <div className="video-grid">
      {/* Local Video (You) */}
      <div className={`video-container ${!videoEnabled ? 'video-off' : ''} ${isScreenSharing ? 'screen-sharing' : ''}`}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
        />
        <div className="video-overlay">
          <span className="username">{username} (You)</span>
          <div className="media-indicators">
            {!audioEnabled && <span className="muted-icon" title="Microphone muted">🔇</span>}
            {!videoEnabled && <span className="video-off-icon" title="Camera off">📷</span>}
            {isScreenSharing && <span className="screen-icon" title="Screen sharing">🖥️</span>}
          </div>
        </div>
        {!videoEnabled && (
          <div className="video-placeholder">
            <span>{username.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Remote Videos (Peers) */}
      {Array.from(peers.entries()).map(([socketId, peer]) => (
        <RemoteVideo
          key={socketId}
          stream={peer.stream}
          username={peer.username}
          socketId={socketId}
        />
      ))}
    </div>
  );
}

/**
 * Remote video component
 */
function RemoteVideo({ stream, username, socketId }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log(`[VideoGrid] Remote video stream set for ${username}`);
    }
  }, [stream, username]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-overlay">
        <span className="username">{username}</span>
      </div>
    </div>
  );
}
