/**
 * ============================================================================
 * FILE: client/src/components/VideoControls.jsx — VIDEO CALL CONTROLS
 *
 * PURPOSE:
 *   Displays control buttons for the video call.
 *   Works with or without camera!
 *
 * ============================================================================
 */

import { useCallback } from 'react';

export default function VideoControls({
  audioEnabled,
  videoEnabled,
  hasAudio,
  hasVideo,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave
}) {
  const handleAudioClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[VideoControls] Audio button clicked');
    if (onToggleAudio) onToggleAudio();
  }, [onToggleAudio]);

  const handleVideoClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[VideoControls] Video button clicked');
    if (onToggleVideo) onToggleVideo();
  }, [onToggleVideo]);

  const handleScreenShareClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[VideoControls] Screen share button clicked');
    if (onToggleScreenShare) onToggleScreenShare();
  }, [onToggleScreenShare]);

  const handleLeaveClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[VideoControls] Leave button clicked');
    if (onLeave) onLeave();
  }, [onLeave]);

  return (
    <div className="video-controls">
      {/* Audio Toggle - ALWAYS AVAILABLE (if microphone exists) */}
      <button
        type="button"
        className={`control-btn ${audioEnabled ? 'active' : 'muted'}`}
        onClick={handleAudioClick}
        disabled={!hasAudio}
        title={hasAudio ? (audioEnabled ? 'Mute microphone' : 'Unmute microphone') : 'No microphone'}
        style={{ 
          cursor: hasAudio ? 'pointer' : 'not-allowed',
          opacity: hasAudio ? 1 : 0.5
        }}
      >
        <span className="control-icon">{audioEnabled ? '🎤' : '🔇'}</span>
        <span className="control-label">
          {!hasAudio ? 'No Mic' : (audioEnabled ? 'Mute' : 'Unmute')}
        </span>
      </button>

      {/* Video Toggle - ONLY IF CAMERA AVAILABLE */}
      <button
        type="button"
        className={`control-btn ${videoEnabled ? 'active' : 'muted'}`}
        onClick={handleVideoClick}
        disabled={!hasVideo}
        title={hasVideo ? (videoEnabled ? 'Turn off camera' : 'Turn on camera') : 'No camera'}
        style={{ 
          cursor: hasVideo ? 'pointer' : 'not-allowed',
          opacity: hasVideo ? 1 : 0.5
        }}
      >
        <span className="control-icon">
          {hasVideo ? (videoEnabled ? '📹' : '📷') : '📷'}
        </span>
        <span className="control-label">
          {!hasVideo ? 'No Camera' : (videoEnabled ? 'Stop Video' : 'Start Video')}
        </span>
      </button>

      {/* Screen Share */}
      <button
        type="button"
        className={`control-btn ${isScreenSharing ? 'sharing' : ''}`}
        onClick={handleScreenShareClick}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        style={{ cursor: 'pointer' }}
      >
        <span className="control-icon">{isScreenSharing ? '🖥️' : '💻'}</span>
        <span className="control-label">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      {/* Leave Meeting */}
      <button
        type="button"
        className="control-btn leave-btn"
        onClick={handleLeaveClick}
        title="Leave meeting"
        style={{ cursor: 'pointer' }}
      >
        <span className="control-icon">📞</span>
        <span className="control-label">Leave</span>
      </button>
    </div>
  );
}
