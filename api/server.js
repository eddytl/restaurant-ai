require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const pinoHttp = require('pino-http');
const promClient = require('prom-client');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined
});

const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const conversationRoutes = require('./routes/conversations');
const customerRoutes = require('./routes/customers');
const categoryRoutes = require('./routes/categories');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchopetyamo';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Prometheus
promClient.collectDefaultMetrics({ prefix: 'api_' });
const httpDuration = new promClient.Histogram({
  name: 'api_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2]
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' } }));
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.path, status: res.statusCode }));
  next();
});

// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Only start the HTTP server when run directly (not when required by tests)
if (require.main === module) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      logger.info({ uri: MONGODB_URI }, 'Connected to MongoDB');
      app.listen(PORT, () => logger.info({ port: PORT }, 'Restaurant API running'));
    })
    .catch((err) => {
      logger.fatal({ err }, 'Failed to connect to MongoDB');
      process.exit(1);
    });
}

module.exports = app;
