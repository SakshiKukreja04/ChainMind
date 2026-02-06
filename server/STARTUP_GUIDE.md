#!/bin/bash
# ChainMind Server Startup Guide

## Prerequisites
# 1. MongoDB running locally or MongoDB Atlas connection string
# 2. Node.js dependencies installed (npm install)
# 3. .env file configured with MONGO_URI

## Setup Steps

### 1. Install Dependencies (if not already done)
```bash
cd server
npm install
```

### 2. Create .env File
```bash
cp .env.example .env
```

Edit `.env` with:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chainmind
JWT_SECRET=your-super-secret-key-change-this
ML_SERVICE_URL=http://localhost:6000
```

### 3. Start MongoDB (if local)

**Windows:**
```bash
mongod
```

**macOS (with Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**MongoDB Atlas (Cloud):**
Use connection string: `mongodb+srv://username:password@cluster.mongodb.net/chainmind`

### 4. Start Backend Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Expected Output

```
╔═══════════════════════════════════════╗
║   ChainMind Backend - PHASE 1         ║
║   Foundation Service                  ║
╚═══════════════════════════════════════╝
      
✓ Server running on port 5000
✓ MongoDB connected
✓ Socket.IO initialized
✓ Ready for development

📍 Health Check: GET http://localhost:5000/health
```

## Test Backend

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "service": "ChainMind Backend",
  "timestamp": "2024-02-06T10:30:00.000Z"
}
```

### 2. Test Database Connection
```bash
node src/models/test.js
```

### 3. Import Models in Node
```bash
node -e "const models = require('./src/models'); console.log(Object.keys(models));"
```

## Common Issues

### MongoDB Connection Refused
**Problem:** `connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
1. Ensure MongoDB is running: `mongod`
2. Check MONGO_URI in .env
3. If using Atlas, verify connection string format

### Models Not Loading
**Problem:** Module not found errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
**Problem:** `EADDRINUSE :::5000`

**Solution:**
```bash
# Change PORT in .env to different value (e.g., 5001)
PORT=5001
```

Or kill process on port 5000:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

## Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src
COPY .env.example ./.env

EXPOSE 5000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: chainmind
    volumes:
      - mongodb_data:/data/db

  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      MONGO_URI: mongodb://mongodb:27017/chainmind
      JWT_SECRET: supersecretkey
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

### Run with Docker
```bash
docker-compose up
```

## Architecture

```
Client (Frontend)
     ↓
   Socket.IO
     ↓
Express Server (Port 5000)
     ├── Routes
     ├── Middleware
     ├── Models
     └── Controllers (Phase 2)
     ↓
MongoDB (Port 27017)
```

## Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | Number | 5000 | Server port |
| NODE_ENV | String | development | Environment |
| MONGO_URI | String | mongodb://localhost:27017/chainmind | DB connection |
| JWT_SECRET | String | supersecretkey | JWT signing key |
| ML_SERVICE_URL | String | http://localhost:6000 | ML service endpoint |

## File Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.js          # MongoDB connection
│   │   └── env.js         # Environment config
│   ├── routes/
│   │   └── health.routes.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Business.model.js
│   │   ├── Product.model.js
│   │   ├── Vendor.model.js
│   │   ├── Order.model.js
│   │   ├── index.js
│   │   └── test.js
│   ├── utils/
│   │   └── jwt.js
│   ├── sockets/
│   │   └── index.js
│   ├── app.js             # Express setup
│   └── server.js          # Server bootstrap
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies
├── README.md              # Project readme
├── MODELS.md              # Model reference
├── MODELS_EXTENSION.md    # Usage patterns
└── IMPLEMENTATION_SUMMARY.md
```

## Debugging

### Enable Mongoose Debug
```javascript
mongoose.set('debug', true);
```

### Check Active Connections
```bash
mongo --eval "db.adminCommand('serverStatus').connections"
```

### View Collections
```bash
mongo chainmind --eval "db.getCollectionNames()"
```

## Performance Tips

1. **Use Indexes Efficiently**
   - Already configured in models
   - Check index usage: `db.collection.getIndexes()`

2. **Connection Pooling**
   - Mongoose auto-manages pool (default 5)
   - Increase if needed: `maxPoolSize` option

3. **Query Optimization**
   - Use `populate()` to avoid N+1 queries
   - Use projection to limit fields: `.select('field1 field2')`
   - Use aggregation for complex queries

4. **Caching** (Phase 2)
   - Implement Redis for frequently accessed data
   - Cache JWT tokens
   - Cache business settings

---

**Backend is now running and ready for development!** 🚀
