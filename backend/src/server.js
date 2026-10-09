import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import evidenceRoutes from './routes/evidence.js';
import blockchainRoutes from './routes/blockchain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Hardened Security Headers
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xXssProtection: true,
  referrerPolicy: { policy: 'no-referrer' }
}));

// CORS - Allow Vite dev server, Capacitor Android WebViews, and local network devices
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile native / curl / postman) with no origin
    if (!origin) return callback(null, true);
    
    if (
      allowedOrigins.includes(origin) ||
      origin === process.env.FRONTEND_URL ||
      /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin) ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://')
    ) {
      return callback(null, true);
    }
    // Permissive fallback in development
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files - serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Initialize DB
await initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    blockchain_mode: process.env.BLOCKCHAIN_MODE || 'mock',
    version: '1.0.0'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CivicChain Backend running on port ${PORT}`);
  console.log(`🔗 Blockchain mode: ${process.env.BLOCKCHAIN_MODE || 'mock'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
