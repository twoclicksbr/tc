Leia o arquivo Claude.md na raiz do projeto antes de qualquer ação.

Execute os seguintes passos:

1. Escanear o projeto real:
   - Listar todas as migrations em database/migrations/
   - Listar todos os models em app/Models/
   - Listar todas as requests em app/Http/Requests/
   - Listar todos os controllers em app/Http/Controllers/
   - Listar todas as rotas com: php artisan route:list
   - Verificar estrutura de pastas do projeto

2. Comparar com o que está documentado no Claude.md

3. Atualizar o Claude.md com as diferenças encontradas:
   - Tabelas criadas que não estão documentadas
   - Campos que mudaram
   - Novos arquivos ou módulos
   - Qualquer divergência entre código e documentação

4. Manter a formatação e estrutura original do Claude.md

5. Mostrar resumo das alterações feitas

6. Executar: git add . && git commit -m "docs: sync Claude.md with project" && git push
