# /deploy-production — Deploy no servidor de produção

## Passo 1 — Deploy backend via SSH

Conecte via SSH no servidor e execute em /var/www/tc/prod/backend/:

git pull origin production
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache

## Passo 2 — Seeders (opcional)

Pergunte ao usuário: "Deseja rodar algum seeder?"

Se sim, liste para seleção múltipla:
- DatabaseSeeder
- MainSeeder
- TenantSeeder
- AdminSeeder

Rode os selecionados:
php artisan db:seed --class={SeederSelecionado} --force

## Passo 3 — Deploy frontend via SSH

Em /var/www/tc/prod/web/:

git pull origin production
npm install
npm run build

## Passo 4 — Confirmação

Confirme: "Deploy produção concluído."
