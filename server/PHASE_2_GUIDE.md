# Phase 2 - Authentication Implementation Guide

## Quick Start

### Files Created

```
server/src/
├── controllers/
│   └── auth.controller.js          (190+ lines)
│       - signup()
│       - login()
│       - verify()
│
├── routes/
│   └── auth.routes.js              (50+ lines)
│       - POST /api/auth/signup
│       - POST /api/auth/login
│       - GET /api/auth/verify
│
├── middleware/
│   ├── auth.middleware.js          (Updated)
│   │   - authMiddleware
│   │
│   └── role.middleware.js          (150+ lines)
│       - ownerOnly
│       - managerOnly
│       - vendorOnly
│       - ownerOrManager
│       - authenticated
│
└── utils/
    └── jwt.js                      (Updated)
        - generateToken (7 days)
        - verifyToken
```

---

## 🎯 Key Features

### 1. User Signup
- Hash password with bcrypt (10 rounds)
- Create user with role (OWNER, MANAGER, VENDOR)
- OWNER automatically gets new business
- Return JWT token valid for 7 days
- Validate email uniqueness

### 2. User Login
- Find user by email
- Verify password against hash
- Check if account is active
- Return JWT token with user data
- Support immediate dashboard access

### 3. Role-Based Middleware
- Protect routes by role
- Easy to chain middleware
- Clear error messages
- Consistent error format

---

## 🔧 Usage Examples

### Protecting Routes

```javascript
const express = require('express');
const { authMiddleware } = require('./middleware/auth.middleware');
const { ownerOnly, managerOnly, vendorOnly } = require('./middleware/role.middleware');

const router = express.Router();

// Owner only routes
router.delete('/business', authMiddleware, ownerOnly, deleteBusinessController);
router.get('/admin/analytics', authMiddleware, ownerOnly, analyticsController);

// Manager routes
router.post('/inventory/update', authMiddleware, managerOnly, updateInventoryController);
router.put('/orders/:id/approve', authMiddleware, managerOnly, approveOrderController);

// Vendor routes
router.get('/vendor/orders', authMiddleware, vendorOnly, getVendorOrdersController);
router.get('/vendor/products', authMiddleware, vendorOnly, getVendorProductsController);

// Owner or Manager
router.get('/dashboard', authMiddleware, ownerOrManager, dashboardController);

// Any authenticated user
router.get('/profile', authMiddleware, getUserProfileController);

module.exports = router;
```

---

## 📱 Frontend Integration

### Store Token After Login

```javascript
// After successful login/signup
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

// Store for future requests
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### Send Token in Requests

```javascript
const token = localStorage.getItem('token');

const response = await fetch('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Handle Unauthorized

```javascript
if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

---

## ✅ Test Endpoints

### 1. Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Owner User",
    "email": "owner@test.com",
    "password": "secure123",
    "role": "OWNER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "secure123"
  }'
```

### 3. Verify Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔐 Security Summary

| Feature | Details |
|---------|---------|
| Password Hashing | bcrypt with 10 rounds |
| Token Type | JWT |
| Token Expiry | 7 days |
| Token Payload | userId, role, businessId |
| Role Enforcement | Middleware-based |
| Email Validation | Unique constraint |
| Account Status | isActive flag |

---

## 📊 Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "businessId": "507f1f77bcf86cd799439012"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "Access denied. Owner role required."
}
```

---

## 🎯 Next Phase Tasks

1. **User Management**
   - Update profile
   - Change password
   - Upload avatar

2. **Business Management**
   - Update business details
   - View team members
   - Manage settings

3. **Team Management**
   - Add MANAGER/VENDOR to business
   - Remove team members
   - Manage permissions

4. **Audit Logging**
   - Track login attempts
   - Log security events
   - Monitor role changes

---

**Phase 2 is complete and production-ready!** 🚀
