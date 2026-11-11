# Especificação - Document Management System

## 1. Objetivo

Construir uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de documentos por formulário web.
- Listagem dos documentos enviados durante a execução atual do backend.
- Download de um documento pelo identificador.
- Associação de cada documento a um identificador de dono configurado para a implantação.
- Tratamento consistente de erros de validação, upload e leitura de arquivos.
- Interface React consumindo a API Express por `fetch`.

### Fora do escopo

- Armazenamento em nuvem, bancos de dados ou provedores externos.
- Persistência dos metadados entre reinicializações do backend.
- Versionamento, edição ou exclusão de documentos.
- Autenticação, cadastro de usuários e isolamento seguro entre múltiplos usuários na versão inicial.
- Conversão, pré-visualização, indexação ou busca no conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo pelo formulário de upload. |
| RF-02 | O sistema valida que um arquivo foi informado e que seu tamanho não excede o limite configurado. |
| RF-03 | O sistema grava o conteúdo do arquivo em `backend/storage` usando Multer com `diskStorage`; o nome físico é gerado pela aplicação e não deriva do nome fornecido pelo usuário. |
| RF-04 | Após um upload concluído, o sistema cria metadados com identificador único, nome original, tamanho, data de envio e dono. |
| RF-05 | O usuário pode listar os metadados dos documentos disponíveis na memória do backend. |
| RF-06 | O usuário pode baixar um documento existente pelo seu identificador. O download preserva o nome original como nome sugerido ao cliente, sem usá-lo como caminho no filesystem. |
| RF-07 | O sistema retorna erro apropriado quando a entrada é inválida, o arquivo excede o limite ou o documento não existe. |
| RF-08 | A interface apresenta estados de envio, carregamento, lista vazia e erro, e atualiza a lista após um upload bem-sucedido. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Backend em Node.js e Express, usando CommonJS e JavaScript sem TypeScript. |
| RNF-02 | Frontend em React + Vite, com componentes funcionais e Hooks. |
| RNF-03 | Arquivos enviados são persistidos exclusivamente no filesystem local em `backend/storage`, por Multer `diskStorage`; não usar armazenamento externo. |
| RNF-04 | Metadados são mantidos em memória nesta fase e podem ser perdidos ao reiniciar o processo. |
| RNF-05 | O limite máximo do arquivo é configurado por `DMS_MAX_FILE_SIZE_BYTES`; o padrão é 10 MiB (10.485.760 bytes). |
| RNF-06 | `DMS_DEFAULT_OWNER` configura o dono associado aos uploads; o padrão é `local-user`. Esse campo é descritivo e não autentica nem autoriza usuários. |
| RNF-07 | `PORT` configura a porta HTTP do backend; o padrão é `3000`. |
| RNF-08 | O frontend acessa a API pelo prefixo `/api`; no desenvolvimento, o proxy do Vite encaminha essas chamadas ao backend e remove o prefixo. |
| RNF-09 | Erros HTTP retornam estrutura previsível sem expor stack traces, caminhos locais ou detalhes internos. |
| RNF-10 | As camadas internas não dependem de Express, Multer ou objetos HTTP. O fluxo de dependência do backend é `routes -> controllers -> services -> repositories`. |

### Limites da versão inicial

A primeira versão é destinada a uma implantação de operador único. Não há autenticação e os endpoints não devem ser considerados protegidos por usuário. O `owner` não é uma fronteira de segurança e a listagem não promete isolamento por dono. Autenticação JWT e autorização por usuário são uma evolução opcional e exigiriam uma identidade confiável fornecida por middleware de autenticação.

Como os metadados são voláteis, ao reiniciar o backend a aplicação deixa de conhecer os arquivos já gravados. Esses arquivos podem permanecer em `backend/storage`, mas não estarão disponíveis para listagem ou download até que seus metadados sejam reconstruídos. A versão inicial não implementa reconstrução automática nem limpeza de órfãos.

## 5. Modelo de dados

