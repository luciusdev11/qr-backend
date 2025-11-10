require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const qrRoutes = require('./routes/qrRoutes');
const trackRoutes = require('./routes/trackRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy - Important for Render
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    /\.vercel\.app$/,  // Allow all Vercel domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/qr', qrRoutes);
app.use('/track', trackRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'QR Code Tracker API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      generateQR: 'POST /api/qr/generate',
      listQR: 'GET /api/qr/list',
      getQR: 'GET /api/qr/:id',
      deleteQR: 'DELETE /api/qr/:id',
      stats: 'GET /api/qr/stats/:id',
      track: 'GET /track/:shortId'
    },
    documentation: 'https://github.com/luciusdev11'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
   ║  🚀 QR Tracker API Server Running    ║
  ╚════════════════════════════════════════╝
  📍 Port: ${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  🔗 Local: http://localhost:${PORT}
  🌐 Network: ${process.env.BASE_URL || 'Not set'}
  📊 Health: ${process.env.BASE_URL || 'http://localhost:' + PORT}/api/health

  ${process.env.NODE_ENV === 'production' ? '✅ Production Mode' : '⚠️  Development Mode'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;