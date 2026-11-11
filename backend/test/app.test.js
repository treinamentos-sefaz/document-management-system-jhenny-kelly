const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documentos funcionam via HTTP', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  let storedName;

  t.after(async () => {
    if (storedName) {
      await documentsRepository.removeStoredFile(storedName);
    }

    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await once(server, 'listening');
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fileContents = 'DMS endpoint integration test';
  const formData = new FormData();
  formData.append('file', new Blob([fileContents], { type: 'text/plain' }), 'report.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData,
  });
  assert.strictEqual(uploadResponse.status, 201);

  const { data: uploadedDocument } = await uploadResponse.json();
  storedName = documentsRepository.findById(uploadedDocument.id)?.storedName;
  assert.ok(storedName, 'o arquivo enviado deve ser armazenado');
  assert.strictEqual(uploadedDocument.originalName, 'report.txt');
  assert.strictEqual(Object.hasOwn(uploadedDocument, 'storedName'), false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  const { data: documents } = await listResponse.json();
  assert.ok(documents.some((document) => document.id === uploadedDocument.id));

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${encodeURIComponent(uploadedDocument.id)}/download`,
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.strictEqual(await downloadResponse.text(), fileContents);
});
