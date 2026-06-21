/**
 * ============================================================================
 * FILE: server/src/websocket/videoSignaling.js — VIDEO CALL SIGNALING SERVER
 *
 * PURPOSE:
 *   Handles WebRTC signaling for video calls. When users want to join a
 *   video meeting, they connect to this signaling server which helps them
 *   find each other and establish direct peer-to-peer connections.
 *
 *   Features:
 *   - Room management (create/join/leave rooms)
 *   - User tracking (who's in which room)
 *   - Signaling message relay (offers, answers, ICE candidates)
 *   - Screen sharing coordination
 *
 * CONNECTIONS:
 *   - Attached to HTTP server in: server/src/index.js
 *   - Frontend connects via: client/src/hooks/useVideoCall.js
 *   - Uses Socket.io for reliable real-time communication
 *   - Room data stored in memory (could add MongoDB later)
 *
 * HOW IT WORKS:
 *   1. User creates/joins a room with a unique meeting ID
 *   2. Socket.io notifies other users in the room
 *   3. Users exchange WebRTC offers/answers/ICE candidates via this server
 *   4. Once connected, video/audio streams directly between peers (P2P)
 *   5. This server only handles connection setup, NOT the video streams
 *
 * FUTURE INTEGRATIONS:
 *   - Store room metadata in MongoDB (participants, duration, etc.)
 *   - Add authentication (only invited users can join)
 *   - Add recording coordination
 * ============================================================================
 */

import { Server } from 'socket.io';

// Store active rooms and their participants
const rooms = new Map();

// Store user info (socketId -> { roomId, userId, username })
const users = new Map();

/**
 * Attach Socket.io video signaling server to the HTTP server
 * @param {import('node:http').Server} httpServer
 * @param {string} clientOrigin - Allowed CORS origin
 */
