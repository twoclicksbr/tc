# /docs — Sincronizar CLAUDE.md com o projeto

## Regras
- Este comando é o ÚNICO momento em que se faz git commit/push
- NÃO alterar nenhum arquivo de código — apenas CLAUDE.md

## Fluxo

### 1. Ver o que mudou
```bash
git status
git diff
git diff --staged
```

### 2. Analisar as mudanças
- Ler o diff de cada arquivo modificado
- Identificar o que foi adicionado, removido ou alterado
- Comparar com o que está documentado no CLAUDE.md

### 3. Atualizar CLAUDE.md
- Adicionar features novas
- Corrigir informações desatualizadas
- Remover documentação de código que não existe mais
- Manter o formato e estrutura existente do CLAUDE.md

### 4. Commit e push
```bash
git add .
git commit -m "docs: sync CLAUDE.md with project"
git push
```
