# /merge-production — Mergea sandbox na production

## Passo 1 — Merge sandbox → production

git checkout production
git pull origin production
git merge sandbox --no-edit

Se der conflito:
git merge --abort
Avise: "Conflito no merge de sandbox → production. Merge abortado." e pare aqui.

## Passo 2 — Push da production

git push origin production

Confirme: "sandbox mergeada na production e push concluído."
Volte para a branch anterior: git checkout {branch-anterior}
