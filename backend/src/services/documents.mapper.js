const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { defaultOwner } = require('../config/storage');

const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

function normalizeOriginalName(originalName) {
  const normalizedPath = String(originalName || '').replace(/\\/g, '/');
  return path.posix.basename(normalizedPath) || 'document';
}

function normalizeMimeType(mimeType) {
  return typeof mimeType === 'string' && MIME_TYPE_PATTERN.test(mimeType)
    ? mimeType
    : 'application/octet-stream';
}

function createDocumentRecord(file) {
  return {
    id: randomUUID(),
    storedName: file.filename,
    originalName: normalizeOriginalName(file.originalname),
    size: file.size,
    mimeType: normalizeMimeType(file.mimetype),
    uploadedAt: new Date().toISOString(),
    owner: defaultOwner,
  };
}

function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = {
  createDocumentRecord,
  toPublicDocument,
};
