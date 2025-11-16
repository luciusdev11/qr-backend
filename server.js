require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Import routes
const qrRoutes = require('./routes/qrRoutes');
const trackRoutes = require('./routes/trackRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy - Important for deployed servers
app.set('trust proxy', 1);

// Development mode optimization
const isDev = process.env.NODE_ENV !== 'production';

// Rate limiting - More lenient in dev
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // 1000 requests in dev, 100 in production
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => isDev && req.ip === '127.0.0.1' // Skip rate limit for localhost in dev
});

app.use('/api/', limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'qr-tracker-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: !isDev, // Only HTTPS in production
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: isDev ? 'lax' : 'none'
  }
}));

// CORS - Very permissive in dev
app.use(cors({
  origin: isDev ? true : [ // Allow all origins in dev
    process.env.FRONTEND_URL,
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing - Larger limits in dev for easier testing
app.use(express.json({ limit: isDev ? '50mb' : '10mb' }));
app.use(express.urlencoded({ extended: true, limit: isDev ? '50mb' : '10mb' }));

// Request logging (only in development)
if (isDev) {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/track', trackRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    version: '1.0.3',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    mode: isDev ? 'Development (Optimized)' : 'Production',
    features: {
      rateLimitPerHour: isDev ? 1000 : 100,
      maxPayloadSize: isDev ? '50MB' : '10MB',
      corsPolicy: isDev ? 'Allow All' : 'Restricted'
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'QR Code Tracker API',
    version: '1.0.3',
    status: 'running',
    mode: isDev ? '💻 Development Mode' : '🚀 Production Mode',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      checkAuth: 'GET /api/auth/check',
      generateQR: 'POST /api/qr/generate',
      listQR: 'GET /api/qr/list',
      getQR: 'GET /api/qr/:id',
      deleteQR: 'DELETE /api/qr/:id',
      stats: 'GET /api/qr/stats/:id',
      track: 'GET /track/:shortId'
    },
    optimization: isDev ? {
      rateLimit: '1000 req/15min',
      payloadLimit: '50MB',
      cors: 'Allow All Origins',
      logging: 'Enabled'
    } : null
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
    message: isDev ? err.message : 'Something went wrong',
    stack: isDev ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   🚀 QR Tracker API v1.0.3            ║
  ╚════════════════════════════════════════╝
  
  📍 Port: ${PORT}
  🌍 Mode: ${isDev ? '💻 DEVELOPMENT (Optimized)' : '🚀 PRODUCTION'}
  🔗 Local: http://localhost:${PORT}
  🌐 Network: ${process.env.BASE_URL || 'Not set'}
  📊 Health: http://localhost:${PORT}/api/health
  🔐 Auth: ${process.env.ADMIN_PASSWORD_HASH ? 'Enabled' : '⚠️  Disabled'}
  
  ${isDev ? `
  ⚡ DEV OPTIMIZATIONS:
  • Rate Limit: 1000 req/15min
  • Payload: 50MB max
  • CORS: Allow all origins
  • Logging: Enabled
  • Perfect for testing!
  ` : '✅ Production Mode Active'}
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