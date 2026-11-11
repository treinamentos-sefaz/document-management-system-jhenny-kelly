# Especificação - Autenticação JWT e autorização de documentos

## 1. Objetivo

Permitir que usuários criem uma conta e se autentiquem com JWT, garantindo que cada usuário possa listar e baixar somente os documentos que enviou.

## 2. Escopo

### Dentro do escopo

- Cadastro de usuário com e-mail e senha.
- Login e emissão de token de acesso JWT.
- Proteção dos endpoints de documentos por autenticação.
- Associação de cada documento ao usuário autenticado no momento do upload.
- Isolamento de listagem e download por proprietário, no backend.
- Interface de cadastro/login e tratamento da sessão autenticada no frontend.
- Testes unitários e de integração para autenticação, autorização e isolamento entre usuários.

### Fora do escopo

- OAuth, login social, SSO ou autenticação multifator.
- Perfis, papéis administrativos, compartilhamento e permissões configuráveis.
- Refresh tokens, revogação global de tokens e recuperação/verificação de conta por e-mail.
- Persistência em banco de dados nesta fase; usuários e metadados continuam em memória.
- Mudança do armazenamento local dos arquivos ou versionamento de documentos.

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O usuário pode criar uma conta informando e-mail e senha válidos. O e-mail é normalizado (trim e minúsculas) e deve ser único. |
| RF-02 | O usuário pode autenticar-se com e-mail e senha e receber um JWT de acesso, sem que a resposta exponha a senha ou seu hash. |
| RF-03 | O backend deve validar tokens enviados no cabeçalho `Authorization: Bearer <token>` e rejeitar tokens ausentes, malformados, expirados ou assinados com chave inválida. |
| RF-04 | Upload, listagem e download de documentos exigem autenticação válida. O usuário não autenticado recebe `401 UNAUTHORIZED`. |
| RF-05 | No upload, o backend define o proprietário a partir do `sub` do JWT. Um campo de proprietário enviado pelo cliente nunca pode substituir essa identidade. |
| RF-06 | A listagem retorna somente documentos cujo proprietário seja o usuário autenticado. |
| RF-07 | O download só é permitido ao proprietário. Documento inexistente e documento pertencente a outro usuário devem resultar na mesma resposta `404 DOCUMENT_NOT_FOUND`, para não revelar a existência de documentos alheios. |
| RF-08 | O usuário pode encerrar a sessão no frontend; o cliente deve descartar o token. Como não há refresh token nem revogação no servidor nesta fase, um token já emitido continua válido até expirar. |
| RF-09 | Os erros de cadastro, login, validação, autenticação e autorização seguem o envelope de erro da API e não incluem stack traces, hash de senha ou token. |
| RF-10 | Requisições de listagem e download devem aplicar o filtro de proprietário na consulta do repositório, não apenas depois de carregar o documento. |

## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | Senhas nunca são armazenadas em texto puro. Usar `scrypt` de `node:crypto` com salt aleatório por usuário; comparar hashes em tempo constante. |
| RNF-02 | Usar biblioteca JWT mantida, sem implementar assinatura/validação criptográfica manualmente. Permitir somente o algoritmo configurado (`HS256`) e validar assinatura, `iss`, `aud` e `exp`. |
| RNF-03 | O token de acesso tem duração curta, padrão de 15 minutos. A duração é configurável por `JWT_ACCESS_TOKEN_TTL`. Não emitir nem armazenar refresh tokens nesta fase. |
| RNF-04 | A chave `JWT_SECRET` é obrigatória, fornecida por variável de ambiente, não versionada e deve conter pelo menos 32 bytes aleatórios. A aplicação deve falhar ao iniciar se estiver ausente ou fraca. |
| RNF-05 | O JWT deve conter, no mínimo, `sub` (UUID do usuário), `iss`, `aud`, `iat` e `exp`. O backend não deve confiar em claims de papel/permissão enviados pelo cliente. |
| RNF-06 | O frontend mantém o token somente em memória durante a sessão; não o persiste em `localStorage`, URL ou logs. Após recarregar a página, o usuário autentica-se novamente. |
| RNF-07 | Em produção, todo o tráfego deve usar HTTPS. Como a autenticação usa Bearer token e não cookie, não habilitar credenciais cross-origin sem uma necessidade aprovada. |
| RNF-08 | Aplicar limites configuráveis de tentativas de login/cadastro para reduzir abuso; respostas de login não devem distinguir e-mail inexistente de senha incorreta. |
| RNF-09 | Manter a arquitetura `routes -> controllers -> services -> repositories`; middleware de autenticação fica na camada HTTP e injeta somente o identificador validado do usuário. |
| RNF-10 | Usuários e metadados permanecem em memória nesta fase. Reiniciar o processo encerra as contas e sessões e deixa arquivos locais sem metadados; documentar essa limitação e não apresentar o armazenamento em memória como persistência de produção. |

