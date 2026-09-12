const express = require('express');
const os = require('os');
const router = express.Router();

const startTime = Date.now();

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

// GET /api/health
router.get('/', (req, res) => {
  const uptime = Date.now() - startTime;
  res.json({
    status: 'ok',
    service: 'signaling-file-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeMs: uptime,
    uptimeHuman: formatUptime(uptime),
    hostname: os.hostname(),
    platform: os.platform(),
    node: process.version,
  });
});

// GET /api/health/ping
router.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

module.exports = router;