# ChainMind Models - Extension Guide

Complete guide for extending and using the core data models in Phase 2 and beyond.

## 🔄 Model Relationships & Workflows

### User → Business → Products → Vendors → Orders

```
OWNER creates BUSINESS
    ↓
OWNER & MANAGERS manage PRODUCTS (inventory)
    ↓
PRODUCTS are supplied by VENDORS
    ↓
MANAGERS create ORDERS from VENDORS
    ↓
OWNER/MANAGERS approve ORDERS
    ↓
ORDER status tracked → triggers BLOCKCHAIN write
```

---

## 💾 Database Connection Setup

### In `server.js` or initialization file:

```javascript
const mongoose = require('mongoose');
const { MONGO_URI } = require('./config/env');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB Connected');
  } catch (error) {
    console.error('✗ MongoDB Error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };
```

---

## 📦 Model Import & Usage

### In Route Files:

```javascript
const { User, Business, Product, Vendor, Order } = require('../models');

// Create
const newUser = new User({
  name: 'John Doe',
  email: 'john@example.com',
  passwordHash: hashedPassword,
  role: 'OWNER'
});
await newUser.save();

// Read
const user = await User.findById(userId);
const business = await Business.findOne({ ownerId: userId });

// Update
await User.updateOne(
  { _id: userId },
  { $set: { name: 'Jane Doe' } }
);

// Delete
await User.deleteOne({ _id: userId });

// Populate References
const orders = await Order.find({ businessId: businessId })
  .populate('productId')
  .populate('vendorId')
  .populate('createdBy');
```

---

## 🔐 Authentication Model Usage

### Register User:

```javascript
const bcrypt = require('bcrypt');
const { User, Business } = require('../models');

async function registerUser(email, password, name, businessName) {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create business first (if OWNER)
  const business = new Business({
    businessName: businessName,
    industry: 'Retail',
    location: 'NYC',
    currency: 'USD'
    // ownerId will be set after user creation
  });

  // Create user
  const user = new User({
    name: name,
    email: email,
    passwordHash: passwordHash,
    role: 'OWNER'
  });
  
  // Save user first
  await user.save();
  
  // Update business with ownerId
  business.ownerId = user._id;
  await business.save();
  
  // Link business to user
  user.businessId = business._id;
  await user.save();

  return { user, business };
}
```

### Login:

```javascript
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

async function loginUser(email, password) {
  const user = await User.findOne({ email: email });
  
  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid password');
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, role: user.role, businessId: user.businessId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return token;
}
```

---

## 📊 Inventory Management Patterns

### Get Business Inventory:

```javascript
async function getBusinessInventory(businessId) {
  const products = await Product.find({ businessId: businessId })
    .populate('vendorId')
    .sort({ name: 1 });
  
  return products;
}
```

### Alert Low Stock:

```javascript
async function checkLowStock(businessId) {
  const lowStockProducts = await Product.find({
    businessId: businessId,
    isActive: true,
    $expr: { $lt: ['$currentStock', '$minThreshold'] }
  });
  
  return lowStockProducts;
}
```

### Update Product Stock:

```javascript
async function updateProductStock(productId, newQuantity) {
  const product = await Product.findByIdAndUpdate(
    productId,
    { currentStock: newQuantity },
    { new: true }
  );
  
  return product;
}
```

### Add to Stock History:

```javascript
async function recordSale(productId, quantitySold, revenue) {
  await Product.findByIdAndUpdate(
    productId,
    {
      $push: {
        stockHistory: {
          month: new Date(),
          quantitySold: quantitySold,
          revenue: revenue
        }
      },
      $inc: { currentStock: -quantitySold }
    }
  );
}
```

---

## 🤝 Vendor Management Patterns

### Get Approved Vendors:

```javascript
async function getApprovedVendors(businessId) {
  const vendors = await Vendor.find({
    businessId: businessId,
    isApproved: true,
    isActive: true
  }).sort({ reliabilityScore: -1 });
  
  return vendors;
}
```

### Vendor Ranking by Reliability:

