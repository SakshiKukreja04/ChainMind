/**
 * Socket.IO Server
 * Initializes real-time communication
 * Note: Event handlers to be implemented in Phase 2
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST'],
    },
  });

  /**
   * Basic Connection Handler
   */
  io.on('connection', (socket) => {
    console.log(`✓ Socket Connected: ${socket.id}`);

    /**
     * Disconnect Handler
     */
    socket.on('disconnect', () => {
      console.log(`✗ Socket Disconnected: ${socket.id}`);
    });

    /**
     * Basic Ping-Pong for testing
     */
    socket.on('ping', (data) => {
      socket.emit('pong', { message: 'pong', data });
    });
  });

  console.log('✓ Socket.IO Initialized');
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Server} Socket.IO instance
 */
const getSocket = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getSocket,
};
