const fs = require('node:fs');
const documentsService = require('../services/documents.service');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

async function upload(req, res) {
  if (!req.file) {
    return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    const data = await documentsService.createDocument(req.file);
    return res.status(201).json({ data });
  } catch {
    return sendError(res, 500, 'UPLOAD_FAILED', 'Não foi possível enviar o documento.');
  }
}

function list(_req, res) {
  try {
    return res.json({ data: documentsService.listDocuments() });
  } catch {
    return sendError(res, 500, 'DOCUMENT_LIST_FAILED', 'Não foi possível listar os documentos.');
  }
}

async function download(req, res) {
  let document;

  try {
    document = await documentsService.getDocumentForDownload(req.params.id);
  } catch (error) {
    if (error.code === 'INVALID_DOCUMENT_ID') {
      return sendError(res, 400, error.code, 'O identificador do documento é inválido.');
    }

    if (error.code === 'DOCUMENT_NOT_FOUND') {
      return sendError(res, 404, error.code, 'Documento não encontrado.');
    }

    return sendError(res, 500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
  }

  const fileStream = fs.createReadStream(document.filePath);
  fileStream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }

    if (error.code === 'ENOENT') {
      sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      return;
    }

    sendError(res, 500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
  });

  res.attachment(document.originalName);
  res.type(document.mimeType || 'application/octet-stream');
  fileStream.pipe(res);
}

module.exports = {
  sendError,
  upload,
  list,
  download,
};