### Configuração por ambiente

| Variável | Obrigatória | Descrição |
| -------- | ----------- | --------- |
| `JWT_SECRET` | Sim | Chave aleatória forte para assinar/verificar tokens. |
| `JWT_ACCESS_TOKEN_TTL` | Não | Duração do JWT; padrão `900` segundos. |
| `JWT_ISSUER` | Não | Emissor esperado; padrão `dms-api`. |
| `JWT_AUDIENCE` | Não | Audiência esperada; padrão `dms-frontend`. |
| `AUTH_LOGIN_RATE_LIMIT` | Não | Limite de tentativas de login por janela, com valor padrão documentado na configuração. |

## 5. Modelo de dados

### Usuário

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| `id` | string (UUID v4) | Identificador único usado como `sub` do JWT. |
| `email` | string | E-mail normalizado; único no repositório. |
| `passwordHash` | string | Hash derivado com `scrypt` e salt; nunca retornado pela API. |
| `createdAt` | string (ISO 8601) | Data/hora do cadastro. |

Validação: e-mail obrigatório e válido; senha entre 12 e 128 caracteres. A política não deve exigir combinações artificiais de classes de caracteres. Não guardar a senha original após o hash.

### Documento (metadados)

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| `id` | string (UUID v4) | Identificador público do documento. |
| `storedName` | string | Nome físico aleatório usado no filesystem; interno, nunca retornado. |
| `originalName` | string | Nome original normalizado do arquivo. |
| `size` | number | Tamanho em bytes. |
| `mimeType` | string | Tipo de mídia validado/saneado conforme a política de upload existente. |
| `uploadedAt` | string (ISO 8601) | Data/hora do upload. |
| `ownerId` | string (UUID v4) | Identificador do usuário autenticado que enviou o arquivo. |

`ownerId` substitui o proprietário global/configurado. O DTO público do documento não inclui `storedName`, `passwordHash`, token ou dados internos de autenticação. O cliente não pode definir `ownerId`.

## 6. Contratos de API

Todas as respostas de sucesso mantêm o envelope `{ "data": ... }`; erros usam `{ "error": { "code": "...", "message": "..." } }`.

### POST /auth/register

- Pública.
- Entrada JSON: `{ "email": "user@example.com", "password": "..." }`.
- Sucesso `201`: `{ "data": { "user": { "id": "...", "email": "..." }, "accessToken": "...", "tokenType": "Bearer", "expiresIn": 900 } }`.
- Erros: `400 VALIDATION_ERROR` para entrada inválida; `409 EMAIL_ALREADY_REGISTERED` para e-mail já cadastrado; `429 RATE_LIMITED` quando exceder o limite.
- A resposta nunca inclui senha ou hash.

### POST /auth/login

- Pública.
- Entrada JSON: `{ "email": "user@example.com", "password": "..." }`.
- Sucesso `200`: mesmo formato de sucesso de cadastro.
- Erros: `400 VALIDATION_ERROR`; `401 INVALID_CREDENTIALS` com mensagem genérica para e-mail inexistente ou senha incorreta; `429 RATE_LIMITED`.

