/**
 * ============================================================================
 * FILE: client/src/components/MeetingLink.jsx — MEETING LINK SHARE
 *
 * PURPOSE:
 *   Displays the meeting link and allows users to copy it.
 *   Meeting links are shareable URLs that others can use to join.
 *
 * CONNECTIONS:
 *   - Used by: client/src/pages/VideoRoom.jsx
 *   - Link format: http://localhost:5173/video/:roomId
 *
 * ============================================================================
 */

import { useState } from 'react';

export default function MeetingLink({ roomId }) {
  const [copied, setCopied] = useState(false);

  // Generate the meeting link (uses /video/ route, not /meeting/)
  const meetingLink = `${window.location.origin}/video/${roomId}`;

  // Copy to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = meetingLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="meeting-link">
      <div className="link-container">
        <span className="link-label">Meeting Link:</span>
        <div className="link-box">
          <input
            type="text"
            value={meetingLink}
            readOnly
            className="link-input"
            onClick={(e) => e.target.select()}
          />
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyLink}
            title="Copy meeting link"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>
      <p className="link-hint">Share this link with others to invite them (max 10 people)</p>
    </div>
  );
}
