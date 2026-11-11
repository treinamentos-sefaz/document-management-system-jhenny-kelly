const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');
const { storageDirectory, maxFileSizeBytes } = require('../config/storage');

const router = express.Router();
const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(_req, _file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
}).single('file');

function handleUpload(req, res, next) {
  upload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      documentsController.sendError(res, 413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido.');
      return;
    }

    if (error instanceof multer.MulterError) {
      documentsController.sendError(res, 400, 'INVALID_REQUEST', 'Envie um único arquivo no campo file.');
      return;
    }

    documentsController.sendError(res, 500, 'UPLOAD_FAILED', 'Não foi possível enviar o documento.');
  });
}

router.post('/upload', handleUpload, documentsController.upload);
router.get('/documents', documentsController.list);
router.get('/documents/:id/download', documentsController.download);

module.exports = router;