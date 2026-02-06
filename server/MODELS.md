# ChainMind Data Models - STEP 1.2

Complete Mongoose schema definitions for the ChainMind platform.

## 📋 Models Created

### 1️⃣ User Model
User accounts with role-based access control.

**Fields:**
- `name`: User's full name
- `email`: Unique email (login credential)
- `passwordHash`: Bcrypt hashed password
- `role`: `OWNER` | `MANAGER` | `VENDOR`
- `businessId`: Reference to Business
- `profilePhoto`: Optional profile image
- `isActive`: Account status
- `createdAt` / `updatedAt`: Auto-generated timestamps

**Indexes:**
- email (unique, for login)
- businessId (for business user queries)

**Use Cases:**
- Dashboard access based on role
- Order approval workflow
- User authentication

---

### 2️⃣ Business Model
Business account representing the SME or vendor platform.

**Fields:**
- `businessName`: Official company name
- `industry`: Business classification
- `location`: Address/location
- `currency`: Transaction currency (USD, INR, etc.)
- `ownerId`: Reference to OWNER user
- `registrationNumber`: Business registration ID
- `phone`: Contact number
- `logo`: Business logo URL
- `isActive`: Business status
- `metadata`: Custom fields
- `createdAt` / `updatedAt`: Auto-generated

