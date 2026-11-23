
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let currentToken = null;

export const connectSocket = (token) => {
  if (!token) {
    console.error('Socket connection failed: JWT token missing');
    return null;
  }

  // Reuse the existing socket if the same user is connecting.
  if (socket && currentToken === token) {
    if (!socket.connected && !socket.active) {
      socket.connect();
    }

    return socket;
  }

  // If a different user logs in, close the previous connection.
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Connectly socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Connectly socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

// Get the existing socket connection.
export const getSocket = () => socket;

// Check whether socket is connected.
export const isSocketConnected = () => Boolean(socket?.connected);

// Disconnect socket during logout.
export const disconnectSocket = () => {
  if (!socket) return;

  socket.disconnect();
  socket = null;
  currentToken = null;

  console.log('Connectly socket disconnected successfully');
};
