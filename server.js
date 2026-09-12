require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./src/config');
const { requestLogger } = require('./src/middleware/logger');
const storage = require('./src/utils/storage');

const healthRoutes = require('./src/routes/health');
const uploadRoutes = require('./src/routes/upload');
const signalingRoutes = require('./src/routes/signaling');
const statsRoutes = require('./src/routes/stats');

const app = express();

// -------- Global middleware --------
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('combined'));
app.use(requestLogger);

// -------- Ensure upload dir exists --------
storage.ensureUploadDir();

// -------- Routes --------
app.use('/api/health', healthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/signaling', signalingRoutes);
app.use('/api/stats', statsRoutes);

// -------- Root endpoint --------
app.get('/', (req, res) => {
  res.json({
    name: 'Signaling & File Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health:        'GET  /api/health',
      ping:          'GET  /api/health/ping',
      upload:        'POST /api/upload              (field: file)',
      uploadMulti:   'POST /api/upload/multiple     (field: files)',
      listFiles:     'GET  /api/upload',
      deleteFile:    'DELETE /api/upload/:filename',
      stats:         'GET  /api/stats',
      storageStats:  'GET  /api/stats/storage',
      downloadSpeed: 'GET  /api/stats/speed?size=1048576',
      uploadSpeed:   'POST /api/stats/speed         (octet-stream)',
      joinRoom:      'POST /api/signaling/join',
      offer:         'POST /api/signaling/offer',
      answer:        'POST /api/signaling/answer',
      ice:           'POST /api/signaling/ice',
      pollMessages:  'GET  /api/signaling/messages/:roomId/:peerId',
      leave:         'POST /api/signaling/leave',
      rooms:         'GET  /api/signaling/rooms'
    }
  });
});

// -------- 404 handler --------
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// -------- Error handler --------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// -------- Start server --------
const server = app.listen(config.port, config.host, () => {
  const line = '─'.repeat(60);
  console.log(line);
  console.log('  🚀  Signaling & File Server is running');
  console.log(line);
  console.log(`  ➜  Local:    http://localhost:${config.port}`);
  console.log(`  ➜  Network:  http://${config.host}:${config.port}`);
  console.log(`  ➜  Env:      ${config.env}`);
  console.log(`  ➜  Uploads:  ${config.uploadDir}`);
  console.log(line);
  console.log('  💡 Tip: run "ngrok http ' + config.port + '" in another terminal');
  console.log(line);
});

// -------- Graceful shutdown --------
const shutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));