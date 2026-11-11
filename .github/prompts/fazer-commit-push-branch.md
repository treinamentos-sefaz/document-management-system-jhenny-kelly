---
description: Cria uma nova branch, registra as alterações em um commit e envia a branch ao remoto.
name: fazer-commit-push-branch
argument-hint: descricao curta da alteracao (ex. adicionar listagem de documentos)
agent: agent
---

# Fazer commit e push em uma nova branch

Crie uma nova branch para as alterações relacionadas a `${input:descricao:descricao curta da alteracao}`, faça um commit e envie a branch para o remoto configurado.

Siga este fluxo:

1. Verifique a branch atual e o estado do working tree com `git status` e revise o diff das alterações.
2. Não descarte, sobrescreva ou inclua alterações que não estejam relacionadas à descrição informada. Se houver alterações sem relação clara com a tarefa, preserve-as e continue somente se for possível separar com segurança as alterações relevantes.
3. Crie uma branch a partir da branch atual, usando o padrão `tipo/descricao-curta-em-kebab-case`. Escolha um tipo apropriado, como `feat`, `fix`, `docs`, `test` ou `chore`. Se a branch já existir, escolha um nome disponível sem alterar ou apagar a branch existente.
4. Adicione ao stage somente os arquivos pertinentes à tarefa. Revise `git diff --cached` antes do commit.
5. Crie o commit com uma mensagem no padrão Conventional Commits, em português e sem ponto final, usando o formato `tipo: descrição curta no imperativo` (por exemplo, `feat: adicionar listagem de documentos`).
6. Envie a branch recém-criada para `origin` com `git push -u origin <nome-da-branch>`. Nunca use `--force` ou `--force-with-lease`.
7. Ao terminar, informe o nome da branch, a mensagem do commit e o resultado do push. Se qualquer etapa falhar, explique o erro e não alegue que a operação foi concluída.

Não altere arquivos do projeto como parte deste fluxo. Não faça commit se não houver alterações pertinentes para registrar.