Os metadados são mantidos em memória pelo repositório durante a execução do processo.

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | API e interno | UUID v4 usado como identificador público do documento. |
| `originalName` | string | API e interno | Nome original enviado pelo cliente; nunca é usado como caminho de armazenamento. |
| `storedName` | string | Interno | UUID v4 gerado pelo servidor, sem extensão, usado para localizar o arquivo em `backend/storage`. Não é exposto na API. |
| `size` | number | API e interno | Tamanho do arquivo em bytes. |
| `mimeType` | string | API e interno | Tipo de mídia informado/detectado no upload; o download usa `application/octet-stream` como fallback. |
| `uploadedAt` | string | API e interno | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | API e interno | Valor de `DMS_DEFAULT_OWNER` no momento do upload. É apenas metadado na versão inicial. |

Exemplo de representação pública:

```json
{
  "id": "79a9346e-30ae-4a02-a5ce-e2bc0490a4ad",
  "originalName": "relatorio.pdf",
  "size": 24831,
  "mimeType": "application/pdf",
  "uploadedAt": "2026-11-11T14:30:00.000Z",
  "owner": "local-user"
}
```

`storedName` e o caminho absoluto nunca são retornados ao cliente.

## 6. Contratos de API

Os caminhos abaixo são relativos ao backend. Durante o desenvolvimento, o frontend usa o prefixo `/api` configurado no proxy do Vite; por exemplo, `GET /documents` é chamado pelo browser como `GET /api/documents`.

### Formato de erro

Todas as falhas JSON usam o seguinte formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

Mensagens são destinadas ao cliente e não incluem stack trace nem caminhos internos.

### `POST /upload`

Envia um arquivo e registra seus metadados.

- `Content-Type`: `multipart/form-data`.
- Campo obrigatório: `file`, com exatamente um arquivo.
- Tamanho máximo: valor de `DMS_MAX_FILE_SIZE_BYTES` (padrão 10 MiB).
- Tipos de arquivo: aceitos sem allowlist de MIME na versão inicial.
- O servidor grava o arquivo em `backend/storage` com `diskStorage` e nome físico UUID gerado pelo servidor.
- Metadados são registrados somente após a gravação do arquivo concluir com sucesso.

Resposta `201 Created`:

```json
{
  "data": {
    "id": "79a9346e-30ae-4a02-a5ce-e2bc0490a4ad",
    "originalName": "relatorio.pdf",
    "size": 24831,
    "mimeType": "application/pdf",
    "uploadedAt": "2026-11-11T14:30:00.000Z",
    "owner": "local-user"
  }
}
```

Erros:

| HTTP | Código | Condição |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo válido. |
| `413` | `FILE_TOO_LARGE` | Arquivo ultrapassa `DMS_MAX_FILE_SIZE_BYTES`. |
| `500` | `UPLOAD_FAILED` | Falha inesperada ao gravar arquivo ou registrar metadados. |

### `GET /documents`

Lista os documentos registrados na memória do processo atual. A lista é ordenada do mais recente para o mais antigo. Nesta versão não há filtro nem isolamento por `owner`.

Resposta `200 OK`:

```json
{
  "data": [
    {
      "id": "79a9346e-30ae-4a02-a5ce-e2bc0490a4ad",
      "originalName": "relatorio.pdf",
      "size": 24831,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-11-11T14:30:00.000Z",
      "owner": "local-user"
    }
  ]
}
```

Quando não há documentos, retorna `200 OK` com `{"data": []}`.

Erro:

| HTTP | Código | Condição |
| --- | --- | --- |
| `500` | `DOCUMENT_LIST_FAILED` | Falha inesperada ao consultar o repositório. |

### `GET /documents/:id/download`

Baixa o conteúdo binário de um documento existente.

- `id` deve ser um UUID v4 válido.
- Sucesso retorna `200 OK`, o conteúdo binário e `Content-Type` correspondente ao tipo registrado (ou `application/octet-stream` como fallback).
- `Content-Disposition` deve indicar `attachment` e sugerir o `originalName` de forma segura para cabeçalho HTTP.
- O caminho físico é resolvido pelo servidor a partir de `storedName`; o valor da URL e o nome original nunca são concatenados a um caminho de filesystem.

Erros:

| HTTP | Código | Condição |
| --- | --- | --- |
| `400` | `INVALID_DOCUMENT_ID` | `id` não é um UUID v4 válido. |
| `404` | `DOCUMENT_NOT_FOUND` | Não há metadados para o identificador ou o arquivo não existe mais no disco. |
| `500` | `DOWNLOAD_FAILED` | Falha inesperada ao ler ou transmitir o arquivo. |