### POST /upload

- Autenticada por Bearer JWT.
- Entrada: arquivo em `multipart/form-data`, campo `file`.
- O proprietário é obtido exclusivamente do usuário autenticado.
- Sucesso `201`: metadados públicos do documento, sem `ownerId` ou `storedName`.
- Erros: `401 UNAUTHORIZED`; `400 FILE_REQUIRED`/`INVALID_REQUEST`; `413 FILE_TOO_LARGE`.

### GET /documents

- Autenticada por Bearer JWT.
- Sucesso `200`: lista somente os metadados públicos dos documentos do usuário autenticado. Usuário sem documentos recebe lista vazia.
- Erro: `401 UNAUTHORIZED`.

### GET /documents/:id/download

- Autenticada por Bearer JWT.
- Sucesso `200`: conteúdo binário do documento pertencente ao usuário, com `Content-Disposition: attachment`.
- Erros: `401 UNAUTHORIZED`; `400 INVALID_DOCUMENT_ID` para formato inválido; `404 DOCUMENT_NOT_FOUND` tanto para documento inexistente quanto pertencente a outro usuário.

### Encerramento de sessão

Não há endpoint de logout no servidor nesta fase. O frontend encerra a sessão removendo o token em memória e limpando os dados do usuário da interface. O token copiado por terceiros permanece utilizável somente até `exp`; não há promessa de revogação imediata.

## 7. Decisões arquiteturais

- Adicionar `auth.routes`, `auth.controller`, `auth.service` e `users.repository`, mantendo as regras de cadastro/login no serviço.
- Adicionar middleware `requireAuth` às rotas protegidas. O middleware valida Bearer token e anexa um contexto confiável, por exemplo `req.auth.userId`; controllers não decodificam nem confiam em IDs do corpo da requisição.
- `documents.service` recebe `ownerId` validado como argumento. O repositório oferece operações com escopo de proprietário, como `findAllByOwner(ownerId)` e `findByIdAndOwner(id, ownerId)`.
- Validar o escopo no repositório para upload, listagem e download; não usar apenas UUID imprevisível como autorização.
- Usar biblioteca JWT mantida (por exemplo, `jsonwebtoken`) como dependência explícita; algoritmo, emissor e audiência são fixos/configurados e verificados em toda validação.
- Usar `node:crypto` (`scrypt`, salt aleatório e comparação em tempo constante) para senhas, sem adicionar uma dependência de hashing se o recurso nativo atender aos requisitos.
- O frontend inclui telas/estados de cadastro e login, injeta `Authorization: Bearer` no cliente de API autenticado e limpa documentos visíveis ao sair ou trocar de usuário.
- Falhas de autenticação não devem ser convertidas em erro 500. O middleware produz resposta 401 consistente; falta de propriedade não revela existência e retorna 404.

## 8. Plano de execução

1. Implementar configuração e validação de JWT, incluindo falha segura no startup para segredo ausente/fraco e testes de configuração.
2. Criar modelo/repositório de usuários em memória, normalização de e-mail e hashing de senha com `scrypt`.
3. Implementar cadastro/login, emissão de JWT, validação dos claims e respostas de erro sem enumeração de contas.
4. Implementar middleware Bearer e proteger upload, listagem e download.
5. Alterar serviço/repositório de documentos para persistir e consultar por `ownerId`, removendo o proprietário global como fonte de autorização.
6. Implementar cadastro/login/sessão no frontend; manter token em memória e limpar a interface no logout.
7. Adicionar testes para senha inválida/correta, cadastro duplicado, token ausente/malformado/expirado, acesso autenticado e isolamento entre dois usuários (upload, listagem e download).
8. Executar `npm test` no backend e build do frontend; atualizar o workflow de CI para executar esses testes e validar o build.