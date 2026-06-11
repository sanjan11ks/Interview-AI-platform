const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const uploadRoutes = require('./routes/upload');
const interviewRoutes = require('./routes/interview');
const recordingRoutes = require('./routes/recording');
const analysisRoutes = require('./routes/analysis');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const violationsRoutes = require('./routes/violations');
const videosRoutes = require('./routes/videos');
const brandingRoutes = require('./routes/branding');

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠  ANTHROPIC_API_KEY not set. Admin must add it via Settings before interviews can run.');
}

const { UPLOAD_DIR } = require('./utils/paths');
console.log(`  Upload directory: ${UPLOAD_DIR}`);
fs.mkdirSync(path.join(UPLOAD_DIR, 'resumes'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'recordings'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'reports'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'logos'), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // needed for Vite in prod
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn.prod.website-files.com'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
// Disable X-Powered-By (don't advertise Express)
app.disable('x-powered-by');
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : true }));
app.use(morgan('dev'));
// Strict body size limits per content type
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Serve uploaded logos publicly (logos are intentionally public — they appear on candidate pages)
app.use('/uploads/logos', express.static(path.join(UPLOAD_DIR, 'logos')));

app.use('/api/upload', uploadRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/recording', recordingRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/branding', brandingRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  Interview Agent API running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});
