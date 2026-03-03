# /docs — Branch management + Sync CLAUDE.md + Commit/Push

## Passo 1 — Verificar branch atual

Rode `git branch --show-current`.

Se estiver em `main`, `sandbox` ou `production`:
- Avise: "Você está na branch protegida `{branch}`. Não é possível commitar aqui."
- Siga para o Passo 2 sem pré-selecionar nenhuma

Se estiver em branch de feature (feat/*, fix/*, refactor/*):
- Siga para o Passo 2 com ela pré-selecionada

## Passo 2 — Selecionar branch de trabalho

Liste branches locais de feature (excluir main, sandbox, production).

Opções:
- Criar nova branch
- Combinar branches
- Lista de branches existentes (atual marcada se aplicável)

Aguarde a escolha.

Se "Criar nova branch":
1. Pergunte tipo: feat, fix ou refactor
2. Pergunte nome (texto livre)
3. Converta para slug: feat/tela-de-produtos
4. git checkout main && git pull && git checkout -b {branch}

Se "Combinar branches":
1. Liste branches de feature para seleção múltipla
2. Pergunte tipo e nome da nova branch
3. git checkout main && git pull && git checkout -b {branch}
4. git merge {cada-branch} --no-edit
5. Se conflito → git merge --abort, avise e pare

Se escolher outra branch: git checkout {branch}
Se escolher a atual: continue

## Passo 3 — Levantar mudanças

Rode:
git status
git diff --stat
git diff --staged --stat

Para cada arquivo alterado, analise o diff real de cada um. Categorize:
- Arquivos criados (novos)
- Arquivos deletados
- Arquivos modificados (resumo do que mudou em cada)

Agrupe por área: Backend, Frontend (layout, providers, pages, componentes, lib), Config.

## Passo 4 — Atualizar CLAUDE.md

Leia o CLAUDE.md atual completo. Compare com as mudanças levantadas no Passo 3.

Regras:
- Arquivo criado → documentar na seção apropriada
- Arquivo deletado → remover todas as referências
- Arquivo modificado → atualizar documentação correspondente
- Atualizar tabelas, props, exports, comportamentos, rotas, fluxos
- NÃO remover docs de features que não mudaram
- Ser ESPECÍFICO: nomes de props, tipos, valores, exports, comportamentos
- Manter formato e estrutura existente do CLAUDE.md

Nível de detalhe esperado:
- Props novas: nome, tipo, descrição, quem usa
- Componentes novos: nome, arquivo, o que faz, exports
- Comportamentos alterados: antes → depois
- Arquivos deletados: remover de todas as seções onde aparecem
- Tabelas de banco: colunas novas, casts, relacionamentos
- Configs: valores alterados

## Passo 5 — Commit e Push

git add .
git commit -m "docs: sync CLAUDE.md — {resumo curto descritivo das mudanças principais}"
git push origin {branch-atual}

A mensagem de commit deve ser descritiva (não genérica). Exemplo:
- "docs: sync CLAUDE.md — DnD centralizado + sandbox banner + deploy commands"
- "docs: sync CLAUDE.md — nova tela de produtos + fix autenticação"
