/**
 * ============================================================================
 * FILE: client/src/main.jsx — REACT ENTRY POINT
 *
 * PURPOSE:
 *   Bootstraps React: finds <div id="root"> in client/index.html and renders
 *   the root <App /> component into it.
 *
 * CONNECTIONS:
 *   - Loaded by:  client/index.html
 *   - Renders:    client/src/App.jsx (root layout + page routing)
 *   - Imports:    client/src/styles/global.css (app-wide styles)
 *                 client/src/styles/video.css (video calling styles)
 *
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/video.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
