const { test } = require('node:test');
const assert = require('node:assert/strict');
const documentsService = require('../src/services/documents.service');

test('createDocument returns public metadata with a normalized filename', async () => {
  const document = await documentsService.createDocument({
    filename: 'f5f4cba3-5432-4c7a-90ab-123456789abc',
    originalname: 'C:\\private\\report.pdf',
    size: 12,
    mimetype: 'application/pdf',
  });

  assert.equal(document.originalName, 'report.pdf');
  assert.equal(document.mimeType, 'application/pdf');
  assert.equal(Object.hasOwn(document, 'storedName'), false);
});

test('getDocumentForDownload rejects malformed document IDs', async () => {
  await assert.rejects(
    documentsService.getDocumentForDownload('../private/file'),
    (error) => error.code === 'INVALID_DOCUMENT_ID',
  );
});
