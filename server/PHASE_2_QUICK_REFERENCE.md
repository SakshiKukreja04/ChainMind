# Phase 2 Quick Reference - Authentication & Role Control

## 🚀 Quick Start

### Server Setup
```bash
cd d:\ChainMind\server
node src/server.js
# Server runs on http://localhost:5000
```

### API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/signup` | ❌ Public | Register new user |
| POST | `/api/auth/login` | ❌ Public | Login & get token |
| GET | `/api/auth/verify` | ✅ Required | Verify token & get user |

---

## 📝 API Examples

### Signup (Create User)
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "OWNER"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "businessId": "507f..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Verify Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔑 Roles & Permissions

### OWNER
- ✅ Create/update business
- ✅ Invite managers and vendors
- ✅ Approve orders
- ✅ View all inventory
- ✅ Full system access

### MANAGER
- ✅ Manage inventory
- ✅ Create/approve orders
- ✅ View inventory details
- ❌ Invite users
- ❌ Update business settings

### VENDOR
- ✅ View assigned orders
- ✅ Update order status
- ✅ Manage profile
- ❌ Create inventory
- ❌ Approve orders

---

## 🛠️ File Structure

```
src/
├── controllers/
│   └── auth.controller.js      # signup, login, verify logic
├── routes/
│   └── auth.routes.js          # /api/auth/* endpoints
├── middleware/
│   ├── auth.middleware.js      # JWT verification
│   └── role.middleware.js      # ownerOnly, managerOnly, etc.
├── utils/
│   └── jwt.js                  # generateToken, verifyToken
└── models/
    ├── User.model.js           # User schema
    ├── Business.model.js       # Business schema
    └── ...other models

Documentation/
├── AUTHENTICATION.md           # Full API reference
├── PHASE_2_GUIDE.md           # Implementation guide
└── PHASE_2_COMPLETION_SUMMARY.md
```

---

## 💾 Key Variables

**Environment (.env)**
```
PORT=5000                    # Server port
MONGO_URI=mongodb+srv://...  # MongoDB connection
JWT_SECRET=supersecretkey    # Change in production!
```

**JWT Payload**
```json
{
  "userId": "507f...",
  "role": "OWNER",
  "businessId": "507f...",
  "iat": 1675920000,
  "exp": 1676524800
}
```

---

## 🔐 Middleware Chain Examples

### Owner-Only Operation
```javascript
router.put('/api/business/update',
  authMiddleware,    // Step 1: Verify token
  ownerOnly,        // Step 2: Check role is OWNER
  updateBusiness    // Step 3: Execute controller
);
```

### Manager-or-Owner Operation
```javascript
router.post('/api/orders/approve',
  authMiddleware,      // Step 1: Verify token
  ownerOrManager,     // Step 2: Check role
  approveOrder        // Step 3: Execute
);
```

### Any Authenticated User
```javascript
router.get('/api/profile',
  authMiddleware,     // Step 1: Verify token
  getProfile         // Step 2: Execute (no role check)
);
```

---

## ✅ HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Login successful |
| 201 | Created | User registered |
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | User/business not found |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Database error |

---

## 🧪 Testing Checklist

- [ ] Create OWNER account → verify businessId created
- [ ] Create MANAGER account → verify businessId linked
- [ ] Create VENDOR account → verify role saved
- [ ] Login with correct password → verify token returned
- [ ] Login with wrong password → verify 401 error
- [ ] Verify token with valid JWT → verify user returned
- [ ] Verify token with invalid JWT → verify 401 error
- [ ] Test ownerOnly middleware → verify 403 for non-owner
- [ ] Test managerOnly middleware → verify 403 for non-manager
- [ ] Test email uniqueness → verify 409 duplicate error

---

## 🚨 Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| Email already registered | Duplicate email | Use unique email |
| Business not found | Invalid businessId | Create business first |
| Invalid role | Wrong role enum | Use OWNER/MANAGER/VENDOR |
| Invalid token | Expired or modified | Login again |
| Access denied | Insufficient permissions | Use correct role |

---

## 🔄 Token Lifecycle

```
1. User Signup/Login
   ↓
2. Server generates JWT (7-day expiry)
   ↓
3. Client stores token (localStorage/cookie)
   ↓
4. Client sends Authorization header with each request
   ↓
5. authMiddleware verifies token
   ↓
6. Request processed with user context
   ↓
7. Token expires after 7 days
   ↓
8. User re-authenticates (Phase 3: add refresh tokens)
```

---

## 📚 Frontend Integration Template

```typescript
// React component example
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  async function handleLogin(e) {
    e.preventDefault();
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      // Store user
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      alert(data.message);
    }
  }
  
  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🎯 What's Working

✅ **Implemented & Tested:**
- User signup with auto-business creation
- User login with password verification
- JWT token generation (7-day expiry)
- Token verification endpoint
- Role-based middleware enforcement
- Password hashing with bcrypt
- Email uniqueness validation
- MongoDB integration
- Server running on port 5000

✅ **Ready for:**
- Frontend login/signup forms
- Protected API endpoints
- Role-based operations
- Business management routes
- Inventory management

---

## 📞 Debug Commands

**Check Server Status:**
```bash
curl http://localhost:5000/health
```

**View Running Processes:**
```powershell
Get-Process node
```

**Kill Server:**
```powershell
Get-Process node | Stop-Process -Force
```

**View Logs:**
```bash
node src/server.js
# Look for MongoDB connection and server startup messages
```

---

## 🚀 Next Phase Preview

Phase 3 will add:
- User profile routes
- Business management endpoints
- Team member invitation system
- Inventory CRUD operations
- Order workflow management
- Real-time notifications
- Refresh token rotation

---

**Last Updated:** 2026-02-06
**Status:** ✅ Phase 2 Complete
**Next:** Phase 3 - User & Business Management
