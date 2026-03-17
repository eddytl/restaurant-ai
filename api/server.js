require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const conversationRoutes = require('./routes/conversations');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchopetyamo';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/conversations', conversationRoutes);

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
  console.error('Error:', err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB then start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    app.listen(PORT, () => {
      console.log(`Restaurant API server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
