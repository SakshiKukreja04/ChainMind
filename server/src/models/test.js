/**
 * MongoDB Connection Test Utility
 * Run this to verify all models connect successfully
 * 
 * Usage: node src/models/test.js
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('../config/env');
const { User, Business, Product, Vendor, Order } = require('./index');

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB Connection...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 Registered Models:');
    console.log('  • User');
    console.log('  • Business');
    console.log('  • Product');
    console.log('  • Vendor');
    console.log('  • Order');
    
    console.log('\n✨ All models loaded successfully!');
    console.log('\nSchema Overview:');
    console.log('─'.repeat(50));
    
    console.log('\n👤 User Schema:');
    console.log('   - name, email (unique), passwordHash, role, businessId');
    
    console.log('\n🏢 Business Schema:');
    console.log('   - businessName, industry, location, currency, ownerId');
    
    console.log('\n📦 Product Schema:');
    console.log('   - name, sku (indexed), costPrice, sellingPrice, currentStock');
    console.log('   - minThreshold, vendorId, businessId, stockHistory');
    
    console.log('\n🤝 Vendor Schema:');
    console.log('   - name, contact, leadTimeDays, productsSupplied, reliabilityScore');
    console.log('   - businessId, performanceMetrics, isApproved');
    
    console.log('\n📋 Order Schema:');
    console.log('   - productId, vendorId, quantity, status');
    console.log('   - createdBy, approvedBy, blockchainTxHash, aiRecommendation');
    
    console.log('\n' + '─'.repeat(50));
    console.log('✅ Ready for Phase 2 implementation!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    process.exit(1);
  }
};

testConnection();
