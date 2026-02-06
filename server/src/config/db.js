/**
 * MongoDB Connection
 * Establishes connection to MongoDB using Mongoose
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  try {
    console.log('🔌 Attempting MongoDB connection...');
    console.log('📍 Using URI:', MONGO_URI.substring(0, 50) + '...');
    const conn = await mongoose.connect(MONGO_URI);

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    console.error('📍 Full Connection String:', MONGO_URI);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB Disconnected');
  } catch (error) {
    console.error(`✗ MongoDB Disconnection Error: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