### Verificação de saúde existente

`GET /health` retorna `200 OK` e `{"status":"ok"}`. É um endpoint operacional já presente no seed, separado dos contratos de documentos.

## 7. Decisões arquiteturais

### Backend

- `routes/`: registra caminhos HTTP, aplica middleware de upload Multer e delega aos controllers.
- `controllers/`: lê parâmetros e arquivos da requisição, valida entrada básica, chama serviços e traduz resultados/erros para respostas HTTP.
- `services/`: implementa regras de negócio, como validação do identificador, limite e sequência de gravação e registro dos metadados.
- `repositories/`: mantém metadados em memória e fornece acesso aos arquivos no armazenamento local, sem expor detalhes de HTTP.
- O fluxo de dependência é `routes -> controllers -> services -> repositories`. Camadas internas não importam Express nem conhecem a camada HTTP.
- Multer é configurado com `diskStorage` e limites explícitos. A pasta de destino é `backend/storage`; nomes físicos são gerados no servidor. O nome original existe apenas como metadado.
- Se o registro em memória falhar após a gravação do arquivo, a implementação deve tentar remover o arquivo recém-criado para evitar órfão. Falhas nessa compensação são registradas sem expor caminhos ao cliente.

### Frontend

- Organização baseada em `components/`, `pages/` e `services/`.
- Componentes funcionais com React Hooks, reutilizados para upload, listagem e download.
- Um serviço centraliza `fetch` para `/api/upload`, `/api/documents` e `/api/documents/:id/download`, incluindo tratamento de respostas não-2xx.
- O frontend mostra nome, tamanho, data e estado do documento; o download usa o endpoint binário.

### Armazenamento e configuração

- Nenhum provedor de armazenamento externo é permitido.
- Arquivos são persistidos no filesystem local em `backend/storage`; metadados ficam em memória.
- Configurações são lidas de variáveis de ambiente: `PORT` (padrão `3000`), `DMS_MAX_FILE_SIZE_BYTES` (padrão `10485760`) e `DMS_DEFAULT_OWNER` (padrão `local-user`).

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Esta especificação não executa nem altera arquivos de backend ou frontend.

1. **Preparar o armazenamento e configurações:** definir leitura e validação das variáveis de ambiente, garantir diretório local `backend/storage` e configurar Multer `diskStorage`, UUID físico e limite de tamanho.
2. **Criar modelo e repositório:** definir os metadados e operações em memória; implementar acesso seguro aos arquivos locais mantendo `storedName` privado.
3. **Implementar regras de negócio:** cobrir upload, listagem ordenada e download por UUID; coordenar gravação de arquivo e registro de metadados com tratamento de falha.
4. **Expor a API:** criar controllers e routes para os três endpoints, mapear erros para os contratos definidos e preservar o endpoint `/health`.
5. **Testar o backend:** usar `node:test` para validar upload, campo obrigatório, limite de tamanho, listagem vazia e preenchida, UUID inválido, documento ausente e respostas binárias. Usar armazenamento temporário em testes quando apropriado, sem depender de serviços externos.
6. **Construir a interface:** criar serviço de API com `fetch`, componentes de upload/listagem/download e estados de carregamento, sucesso, lista vazia e falha.
7. **Validar integração:** executar backend e frontend localmente, confirmar o proxy `/api`, enviar um documento, verificar sua aparição na lista e concluir o download; executar testes do backend e build do frontend.

## 9. Critérios de aceite

- O upload aceita o campo `file`, grava o conteúdo somente no armazenamento local e retorna metadados sem expor `storedName` ou caminho local.
- Arquivos acima do limite configurado são recusados com `413 FILE_TOO_LARGE`.
- A listagem retorna somente os metadados conhecidos pelo processo atual e uma lista vazia quando não há registros.
- Um documento existente pode ser baixado pelo ID; IDs inválidos e documentos ausentes retornam os erros especificados.
- O frontend usa o prefixo `/api` e oferece upload, listagem e download com tratamento dos estados principais.
- A implementação respeita as quatro camadas do backend, mantém metadados em memória e não usa armazenamento externo.
- A documentação deixa explícito que não há autenticação nem isolamento multiusuário na versão inicial e que os metadados não sobrevivem à reinicialização.
