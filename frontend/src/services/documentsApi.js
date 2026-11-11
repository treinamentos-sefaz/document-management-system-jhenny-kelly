const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function readError(response) {
  try {
    const body = await response.json();
    return new ApiError(
      body.error?.message || 'A solicitação não foi concluída.',
      body.error?.code || 'REQUEST_FAILED',
      response.status,
    );
  } catch {
    return new ApiError('A solicitação não foi concluída.', 'REQUEST_FAILED', response.status);
  }
}

async function fetchApi(path, options) {
  try {
    return await fetch(`${API_BASE}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      'Não foi possível conectar ao servidor. Tente novamente.',
      'NETWORK_ERROR',
      0,
    );
  }
}

async function requestJson(path, options = {}) {
  const response = await fetchApi(path, options);
  if (!response.ok) {
    throw await readError(response);
  }

  const body = await response.json();
  return body.data;
}

function getDownloadFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) {
    return fallbackName;
  }

  const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return fallbackName;
    }
  }

  const quotedName = contentDisposition.match(/filename="([^"]*)"/i)?.[1];
  const plainName = contentDisposition.match(/filename=([^;]+)/i)?.[1]?.trim();
  return quotedName || plainName || fallbackName;
}

export function getDocuments({ signal } = {}) {
  return requestJson('/documents', { signal });
}

export function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  return requestJson('/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function downloadDocument(document) {
  const response = await fetchApi(
    `/documents/${encodeURIComponent(document.id)}/download`,
  );
  if (!response.ok) {
    throw await readError(response);
  }

  return {
    blob: await response.blob(),
    filename: getDownloadFilename(
      response.headers.get('Content-Disposition'),
      document.originalName,
    ),
  };
}