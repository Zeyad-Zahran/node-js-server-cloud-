const fs = require('fs');
const path = require('path');
const config = require('../config');

function ensureUploadDir() {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
}

function getStorageStats() {
  ensureUploadDir();
  const entries = fs.readdirSync(config.uploadDir);
  let totalSize = 0;
  const files = [];

  for (const name of entries) {
    const fp = path.join(config.uploadDir, name);
    try {
      const stat = fs.statSync(fp);
      if (stat.isFile()) {
        totalSize += stat.size;
        files.push({
          name,
          size: stat.size,
          sizeMB: +(stat.size / (1024 * 1024)).toFixed(3),
          modified: stat.mtime.toISOString(),
        });
      }
    } catch (_) { /* ignore */ }
  }

  const usedPercent = config.storageQuota > 0
    ? +((totalSize / config.storageQuota) * 100).toFixed(2)
    : 0;

  return {
    totalFiles: files.length,
    totalSizeBytes: totalSize,
    totalSizeMB: +(totalSize / (1024 * 1024)).toFixed(2),
    quotaBytes: config.storageQuota,
    quotaGB: +(config.storageQuota / (1024 ** 3)).toFixed(2),
    freeBytes: Math.max(0, config.storageQuota - totalSize),
    freeGB: +(Math.max(0, config.storageQuota - totalSize) / (1024 ** 3)).toFixed(2),
    usedPercent,
    files,
  };
}

module.exports = { ensureUploadDir, getStorageStats };