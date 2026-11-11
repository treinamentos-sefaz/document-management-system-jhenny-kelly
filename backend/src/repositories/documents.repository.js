const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');
const { isUuidV4 } = require('../utils/uuid');

const documentsById = new Map();

function resolveStoredPath(storedName) {
  if (!isUuidV4(storedName)) {
    throw new Error('Nome físico de documento inválido.');
  }

  return path.join(storageDirectory, storedName);
}

async function create(document) {
  documentsById.set(document.id, { ...document });
}

function findAll() {
  return [...documentsById.values()]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map((document) => ({ ...document }));
}

function findById(id) {
  const document = documentsById.get(id);
  return document ? { ...document } : null;
}

async function findStoredPath(storedName) {
  const filePath = resolveStoredPath(storedName);

  try {
    await fs.access(filePath);
    return filePath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function removeStoredFile(storedName) {
  await fs.rm(resolveStoredPath(storedName), { force: true });
}

module.exports = {
  create,
  findAll,
  findById,
  findStoredPath,
  removeStoredFile,
};