process.on('uncaughtException', (err) => { console.error("UNCAUGHT EXCEPTION:", err); process.exit(1); });
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

const logger = require('./src/config/logger'); // Logger eklendi
const errorHandler = require('./src/middleware/errorHandler');
const { initMQTT, initSocketIO } = require('./src/services/mqttService');
const { startFakeSensorDataStream } = require('./utils/fakerStream');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(xss());
app.use(hpp());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests'
});
app.use('/api/', limiter);

// Routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const sensorRoutes = require('./src/routes/sensorRoutes');
const passport = require('./src/config/passport');

app.use(passport.initialize());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sensors', sensorRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

io.on('connection', (socket) => {
  logger.info('Socket client connected');
  socket.on('disconnect', () => logger.info('Socket client disconnected'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
    });

    initSocketIO(io);
    initMQTT();

    if (process.env.NODE_ENV !== 'test') { // Don't start listening during tests
      httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        startFakeSensorDataStream();
      });
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

module.exports = { app, httpServer };