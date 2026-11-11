import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getExtension(filename) {
  const extension = filename.split('.').pop();
  return extension && extension !== filename ? extension.slice(0, 5).toUpperCase() : 'ARQ';
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-message" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-index" aria-hidden="true">—</span>
        <p>Nenhum documento no acervo ainda.</p>
      </div>
    );
  }

  return (
    <div className="document-table" role="list" aria-label="Documentos enviados">
      {documents.map((document) => (
        <article className="document-row" key={document.id} role="listitem">
          <span className="file-type" aria-hidden="true">{getExtension(document.originalName)}</span>
          <div className="document-main">
            <h3 title={document.originalName}>{document.originalName}</h3>
            <p>{formatDate(document.uploadedAt)}</p>
          </div>
          <span className="document-size">{formatFileSize(document.size)}</span>
          <DownloadButton document={document} />
        </article>
      ))}
    </div>
  );
}