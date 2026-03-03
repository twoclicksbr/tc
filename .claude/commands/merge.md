# /merge — Mergea feature na main

## Passo 1 — Atualizar referências

git fetch origin

## Passo 2 — Selecionar branch

Liste branches locais de feature (excluir main, sandbox, production).
Aguarde a escolha do usuário.

## Passo 3 — Merge na main

git checkout main
git pull origin main
git merge {branch-selecionada} --no-edit

Se der conflito:
git merge --abort
Avise: "Conflito no merge de {branch} → main. Merge abortado." e pare aqui.

## Passo 4 — Push da main

git push origin main

## Passo 5 — Deletar branch de feature

git branch -d {branch-selecionada}
git push origin --delete {branch-selecionada}

Confirme: "Branch {branch} mergeada na main e deletada (local + remota)."
