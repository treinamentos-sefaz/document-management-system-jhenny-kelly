import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { getDocuments, uploadDocument } from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocuments() {
      setIsLoading(true);
      setListError('');

      try {
        const result = await getDocuments({ signal: controller.signal });
        setDocuments(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setListError(error.message || 'Não foi possível carregar os documentos.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => controller.abort();
  }, [refreshToken]);

  async function handleUpload(file) {
    setIsUploading(true);
    setUploadError('');

    try {
      const document = await uploadDocument(file);
      setDocuments((currentDocuments) => [
        document,
        ...currentDocuments.filter((item) => item.id !== document.id),
      ]);
      return true;
    } catch (error) {
      setUploadError(error.message || 'Não foi possível enviar o documento.');
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>Acervo <strong>Local</strong></span>
        </a>
        <span className="topbar-note">DOCUMENT MANAGEMENT SYSTEM</span>
      </header>

      <main className="workspace" id="inicio">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ARQUIVO DIGITAL</p>
            <h1>Documentos</h1>
            <p className="page-description">Seu acervo, organizado em um só lugar.</p>
          </div>
          <button
            className="refresh-button"
            type="button"
            onClick={() => setRefreshToken((current) => current + 1)}
            disabled={isLoading}
          >
            {isLoading ? 'Atualizando...' : 'Atualizar lista'}
          </button>
        </div>

        <div className="content-grid">
          <section className="upload-section" aria-labelledby="upload-heading">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-heading">Adicionar documento</h2>
            </div>
            <UploadComponent
              onUpload={handleUpload}
              isUploading={isUploading}
              error={uploadError}
            />
          </section>

          <section className="library-section" aria-labelledby="library-heading">
            <div className="section-heading library-heading">
              <div className="section-title-group">
                <span className="section-index">02</span>
                <h2 id="library-heading">Acervo</h2>
              </div>
              {!isLoading && !listError && (
                <span className="document-count">
                  {documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
              )}
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={() => setRefreshToken((current) => current + 1)}
            />
          </section>
        </div>
      </main>
      <footer className="page-footer">
        <span>ACERVO LOCAL</span>
        <span>Os documentos são armazenados neste servidor.</span>
      </footer>
    </div>
  );
}
