/**
 * ============================================================================
 * FILE: client/src/App.jsx — ROOT COMPONENT + PAGE ROUTING
 *
 * PURPOSE:
 *   Top-level layout (header/nav) and page switching between:
 *     * Dashboard      (pages/Dashboard.jsx)     — live record + transcribe
 *     * MeetingDetail  (pages/MeetingDetail.jsx)  — past meeting + summary
 *     * VideoRoom      (pages/VideoRoom.jsx)      — video calling
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/main.jsx
 *   - Renders:      Dashboard, MeetingDetail, VideoRoom pages
 *   - Uses:         react-router-dom for URL-based routing
 *
 * ROUTES:
 *   /               — Dashboard (recording + transcribe)
 *   /meeting/:id    — Past meeting detail + summary (EXISTING meetings)
 *   /video          — Create new video meeting
 *   /video/:roomId  — Join specific video meeting (NEW feature)
 *
 * ============================================================================
 */

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import MeetingDetail from './pages/MeetingDetail.jsx';
import VideoRoom from './pages/VideoRoom.jsx';
import MuteTest from './components/MuteTest.jsx';
function AppContent() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          🎙️ Smart Meeting Assistant
        </h1>
        <nav>
          <button onClick={() => navigate('/')}>📊 Dashboard</button>
          <button onClick={() => navigate('/video')}>📹 Video Meeting</button>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          {/* Existing routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/meeting/:meetingId" element={<MeetingDetail />} />
          <Route path="/test" element={<MuteTest />} />
          {/* Video calling routes */}
          <Route path="/video" element={<VideoRoom />} />
          <Route path="/video/:roomId" element={<VideoRoom />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <small>
          REST: /api → localhost:5000 · Audio WS: ws://localhost:5000/audio · Video: socket.io
        </small>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
