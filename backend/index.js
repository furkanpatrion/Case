require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const { createServer } = require('http');
const { Server } = require('socket.io');

const errorHandler = require('./src/middleware/errorHandler');
const { initMQTT, initSocketIO } = require('./src/services/mqttService');
const prisma = require('./src/config/db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against XSS
app.use(xss());

// Prevent Parameter Pollution
app.use(hpp());

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for dev/testing
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Stricter Rate Limiting for Auth (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again after an hour'
});
app.use('/api/auth/login', authLimiter);

const passport = require('./src/config/passport');
const sensorRoutes = require('./src/routes/sensorRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sensors', sensorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Socket.io context
io.on('connection', (socket) => {
  console.log('Client connected to Socket.io');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Error Handling
app.use(errorHandler);

// Start Services
const PORT = process.env.PORT || 5000;

const { startFakeSensorDataStream } = require('./utils/fakerStream');

const start = async () => {
  try {
    initSocketIO(io);
    initMQTT();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      // Start streaming fake mock sensor payload to Mosquitto
      startFakeSensorDataStream();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

start();