```javascript
async function getRankedVendors(businessId) {
  const vendors = await Vendor.find({
    businessId: businessId,
    isApproved: true
  })
    .sort({ reliabilityScore: -1 })
    .limit(10);
  
  return vendors;
}
```

### Update Vendor Reliability Score:

```javascript
async function updateVendorScore(vendorId, newScore) {
  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { reliabilityScore: Math.min(100, Math.max(0, newScore)) },
    { new: true }
  );
  
  return vendor;
}
```

### Calculate Performance Metrics:

```javascript
async function updateVendorMetrics(vendorId) {
  // Get vendor orders
  const orders = await Order.find({
    vendorId: vendorId,
    status: 'DELIVERED'
  });

  if (orders.length === 0) return;

  // Calculate on-time delivery rate
  const onTimeOrders = orders.filter(order => {
    return new Date(order.actualDeliveryDate) <= 
           new Date(order.expectedDeliveryDate);
  });

  const onTimeRate = (onTimeOrders.length / orders.length) * 100;

  // Update vendor
  await Vendor.findByIdAndUpdate(
    vendorId,
    {
      'performanceMetrics.onTimeDeliveryRate': onTimeRate,
      totalOrders: orders.length
    }
  );
}
```

---

## 📋 Order Management Patterns

### Create Order:

```javascript
async function createOrder(productId, vendorId, quantity, createdByUserId) {
  const product = await Product.findById(productId);
  const vendor = await Vendor.findById(vendorId);

  const order = new Order({
    productId: productId,
    vendorId: vendorId,
    quantity: quantity,
    totalValue: quantity * product.costPrice,
    expectedDeliveryDate: new Date(Date.now() + vendor.leadTimeDays * 24 * 60 * 60 * 1000),
    createdBy: createdByUserId,
    businessId: product.businessId,
    status: 'DRAFT'
  });

  await order.save();
  return order;
}
```

### Submit for Approval:

```javascript
async function submitOrderForApproval(orderId) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: 'PENDING_APPROVAL' },
    { new: true }
  );
  
  // TODO: Emit Socket.IO event for real-time notification
  return order;
}
```

### Approve Order:

```javascript
async function approveOrder(orderId, approvedByUserId) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { 
      status: 'APPROVED',
      approvedBy: approvedByUserId
    },
    { new: true }
  );
  
  // TODO: Trigger blockchain write with order data
  return order;
}
```

### Mark Delivered:

```javascript
async function markOrderDelivered(orderId) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { 
      status: 'DELIVERED',
      actualDeliveryDate: new Date()
    },
    { new: true }
  );

  // Update product stock
  if (order.status === 'APPROVED') {
    await Product.findByIdAndUpdate(
      order.productId,
      { $inc: { currentStock: order.quantity } }
    );
  }

  // Update vendor metrics
  await updateVendorMetrics(order.vendorId);

  return order;
}
```

### Get Pending Approvals:

```javascript
async function getPendingApprovals(businessId) {
  const orders = await Order.find({
    businessId: businessId,
    status: 'PENDING_APPROVAL'
  })
    .populate(['productId', 'vendorId', 'createdBy'])
    .sort({ createdAt: -1 });
  
  return orders;
}
```

---

## 🔗 Complex Queries

### Get All Products Below Minimum Threshold:

```javascript
async function getLowStockAlert(businessId) {
  const lowStockProducts = await Product.aggregate([
    {
      $match: {
        businessId: mongoose.Types.ObjectId(businessId),
        isActive: true
      }
    },
    {
      $addFields: {
        isBelowThreshold: { $lt: ['$currentStock', '$minThreshold'] }
      }
    },
    {
      $match: { isBelowThreshold: true }
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    {
      $sort: { currentStock: 1 }
    }
  ]);

  return lowStockProducts;
}
```

### Dashboard Summary:

