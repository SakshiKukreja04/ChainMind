# ChainMind Authentication - Phase 2 Implementation

Complete authentication and role-based access control system.

## 📚 Overview

This phase implements:
- Secure user signup with password hashing
- User login with JWT token generation
- Token verification middleware
- Role-based access control (OWNER, MANAGER, VENDOR)
- Business association for multi-tenancy

## 🔐 Security Features

### Password Security
- Bcrypt hashing (10 rounds)
- Salted password storage
- Never transmit plain passwords

### JWT Security
- 7-day token expiration
- Payload contains: userId, role, businessId
- Verified on every protected request
- Signed with JWT_SECRET from environment

### Role-Based Access
- OWNER: Full platform access
- MANAGER: Operational access
- VENDOR: Supplier access (read-only)

---

## 📡 API Endpoints

### 1. Signup
**POST** `/api/auth/signup`

Create new user account

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "OWNER",
  "businessId": null
}
```

**Rules:**
- Name, email, password, role required
- Email must be unique (case-insensitive)
- Role must be: OWNER | MANAGER | VENDOR
- OWNER: Creates new business automatically
- MANAGER/VENDOR: Must provide existing businessId

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "businessId": "507f1f77bcf86cd799439012"
  }
}
```

**Error Responses:**
- 400: Missing required fields
- 409: Email already registered
- 404: Business not found (for MANAGER/VENDOR)

---

### 2. Login
**POST** `/api/auth/login`

Authenticate user and return JWT token

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "businessId": "507f1f77bcf86cd799439012"
  }
}
```

**Error Responses:**
- 400: Missing email or password
- 401: Invalid email or password
- 403: User account is inactive

---

### 3. Verify Token
**GET** `/api/auth/verify`

Verify JWT token (protected endpoint)

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "businessId": "507f1f77bcf86cd799439012"
  }
}
```

**Error Responses:**
- 401: No token or invalid token
- 404: User not found

---

## 🛡️ Middleware Usage

### Authentication Middleware
Verifies JWT and requires valid token

```javascript
const { authMiddleware } = require('./middleware/auth.middleware');

// Protected route
router.get('/protected', authMiddleware, controller);
```

**Behavior:**
- Reads Authorization header: `Bearer <token>`
- Verifies JWT signature
- Attaches decoded user to `req.user`
- Returns 401 if token invalid/missing

### Role Middleware
Enforces role-based access

```javascript
const { ownerOnly, managerOnly, vendorOnly } = require('./middleware/role.middleware');

// Owner only
router.delete('/business', authMiddleware, ownerOnly, deleteBusinessController);

// Manager operations
router.post('/inventory', authMiddleware, managerOnly, updateInventoryController);

// Vendor access
router.get('/orders', authMiddleware, vendorOnly, getOrdersController);

// Owner or Manager
router.get('/dashboard', authMiddleware, ownerOrManager, dashboardController);
```

**Available Middleware:**
- `ownerOnly` - Allows OWNER only
- `managerOnly` - Allows MANAGER only
- `vendorOnly` - Allows VENDOR only
- `ownerOrManager` - Allows OWNER or MANAGER
- `authenticated` - Allows any authenticated user

---

## 📋 Complete Examples

### Frontend - Signup
```javascript
// signup.js
async function handleSignup(formData) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: 'OWNER',
      businessId: null
    })
  });

  const data = await response.json();

  if (data.success) {
    // Store token in localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    const redirects = {
      'OWNER': '/owner/dashboard',
      'MANAGER': '/manager/dashboard',
      'VENDOR': '/vendor/dashboard'
    };
    window.location.href = redirects[data.user.role];
  } else {
    alert('Signup failed: ' + data.message);
  }
}
```

### Frontend - Login
```javascript
// login.js
async function handleLogin(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    // Store authentication
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect to appropriate dashboard
    const roleRedirects = {
      'OWNER': '/owner/dashboard',
      'MANAGER': '/manager/dashboard',
      'VENDOR': '/vendor/dashboard'
    };
    
    window.location.href = roleRedirects[data.user.role];
  } else {
    alert('Login failed: ' + data.message);
  }
}
```

