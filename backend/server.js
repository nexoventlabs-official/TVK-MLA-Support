require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const flowEndpointRoutes = require('./routes/flowEndpoint');
const membersRoutes = require('./routes/members');
const votersRoutes = require('./routes/voters');
const serviceRequestsRoutes = require('./routes/serviceRequests');
const campaignsRoutes = require('./routes/campaigns');
const flowImagesRoutes = require('./routes/flowImages');
const dashboardRoutes = require('./routes/dashboard');
const eventsRoutes = require('./routes/events');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser callers (curl, Meta webhooks, server-to-server) → allow.
      if (!origin) return cb(null, true);
      // If no allowlist is configured, reflect the origin (fail-open). The
      // API uses Bearer-token auth so cross-origin requests are safe even
      // without an explicit list.
      if (allowedOrigins.length === 0) return cb(null, origin);
      if (allowedOrigins.includes(origin)) return cb(null, origin);
      // Always permit localhost during local dev.
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, origin);
      // Permit any *.vercel.app preview deploy of this admin (so Vercel
      // preview URLs work without manually whitelisting each one).
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, origin);
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: false,
  })
);

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/webhook/meta')) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) =>
  res.json({ name: 'TVK Grievance API', status: 'ok', time: new Date().toISOString() })
);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/flow-endpoint', flowEndpointRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/voters', votersRoutes);
app.use('/api/service-requests', serviceRequestsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/flow-images', flowImagesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events', eventsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.use((err, _req, res, _next) => {
  console.error('[ErrorHandler]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '5050', 10);

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not configured');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('[Mongo] connected');
  } catch (err) {
    console.error('[Mongo] connection failed:', err.message);
    process.exit(1);
  }

  try {
    const Admin = require('./models/Admin');
    const bcrypt = require('bcryptjs');
    const count = await Admin.countDocuments();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin';
      const passwordHash = await bcrypt.hash(password, 10);
      await Admin.create({ username, passwordHash });
      console.log(`[Seed] Default admin created: ${username}`);
    }
  } catch (err) {
    console.warn('[Seed] admin seed skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}`);
  });
}

start();
