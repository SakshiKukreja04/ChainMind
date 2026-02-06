# ChainMind Backend - Phase 1: Foundation

Backend foundation for the ChainMind hackathon project built with Node.js, Express, MongoDB, and Socket.IO.

## 🎯 Overview

This is **Phase 1** - a clean, scalable backend foundation with:
- Express.js server setup
- MongoDB connection
- JWT authentication middleware
- Socket.IO real-time communication
- Health check endpoint

No business logic - focus on clean architecture and extensibility.

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (jsonwebtoken) |
| Real-time | Socket.IO |
| ML Service | Flask (via Axios) |

## 📁 Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.js       # Environment variables
│   │   └── db.js        # MongoDB connection
│   ├── routes/          # API route handlers
│   │   └── health.routes.js
│   ├── middleware/      # Express middleware
│   │   └── auth.middleware.js
│   ├── utils/           # Utility functions
│   │   └── jwt.js       # JWT utilities
│   ├── sockets/         # Socket.IO setup
│   │   └── index.js
│   ├── app.js           # Express app initialization
│   └── server.js        # Server bootstrap
├── .env.example         # Environment template
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your values:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/chainmind
   JWT_SECRET=your-secret-key-here
   ML_SERVICE_URL=http://localhost:6000
   ```

3. **Start MongoDB** (if local)
   ```bash
   mongod
   ```

4. **Run Server**
   ```bash
   # Production
   npm start

   # Development (with auto-reload)
   npm run dev
   ```

## 📡 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "ChainMind Backend",
  "timestamp": "2024-02-06T10:30:00.000Z"
}
```

## 🔌 Socket.IO Events

### Connection
```javascript
socket.on('connection', () => {
  // Client connected
});
```

### Disconnect
```javascript
socket.on('disconnect', () => {
  // Client disconnected
});
```

### Ping-Pong (Testing)
```javascript
socket.emit('ping', {});
socket.on('pong', (data) => {
  // Received pong response
});
```

## 🔐 Authentication

The auth middleware decodes JWT tokens from the `Authorization` header:

```
Authorization: Bearer <token>
```

**Usage in routes:**
```javascript
const { authMiddleware } = require('./middleware/auth.middleware');
router.post('/protected', authMiddleware, (req, res) => {
  const user = req.user; // Decoded token
});
```

## 📦 Available Utilities

### JWT Utils
```javascript
const { generateToken, verifyToken } = require('./utils/jwt');

// Generate token
const token = generateToken({ userId: '123', role: 'user' });

// Verify token
const decoded = verifyToken(token);
```

## 🧪 Testing

Run health check:
```bash
curl http://localhost:5000/health
```

## 📝 Notes

- **No Business Logic Yet**: This is foundation only
- **Role-Based Auth**: To be implemented in Phase 2
- **Models**: Vendor/SME/User models to be created in Phase 2
- **Extensible**: Easy to add routes, models, and event handlers

## 🔄 Next Steps (Phase 2)

- [ ] User/Auth models and routes
- [ ] Vendor management endpoints
- [ ] SME dashboard logic
- [ ] ML service integration
- [ ] Advanced Socket.IO events
- [ ] Database error handling
- [ ] Rate limiting
- [ ] Logging system

## 📄 License

MIT

---

**Built with ❤️ for ChainMind Hackathon**
