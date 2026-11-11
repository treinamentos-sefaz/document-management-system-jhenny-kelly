const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

const documentsById = new Map();
const storedNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveStoredPath(storedName) {
  if (!storedNamePattern.test(storedName)) {
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