```javascript
async function getDashboardSummary(businessId) {
  const [
    totalProducts,
    lowStockCount,
    pendingOrders,
    approvedVendors,
    totalRevenue
  ] = await Promise.all([
    Product.countDocuments({ businessId }),
    Product.countDocuments({
      businessId,
      $expr: { $lt: ['$currentStock', '$minThreshold'] }
    }),
    Order.countDocuments({
      businessId,
      status: 'PENDING_APPROVAL'
    }),
    Vendor.countDocuments({
      businessId,
      isApproved: true
    }),
    Order.aggregate([
      { $match: { businessId: mongoose.Types.ObjectId(businessId), status: 'DELIVERED' } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ])
  ]);

  return {
    totalProducts,
    lowStockCount,
    pendingOrders,
    approvedVendors,
    totalRevenue: totalRevenue[0]?.total || 0
  };
}
```

---

## 🤖 AI Integration Hooks

### Store AI Recommendation:

```javascript
async function storeAIRecommendation(orderId, forecast) {
  await Order.findByIdAndUpdate(
    orderId,
    {
      aiRecommendation: {
        forecastedDemand: forecast.demand,
        recommendedQuantity: forecast.suggestedQty,
        confidence: forecast.confidence,
        reasoning: forecast.explanation
      }
    }
  );
}
```

### Get Historical Data for ML:

```javascript
async function getProductHistoryForML(productId) {
  const product = await Product.findById(productId)
    .select('stockHistory currentStock minThreshold');
  
  const orders = await Order.find({
    productId: productId,
    status: 'DELIVERED'
  }).select('quantity actualDeliveryDate');

  return {
    product,
    orders,
    readyForForecasting: product.stockHistory.length >= 12
  };
}
```

---

## 🔗 Blockchain Integration Hooks

### Record Order on Blockchain:

```javascript
async function recordOrderOnBlockchain(orderId, txHash) {
  await Order.findByIdAndUpdate(
    orderId,
    { blockchainTxHash: txHash },
    { new: true }
  );
}
```

### Get Blockchain Audit Trail:

```javascript
async function getAuditTrail(businessId) {
  const auditTrail = await Order.find({
    businessId: businessId,
    blockchainTxHash: { $ne: null }
  })
    .select('poNumber totalValue blockchainTxHash status createdAt')
    .sort({ createdAt: -1 });

  return auditTrail;
}
```

---

## 🧪 Testing Model Queries

### Test Script:

```javascript
const mongoose = require('mongoose');
const { User, Product, Vendor, Order } = require('./models');

async function testModels() {
  try {
    // Test 1: Create user
    const user = new User({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      passwordHash: 'hashedpass',
      role: 'OWNER'
    });
    await user.save();
    console.log('✓ User created:', user._id);

    // Test 2: Create product
    const product = new Product({
      name: 'Test Product',
      sku: `SKU-${Date.now()}`,
      category: 'Test',
      costPrice: 100,
      sellingPrice: 150,
      currentStock: 50,
      minThreshold: 10,
      businessId: user.businessId
    });
    await product.save();
    console.log('✓ Product created:', product._id);

    // Test 3: Query with populate
    const populatedProduct = await Product.findById(product._id)
      .populate('vendorId');
    console.log('✓ Product queried with populate');

    console.log('\n✅ All model tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testModels();
```

---

## 🎯 Next Steps for Phase 2

- [ ] Create API routes for CRUD operations
- [ ] Add role-based access control middleware
- [ ] Implement order approval workflow routes
- [ ] Add validation middleware for all models
- [ ] Create Socket.IO events for real-time updates
- [ ] Integrate ML service calls
- [ ] Add blockchain transaction recording
- [ ] Create dashboard aggregation endpoints
- [ ] Add pagination to list endpoints
- [ ] Implement search and filter capabilities

---

## 📝 Mongoose Tips

### Virtual Fields:
```javascript
userSchema.virtual('fullName').get(function() {
  return this.name;
});
```

### Middleware (Hooks):
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  // Hash password before save
  next();
});
```

### Aggregation Pipeline:
```javascript
const results = await Order.aggregate([
  { $match: { status: 'DELIVERED' } },
  { $group: { _id: '$vendorId', totalOrders: { $sum: 1 } } },
  { $sort: { totalOrders: -1 } }
]);
```

---

**Models are now ready for comprehensive Phase 2 implementation!** 🚀
