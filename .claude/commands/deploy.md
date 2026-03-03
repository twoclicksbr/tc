# /deploy — Deploy no servidor sandbox

## Passo 1 — Merge main → sandbox

git checkout sandbox
git pull origin sandbox
git merge main --no-edit

Se der conflito:
git merge --abort
Avise: "Conflito no merge de main → sandbox. Merge abortado." e pare aqui.

## Passo 2 — Push da sandbox

git push origin sandbox

## Passo 3 — Deploy backend via SSH

Conecte via SSH no servidor e execute em /var/www/tc/sand/backend/:

git pull origin sandbox
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache

## Passo 4 — Seeders (opcional)

Pergunte ao usuário: "Deseja rodar algum seeder?"

Se sim, liste para seleção múltipla:
- DatabaseSeeder
- MainSeeder
- TenantSeeder
- AdminSeeder

Rode os selecionados:
php artisan db:seed --class={SeederSelecionado} --force

## Passo 5 — Deploy frontend via SSH

Em /var/www/tc/sand/web/:

git pull origin sandbox
npm install
npm run build

## Passo 6 — Confirmação

Confirme: "Deploy sandbox concluído."
Volte para a branch anterior: git checkout {branch-anterior}
