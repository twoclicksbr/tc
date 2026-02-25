Leia o arquivo Claude.md na raiz do projeto antes de qualquer ação.

Execute os seguintes passos:

1. Rodar: git status
2. Analisar todos os arquivos modificados/adicionados/removidos
3. Ler o conteúdo das alterações com: git diff
4. Gerar uma mensagem de commit clara e descritiva baseada nas mudanças
5. Executar: git add . && git commit -m "<mensagem gerada>" && git push
6. Mostrar resumo do que foi feito

## REGRA OBRIGATÓRIA — git add

SEMPRE usar `git add .` para adicionar TODOS os arquivos modificados de uma vez.
NUNCA selecionar arquivos manualmente (ex: `git add arquivo1 arquivo2`).
O commit deve incluir tudo que aparece no `git status` (modified, new file, deleted).
