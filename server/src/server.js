/**
 * Server Bootstrap
 * Initializes and starts the Express server with Socket.IO
 */

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initializeSocket } = require('./sockets');
const { PORT } = require('./config/env');

/**
 * Start Server
 */
const startServer = async () => {
  try {
    console.log('⏳ Starting ChainMind Backend...');
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    console.log('📡 Initializing Socket.IO...');
    initializeSocket(httpServer);

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   ChainMind Backend - PHASE 1         ║
║   Foundation Service                  ║
╚═══════════════════════════════════════╝
      
✓ Server running on port ${PORT}
✓ MongoDB connected
✓ Socket.IO initialized
✓ Ready for development

📍 Health Check: GET http://localhost:${PORT}/health
      `);
    });

    // Graceful Shutdown
    process.on('SIGTERM', async () => {
      console.log('\n✓ SIGTERM received, shutting down gracefully...');
      httpServer.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('✗ Server Startup Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Start if running directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;