export function attachVideoSignalingServer(httpServer, clientOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io' // Default path
  });

  // =========================================================================
  // SOCKET.IO CONNECTION HANDLER
  // =========================================================================
  io.on('connection', (socket) => {
    console.log(`[video] User connected: ${socket.id}`);

    // -------------------------------------------------------------------------
    // JOIN ROOM
    // -------------------------------------------------------------------------
    socket.on('join-room', ({ roomId, userId, username }) => {
      console.log(`[video] ${username} (${userId}) joining room: ${roomId}`);

      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          participants: new Map(),
          createdAt: new Date()
        });
      }

      const room = rooms.get(roomId);

      // Check room capacity (max 10 users)
      if (room.participants.size >= 10) {
        socket.emit('room-full', { roomId });
        console.log(`[video] Room ${roomId} is full, rejecting ${username}`);
        return;
      }

      // Join the Socket.io room
      socket.join(roomId);

      // Store user info
      const userInfo = {
        socketId: socket.id,
        userId,
        username,
        roomId,
        joinedAt: new Date()
      };
      users.set(socket.id, userInfo);
      room.participants.set(socket.id, userInfo);

      // Notify existing participants about the new user
      socket.to(roomId).emit('user-joined', {
        userId,
        username,
        socketId: socket.id
      });

      // Send the new user a list of existing participants
      const participants = Array.from(room.participants.values())
        .filter(p => p.socketId !== socket.id)
        .map(p => ({
          userId: p.userId,
          username: p.username,
          socketId: p.socketId
        }));

      socket.emit('room-users', {
        roomId,
        participants,
        roomCreatedAt: room.createdAt
      });

      console.log(`[video] ${username} joined room ${roomId}. Participants: ${room.participants.size}`);
    });

    // -------------------------------------------------------------------------
    // WEBRTC SIGNALING: Offer
    // -------------------------------------------------------------------------
    socket.on('offer', ({ to, offer }) => {
      const fromUser = users.get(socket.id);
      if (fromUser) {
        console.log(`[video] Offer from ${fromUser.username} to ${to}`);
        io.to(to).emit('offer', {
          from: socket.id,
          fromUsername: fromUser.username,
          offer
        });
      }
    });

    // -------------------------------------------------------------------------
    // WEBRTC SIGNALING: Answer
    // -------------------------------------------------------------------------
    socket.on('answer', ({ to, answer }) => {
      const fromUser = users.get(socket.id);
      if (fromUser) {
        console.log(`[video] Answer from ${fromUser.username} to ${to}`);
        io.to(to).emit('answer', {
          from: socket.id,
          fromUsername: fromUser.username,
          answer
        });
      }
    });

    // -------------------------------------------------------------------------
    // WEBRTC SIGNALING: ICE Candidate
    // -------------------------------------------------------------------------
    socket.on('ice-candidate', ({ to, candidate }) => {
      const fromUser = users.get(socket.id);
      if (fromUser) {
        io.to(to).emit('ice-candidate', {
          from: socket.id,
          candidate
        });
      }
    });

    // -------------------------------------------------------------------------
    // SCREEN SHARING SIGNALING
    // -------------------------------------------------------------------------
    socket.on('screen-share-started', ({ roomId }) => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[video] ${user.username} started screen sharing in ${roomId}`);
        socket.to(roomId).emit('screen-share-started', {
          userId: user.userId,
          username: user.username,
          socketId: socket.id
        });
      }
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`[video] ${user.username} stopped screen sharing in ${roomId}`);
        socket.to(roomId).emit('screen-share-stopped', {
          userId: user.userId,
          username: user.username,
          socketId: socket.id
        });
      }
    });

    // -------------------------------------------------------------------------
    // MEDIA STATE CHANGES (mute/unmute)
    // -------------------------------------------------------------------------
    socket.on('media-state-changed', ({ roomId, audioEnabled, videoEnabled }) => {
      const user = users.get(socket.id);
      if (user) {
        socket.to(roomId).emit('user-media-state', {
          socketId: socket.id,
          userId: user.userId,
          username: user.username,
          audioEnabled,
          videoEnabled
        });
      }
    });

    // -------------------------------------------------------------------------
    // LEAVE ROOM
    // -------------------------------------------------------------------------
    socket.on('leave-room', ({ roomId }) => {
      handleUserLeave(socket, roomId);
    });

    // -------------------------------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------------------------------
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        handleUserLeave(socket, user.roomId);
      }
      console.log(`[video] User disconnected: ${socket.id}`);
    });

    // -------------------------------------------------------------------------
    // GET ROOM INFO (for meeting links)
    // -------------------------------------------------------------------------
    socket.on('get-room-info', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        const participants = Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          username: p.username
        }));
        socket.emit('room-info', {
          roomId,
          participantCount: room.participants.size,
          participants,
          createdAt: room.createdAt
        });
      } else {
        socket.emit('room-info', {
          roomId,
          participantCount: 0,
          participants: [],
          exists: false
        });
      }
    });
  });

  /**
   * Handle user leaving a room
   */
  function handleUserLeave(socket, roomId) {
    const user = users.get(socket.id);
    if (!user) return;

    const room = rooms.get(roomId);
    if (room) {
      room.participants.delete(socket.id);

      // Notify others in the room
      socket.to(roomId).emit('user-left', {
        userId: user.userId,
        username: user.username,
        socketId: socket.id
      });

      // Clean up empty rooms
      if (room.participants.size === 0) {
        rooms.delete(roomId);
        console.log(`[video] Room ${roomId} deleted (empty)`);
      } else {
        console.log(`[video] ${user.username} left room ${roomId}. Participants: ${room.participants.size}`);
      }
    }

    // Remove user from users map
    users.delete(socket.id);
    socket.leave(roomId);
  }

  console.log('[video] Video signaling server attached at path /socket.io');
  return io;
}

/**
 * Get room statistics (for monitoring)
 */
export function getRoomStats() {
  const stats = {
    totalRooms: rooms.size,
    totalUsers: users.size,
    rooms: []
  };

  rooms.forEach((room, roomId) => {
    stats.rooms.push({
      id: roomId,
      participants: room.participants.size,
      createdAt: room.createdAt
    });
  });

  return stats;
}
