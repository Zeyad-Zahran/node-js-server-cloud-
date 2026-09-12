const express = require('express');
const os = require('os');
const router = express.Router();
const storage = require('../utils/storage');

// GET /api/stats — full system + storage report
router.get('/', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();

  res.json({
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model,
      cpuCount: cpus.length,
      loadAverage: os.loadavg(),
      osUptimeSec: os.uptime(),
    },
    memory: {
      totalBytes: totalMem,
      totalGB: +(totalMem / (1024 ** 3)).toFixed(2),
      freeBytes: freeMem,
      freeGB: +(freeMem / (1024 ** 3)).toFixed(2),
      usedBytes: usedMem,
      usedGB: +(usedMem / (1024 ** 3)).toFixed(2),
      usedPercent: +((usedMem / totalMem) * 100).toFixed(2),
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSec: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    storage: storage.getStorageStats(),
  });
});

// GET /api/stats/storage
router.get('/storage', (req, res) => {
  res.json(storage.getStorageStats());
});

// GET /api/stats/speed?size=1048576  (download speed test)
router.get('/speed', (req, res) => {
  const maxSize = 10 * 1024 * 1024; // 10 MB cap
  const size = Math.min(parseInt(req.query.size, 10) || 1024 * 1024, maxSize);
  const buffer = Buffer.alloc(size, 'x');
  res.set('Content-Type', 'application/octet-stream');
  res.set('Content-Length', size);
  res.set('Cache-Control', 'no-store');
  res.send(buffer);
});

// POST /api/stats/speed — upload speed test (raw octet-stream)
router.post('/speed', (req, res) => {
  let received = 0;
  const start = Date.now();
  req.on('data', (chunk) => { received += chunk.length; });
  req.on('end', () => {
    const durationMs = Date.now() - start;
    const bytesPerSec = durationMs > 0 ? (received / durationMs) * 1000 : 0;
    res.json({
      receivedBytes: received,
      receivedMB: +(received / (1024 * 1024)).toFixed(3),
      durationMs,
      speedBytesPerSec: Math.round(bytesPerSec),
      speedMBps: +(bytesPerSec / (1024 * 1024)).toFixed(2),
    });
  });
});

module.exports = router;