### Frontend - Token Management
```javascript
// auth.service.js
export const getAuthToken = () => localStorage.getItem('token');

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => !!getAuthToken();

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const getAuthHeaders = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json'
});
```

### Frontend - Protected API Calls
```javascript
// api.service.js
async function protectedFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid
    logout();
    window.location.href = '/login';
  }

  return response.json();
}

// Usage
const userDashboard = await protectedFetch('/api/user/dashboard');
```

### Backend - Protected Route
```javascript
// routes/user.routes.js
const { authMiddleware } = require('../middleware/auth.middleware');
const { ownerOnly } = require('../middleware/role.middleware');

router.get('/dashboard', authMiddleware, async (req, res) => {
  // req.user is available here
  const userId = req.user.userId;
  const userRole = req.user.role;
  const businessId = req.user.businessId;
  
  // Fetch dashboard data
  res.json({ success: true, data: {} });
});

router.delete('/business/:id', authMiddleware, ownerOnly, async (req, res) => {
  // Only OWNER can delete business
  res.json({ success: true });
});
```

---

## 🔄 User Flow Diagram

```
[User Visits App]
        ↓
[Check localStorage for token]
        ↓
    [Has token?]
    /           \
  Yes            No
  ↓              ↓
[Verify]      [Redirect to
[Token]        Login/Signup]
  ↓              ↓
[Load         [User enters
 Dashboard]    credentials]
               ↓
           [POST /api/auth/login
            or /api/auth/signup]
               ↓
           [Get token + user]
               ↓
           [Store in localStorage]
               ↓
           [Redirect to Dashboard
            based on role]
```

---

## 📊 Database Impact

### User Model Changes
- `passwordHash` field stores bcrypt hash
- `isActive` flag for account status
- `businessId` links to Business

### Business Model
- Auto-created when OWNER signs up
- Links back to User via ownerId

---

## 🧪 Testing

### Test Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "OWNER"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🔑 JWT Payload Structure

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "OWNER",
  "businessId": "507f1f77bcf86cd799439012",
  "iat": 1644000000,
  "exp": 1644604800
}
```

**Fields:**
- `userId`: User MongoDB ObjectId
- `role`: OWNER | MANAGER | VENDOR
- `businessId`: Associated business
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (7 days)

---

## ⚠️ Error Handling

### Common HTTP Responses

| Code | Scenario |
|------|----------|
| 201 | User successfully registered |
| 200 | Login successful, token valid |
| 400 | Missing required fields |
| 401 | Invalid credentials or token |
| 403 | Insufficient permissions (wrong role) |
| 404 | User or business not found |
| 409 | Email already registered |
| 500 | Server error |

---

## 🚀 Frontend Integration Checklist

- [ ] Signup form validation
- [ ] Login form with email/password
- [ ] Store token in localStorage
- [ ] Store user info in localStorage
- [ ] Add Authorization header to all requests
- [ ] Redirect on 401 responses
- [ ] Role-based UI (show/hide based on role)
- [ ] Logout function clearing localStorage
- [ ] Redirect unauthenticated users to login
- [ ] Verify token on app load

---

## 🔐 Security Best Practices

✅ **Implemented**
- Password hashing with bcrypt (10 rounds)
- JWT token with 7-day expiry
- Token verification on protected routes
- Role-based access control
- Email uniqueness validation
- Password never stored in plain text

⚠️ **Frontend Responsibilities**
- Store token securely (avoid XSS)
- Don't expose token in URLs
- Clear token on logout
- Use HTTPS in production
- Validate user input

---

## 📈 Next Steps (Phase 3)

- [ ] User profile management endpoints
- [ ] Business management endpoints
- [ ] Team member management (add MANAGER/VENDOR)
- [ ] Permission-based operations
- [ ] Audit logging for security
- [ ] Session management improvements

---

**Phase 2 Complete:** Authentication and role-based access control ready for production! 🎉
