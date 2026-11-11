import { useRef, useState } from 'react';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadComponent({ onUpload, isUploading, error }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function selectFile(nextFile) {
    if (nextFile) {
      setFile(nextFile);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    const uploaded = await onUpload(file);
    if (uploaded) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`drop-zone${isDragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        htmlFor="document-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          selectFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          className="visually-hidden"
          id="document-file"
          type="file"
          onChange={(event) => selectFile(event.target.files[0])}
          disabled={isUploading}
        />
        <span className="drop-mark" aria-hidden="true">+</span>
        <span className="drop-title">{file ? 'Arquivo selecionado' : 'Solte um arquivo aqui'}</span>
        <span className="drop-hint">ou escolha no seu dispositivo</span>
        <span className="browse-action">Selecionar arquivo</span>
      </label>

      {file && (
        <div className="selected-file">
          <div className="selected-file-copy">
            <strong title={file.name}>{file.name}</strong>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            disabled={isUploading}
          >
            Remover
          </button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-button upload-button" type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}