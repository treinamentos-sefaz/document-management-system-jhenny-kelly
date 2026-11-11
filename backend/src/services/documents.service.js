const documentsRepository = require('../repositories/documents.repository');
const { isUuidV4 } = require('../utils/uuid');
const { createDocumentRecord, toPublicDocument } = require('./documents.mapper');

function createDocumentError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

async function persistDocument(document) {
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
}

function findDocumentById(id) {
  if (!isUuidV4(id)) {
    throw createDocumentError('INVALID_DOCUMENT_ID');
  }

  const document = documentsRepository.findById(id);
  if (!document) {
    throw createDocumentError('DOCUMENT_NOT_FOUND');
  }

  return document;
}

async function createDocument(file) {
  const document = createDocumentRecord(file);
  await persistDocument(document);
  return toPublicDocument(document);
}

function listDocuments() {
  return documentsRepository.findAll().map(toPublicDocument);
}

async function getDocumentForDownload(id) {
  const document = findDocumentById(id);

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