const { randomUUID } = require('node:crypto');
const path = require('node:path');
const documentsRepository = require('../repositories/documents.repository');
const { defaultOwner } = require('../config/storage');

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

function createDocumentError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function normalizeOriginalName(originalName) {
  const normalizedPath = String(originalName || '').replace(/\\/g, '/');
  return path.posix.basename(normalizedPath) || 'document';
}

function normalizeMimeType(mimeType) {
  return typeof mimeType === 'string' && MIME_TYPE_PATTERN.test(mimeType)
    ? mimeType
    : 'application/octet-stream';
}

async function createDocument(file) {
  const document = {
    id: randomUUID(),
    storedName: file.filename,
    originalName: normalizeOriginalName(file.originalname),
    size: file.size,
    mimeType: normalizeMimeType(file.mimetype),
    uploadedAt: new Date().toISOString(),
    owner: defaultOwner,
  };

  try {
    await documentsRepository.create(document);
  } catch (error) {
    try {
      await documentsRepository.removeStoredFile(document.storedName);
    } catch {
      // Preserve the metadata error; storage cleanup is best effort.
    }

    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments() {
  return documentsRepository.findAll().map(toPublicDocument);
}

async function getDocumentForDownload(id) {
  if (!UUID_V4_PATTERN.test(id)) {
    throw createDocumentError('INVALID_DOCUMENT_ID');
  }

  const document = documentsRepository.findById(id);
  if (!document) {
    throw createDocumentError('DOCUMENT_NOT_FOUND');
  }

  const filePath = await documentsRepository.findStoredPath(document.storedName);
  if (!filePath) {
    throw createDocumentError('DOCUMENT_NOT_FOUND');
  }

  return {
    filePath,
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};