**Indexes:**
- ownerId (find user's business)
- businessName (search)

**Use Cases:**
- Multi-tenant isolation
- Business dashboard
- Vendor profile management

---

### 3️⃣ Product Model
Inventory items managed by a business.

**Fields:**
- `name`: Product name/description
- `sku`: Stock Keeping Unit (unique, indexed)
- `category`: Product category
- `costPrice`: Supplier cost (non-negative)
- `sellingPrice`: Retail price (non-negative)
- `currentStock`: Available quantity (non-negative)
- `minThreshold`: Reorder point (triggers alerts)
- `vendorId`: Reference to Vendor
- `businessId`: Reference to Business
- `description`: Product details
- `imageUrl`: Product photo
- `isActive`: Product availability
- `stockHistory`: Array of monthly sales data
- `createdAt` / `updatedAt`: Auto-generated

**Indexes:**
- sku (fast lookup)
- businessId (inventory view)
- vendorId (vendor products)
- businessId + sku (compound)

**Use Cases:**
- Inventory management
- Stock level monitoring
- AI demand forecasting (uses stockHistory)
- Vendor product catalog

---

### 4️⃣ Vendor Model
Suppliers providing products to the business.

**Fields:**
- `name`: Vendor company name
- `contact`: Contact info (email/phone)
- `leadTimeDays`: Delivery time (days)
- `productsSupplied`: Array of Product references
- `reliabilityScore`: 0-100 rating (AI-updated)
- `businessId`: Reference to Business
- `paymentTerms`: NET30, NET60, etc.
- `rating`: User rating (1-5 stars)
- `totalOrders`: Order count
- `address`: Vendor location
- `isApproved`: Approval status
- `isActive`: Account status
- `performanceMetrics`: On-time %, quality %, response %
- `createdAt` / `updatedAt`: Auto-generated

**Indexes:**
- businessId (vendor list)
- name (search)
- reliabilityScore (vendor ranking)

**Use Cases:**
- Vendor onboarding
- Order approval workflow
- AI vendor ranking
- Vendor dashboard

---

### 5️⃣ Order Model
Purchase orders with approval workflow and blockchain audit.

**Fields:**
- `productId`: Reference to Product
- `vendorId`: Reference to Vendor
- `quantity`: Order quantity (positive)
- `status`: `DRAFT` | `PENDING_APPROVAL` | `APPROVED` | `DELIVERED`
- `createdBy`: Reference to User (creator)
- `approvedBy`: Reference to User (approver)
- `blockchainTxHash`: Blockchain transaction hash (unique, optional)
- `totalValue`: quantity × costPrice
- `expectedDeliveryDate`: Calculated delivery date
- `actualDeliveryDate`: When delivered
- `rejectionReason`: If rejected
- `notes`: Order comments
- `businessId`: Reference to Business
- `poNumber`: Purchase order number (unique)
- `aiRecommendation`: Forecast data (demand, qty, confidence)
- `createdAt` / `updatedAt`: Auto-generated

**Indexes:**
- productId, vendorId, businessId (lookup)
- status (filter pending)
- createdBy (user orders)
- businessId + status (business pending)
- blockchainTxHash (audit trail)

**Use Cases:**
- Order creation & submission
- Approval workflow
- Blockchain audit logging
- AI reorder recommendations
- Delivery tracking

---

## 🔗 Relationships

```
┌─────────────────────────────────────┐
│         Business                    │
│   (businessName, industry, etc.)    │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┬──────────────────┐
    │                 │                  │
    v                 v                  v
┌────────┐      ┌──────────┐      ┌──────────┐
│ User   │      │ Product  │      │ Vendor   │
│(ownerId)      │(vendorId)│      │(ref here)│
└───┬────┘      └──────┬───┘      └────┬─────┘
    │                  │               │
    │       ┌──────────┴───────────────┘
    │       │
    v       v
  Order
(createdBy, approvedBy)
(productId, vendorId, businessId)
```

---

## 🚀 Connection Instructions

### 1. Create `.env` file

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/chainmind
JWT_SECRET=your-secret-key
ML_SERVICE_URL=http://localhost:6000
```

### 2. Test Models

```bash
cd server
npm run dev        # Start backend with models loaded
```

### 3. Test MongoDB Connection

```bash
node src/models/test.js
```

Expected output:
```
✅ MongoDB Connected Successfully!
📚 Registered Models:
  • User
  • Business
  • Product
  • Vendor
  • Order
✨ All models loaded successfully!
```

---

## 📝 Usage Examples

### Import Models

```javascript
const { User, Business, Product, Vendor, Order } = require('./models');
```

### Create User (later phases)

```javascript
const user = new User({
  name: 'John Doe',
  email: 'john@example.com',
  passwordHash: bcrypt.hashSync('password', 10),
  role: 'OWNER',
  businessId: businessId
});
await user.save();
```

### Query Business Products

```javascript
const products = await Product.find({
  businessId: businessId,
  currentStock: { $lt: { $ref: 'minThreshold' } }
}).populate('vendorId');
```

### Create Order

```javascript
const order = new Order({
  productId: productId,
  vendorId: vendorId,
  quantity: 100,
  status: 'DRAFT',
  createdBy: userId,
  businessId: businessId
});
await order.save();
```

### Get Pending Orders

```javascript
const pendingOrders = await Order.find({
  businessId: businessId,
  status: 'PENDING_APPROVAL'
}).populate(['productId', 'vendorId', 'createdBy']);
```

---

## 🔐 Data Validation

All models include:
- **Type checking**: Mongoose type enforcement
- **Min/Max constraints**: Numbers have min/max values
- **Unique fields**: email, sku, blockchainTxHash
- **Enum validation**: role, status fields
- **References**: Proper ObjectId refs with populate support

---

## 📊 Indexes for Performance

**User:** email, businessId
**Business:** ownerId, businessName
**Product:** sku, businessId, vendorId (compound)
**Vendor:** businessId, reliabilityScore
**Order:** productId, vendorId, businessId, status (compound)

---

## 🎯 Next Steps (Phase 2)

1. **Auth Routes**: User registration & login
2. **CRUD Routes**: Create, read, update operations
3. **Approval Workflow**: Endpoint for order approval
4. **Validation Rules**: Business logic in middleware
5. **AI Integration**: Demand forecasting
6. **Blockchain**: TX hash writing
7. **Socket.IO Events**: Real-time updates

---

## ✅ Model Features

✓ Clean Mongoose schemas
✓ Proper relationships & references
✓ Auto-timestamps
✓ Performance indexes
✓ Validation rules
✓ Enum fields
✓ Optional fields with defaults
✓ Compound indexes
✓ Comments for hackathon explanation

**Models are ready for Phase 2 implementation!** 🚀
