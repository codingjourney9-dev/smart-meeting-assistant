/**
 * ============================================================================
 * FILE: client/src/pages/VideoRoom.jsx — VIDEO MEETING ROOM PAGE
 *
 * PURPOSE:
 *   The main page for video meetings.
 *   NOW WORKS WITHOUT A CAMERA - only needs a microphone!
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVideoCall } from '../hooks/useVideoCall.js';
import VideoGrid from '../components/VideoGrid.jsx';
import VideoControls from '../components/VideoControls.jsx';
import MeetingLink from '../components/MeetingLink.jsx';

export default function VideoRoom() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();

  const {
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
  } = useVideoCall();

  const [inputUsername, setInputUsername] = useState('');
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  const [isJoining, setIsJoining] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!inputUsername.trim()) {
      setError('Please enter your name');
      return;
    }

    const targetRoomId = inputRoomId || generateRoomId();
    setIsJoining(true);

    try {
      await joinRoom(targetRoomId, inputUsername.trim());
      setMeetingStarted(true);

      if (!inputRoomId) {
        navigate(`/video/${targetRoomId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setMeetingStarted(false);
    navigate('/');
  };

  // If not in a meeting, show join form
  if (!meetingStarted) {
    return (
      <div className="video-join-page">
        <div className="join-container">
          <h1>📹 Join Video Meeting</h1>
          <p className="subtitle">Connect with your team via video call</p>
          
          <div style={{ 
            padding: '12px', 
            background: '#334155', 
            borderRadius: '8px', 
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Note:</strong> Camera is optional! You can join with just a microphone for audio-only calls.
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          <form onSubmit={handleJoin} className="join-form">
            <div className="form-group">
              <label htmlFor="username">Your Name</label>
              <input
                id="username"
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="roomId">Meeting ID (leave empty to create new)</label>
              <input
                id="roomId"
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Enter meeting ID or leave empty"
              />
            </div>

            <button
              type="submit"
              className="btn-join"
              disabled={isJoining || !inputUsername.trim()}
            >
              {isJoining ? 'Joining...' : inputRoomId ? 'Join Meeting' : 'Create New Meeting'}
            </button>
          </form>

          <div className="join-info">
            <p>💡 <strong>How it works:</strong></p>
            <ul>
              <li>Create a new meeting or join an existing one</li>
              <li>Share the meeting link with others (up to 10 people)</li>
              <li>Video calls are peer-to-peer (not through server)</li>
              <li>Works with or without a camera!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // In-meeting view
  return (
    <div className="video-room">
      {/* Header */}
      <div className="room-header">
        <div className="room-info">
          <h2>📹 Video Meeting</h2>
          <span className="room-id">Room: {roomId}</span>
          <span className="participant-count">
            {peers.size + 1} participant{peers.size !== 0 ? 's' : ''}
          </span>
          {!hasVideo && (
            <span style={{ 
              padding: '4px 8px', 
              background: '#334155', 
              borderRadius: '4px', 
              fontSize: '0.85rem',
              color: '#94a3b8'
            }}>
              🎤 Audio Only
            </span>
          )}
        </div>

        <MeetingLink roomId={roomId} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Video Grid */}
      <VideoGrid
        localStream={localStream}
        peers={peers}
        username={username}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        hasVideo={hasVideo}
        isScreenSharing={isScreenSharing}
      />

      {/* Controls */}
      <VideoControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        hasAudio={hasAudio}
        hasVideo={hasVideo}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onLeave={handleLeave}
      />
    </div>
  );
}
