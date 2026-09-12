const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const config = require('../config');
const storage = require('../utils/storage');

storage.ensureUploadDir();

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}-${id}-${base}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: config.maxFileSize },
});

// POST /api/upload  — single file (field: "file")
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }
  res.status(201).json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sizeMB: +(req.file.size / (1024 * 1024)).toFixed(3),
      path: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
    },
  });
});

// POST /api/upload/multiple — up to 10 files (field: "files")
router.post('/multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded. Use field name "files".' });
  }
  res.status(201).json({
    success: true,
    count: req.files.length,
    files: req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      path: `/uploads/${f.filename}`,
    })),
  });
});

// GET /api/upload — list all files
router.get('/', (req, res) => {
  const stats = storage.getStorageStats();
  res.json({ count: stats.files.length, files: stats.files });
});

// DELETE /api/upload/:filename
router.delete('/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(config.uploadDir, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  fs.unlinkSync(filePath);
  res.json({ success: true, deleted: safeName });
});

// Multer error handling
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  next(err);
});

module.exports = router;