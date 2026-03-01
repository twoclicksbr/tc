# CLAUDE.md — tc (Auto Peças)

> MVP em andamento. Novas features e módulos serão adicionados conforme a evolução do projeto.

---

## Equipe

- **Gerentes de Projeto** — Usuário + Claude (claude.ai) → planejamento, escopo, arquitetura, specs
- **Executor / Programador** — Claude Code → implementação, código, commits

## Regras do Claude Code

- NÃO executar /docs salvo quando explicitamente solicitado
- NÃO atualizar CLAUDE.md em tarefas normais — apenas o comando /docs faz isso
- NÃO fazer git add/commit/push — o git só é executado pelo comando /docs
- Implementar SOMENTE o código solicitado na tarefa

## Comandos do Claude Code

Slash commands implementados como arquivos em `.claude/commands/`. Invocar com `/nome-do-comando`.

### /docs
Sincroniza o CLAUDE.md e faz git commit/push. Único momento em que o git é executado.
Arquivo: `.claude/commands/docs.md`

### /vite
Inicia o Vite dev server em background sem bloquear o terminal.
Arquivo: `.claude/commands/vite.md`

### /vite-reset
Fecha o Vite (se estiver rodando na porta 5173) e inicia novamente em background.
Arquivo: `.claude/commands/vite-reset.md`

### /vite-close
Fecha o processo do Vite na porta 5173 e confirma o encerramento.
Arquivo: `.claude/commands/vite-close.md`

## Regras do Chat (claude.ai)

- Não usar caixas de perguntas (widgets de seleção). Sempre perguntar em texto direto.
- Ao enviar prompts para o Claude Code, sempre envolver o prompt inteiro em um único bloco de código (``` ```) para que o usuário copie com um clique. Texto explicativo fica fora do bloco, antes ou depois.

## Repositório

- **GitHub:** https://github.com/twoclicksbr/tc.git
- **CLAUDE.md (raw):** https://raw.githubusercontent.com/twoclicksbr/tc/refs/heads/main/CLAUDE.md

---

## Sobre o Projeto

Plataforma SaaS multi-tenant de gerenciamento para auto peças, desenvolvida em **Laravel + JavaScript**. Cada cliente (tenant) possui banco de dados isolado. Um banco central (`tc_main`) gerencia os tenants. O objetivo é ter um sistema funcional em 20 dias, começando pelo cadastro de pessoas, autenticação e submódulos reutilizáveis.

---

## Arquitetura Multi-Tenancy

### Conceito
- TwoClicks é uma plataforma SaaS que atende múltiplos clientes (tenants)
- Cada tenant tem seu próprio banco de dados isolado
- Um banco central (`tc_main`) gerencia os tenants

### Bancos de Dados e Schemas

| Banco | Schemas | Conteúdo |
|-------|---------|----------|
| `tc_main` | `prod`, `sand`, `log` | tenants, platforms, landlord users, planos |
| `tc_{db_name}` | `prod`, `sand`, `log` | people, users, modules, etc. (por tenant) |

Cada banco possui 3 schemas PostgreSQL:
- **`prod`** — dados de produção
- **`sand`** — sandbox (ambiente de testes isolado)
- **`log`** — audit logs (tabela `audit_logs`)

O `search_path` ativo é determinado pelo subdomínio da requisição: `.sandbox.` no hostname → `sand`, caso contrário → `prod`. O schema `log` é sempre incluído como segundo path.

### URLs

**Frontend:**

| URL | Acesso |
|-----|--------|
| `admin.twoclicks.com.br` | Landlord (admin TwoClicks) |
| `{slug}.twoclicks.com.br` | Tenant (cliente) |

**API (centralizada):**

| Rota | Banco |
|------|-------|
| `api.twoclicks.com.br/v1/admin/auth/login` | tc_main |
| `api.twoclicks.com.br/v1/admin/{module}` | tc_main |
| `api.twoclicks.com.br/v1/{tenant}/auth/login` | tc_{db_name} |
| `api.twoclicks.com.br/v1/{tenant}/{module}` | tc_{db_name} |

**Local (dev):**

| URL | Acesso |
|-----|--------|
| `admin.tc.test` | Landlord |
| `valsul.tc.test` | Tenant |
| `api.tc.test/v1/{tenant}/{module}` | API |

### Fluxo de Criação de Tenant

1. Landlord cadastra cliente no admin (nome + validade)
2. `TenantObserver::creating` gera automaticamente:
   - `slug` a partir do `name` (Str::slug)
   - `db_name` = slug com hífens trocados por underscore
   - `sand_user` = `sand_{base}`, `prod_user` = `prod_{base}`, `log_user` = `log_{base}`
   - `sand_password`, `prod_password`, `log_password` aleatórios (Str::random(24))
   - `expiration_date` = hoje + 30 dias (se não informada)
3. `TenantObserver::created` chama `TenantDatabaseService::provision()`:
   - Cria banco `tc_{db_name}` no PostgreSQL (via conexão main como superuser)
   - Cria 3 users PostgreSQL: `sand_{base}`, `prod_{base}`, `log_{base}`
   - Dropa schema `public`; cria schemas `sand`, `prod`, `log` com ownership nos respectivos users
   - Roda migrations `database/migrations/tenant/` nos schemas `sand` e `prod`
   - Roda migrations `database/migrations/log/` no schema `log`
   - Em caso de erro: rollback completo (remove tenant do main, dropa banco e os 3 users)

### Validade

- Quando `expiration_date` expirar, exibe tarja vermelha no topo do site: "Sua assinatura expirou em dd/mm/yyyy. Entre em contato para renovar."
- NÃO bloqueia o acesso, apenas avisa

---

## Stack

- **Backend:** Laravel 12 (API)
- **Frontend:** React 19 + TypeScript + Vite (Metronic v9.4) + Tailwind CSS 4
- **Banco de dados:** PostgreSQL
- **Ambiente local:** Laravel Herd
- **Documentação API:** Scribe

---

## Backend (Laravel)

### PHP no ambiente local

O comando `php` não está no PATH do sistema. Usar o binário do Herd diretamente:

```
/c/Users/alexa/.config/herd/bin/php84/php.exe artisan <comando>
```

Exemplos:
```bash
"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan migrate:fresh --database=main --path=database/migrations/main --seed
"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan migrate:fresh --database=tenant --path=database/migrations/tenant --seed
"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan route:list
```

### Documentação da API

- **URL local:** https://tc.test/docs
- **Regenerar:** `"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan scribe:generate`

### Padrão de Tabelas

Todas as tabelas seguem a ordem de colunas:

```
id → campos específicos → order (default 1) → active (default true) → timestamps → deleted_at (softDeletes)
```

### Estrutura de Tabelas

#### Banco tc_main

| Tabela | Campos |
|--------|--------|
| `tenants` | platform_id (FK platforms), name, slug (unique), db_name, sand_user, sand_password (encrypted), prod_user, prod_password (encrypted), log_user, log_password (encrypted), expiration_date, order, active |
| `platforms` | name, domain, slug (unique), db_name, sand_user, sand_password (encrypted), prod_user, prod_password (encrypted), log_user, log_password (encrypted), expiration_date, order, active |
| `people` | name, birth_date, order, active |
| `users` | person_id (FK people), email, password, active |
| `modules` | (mesmos campos que tenant — ver seção Configuração) |
| `personal_access_tokens` | tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at |

> **Nota:** `tc_main` tem as mesmas tabelas operacionais que os bancos tenant (`people`, `users`, `modules`, `personal_access_tokens`) para suportar a autenticação e CRUD do landlord admin via `/v1/admin/`.

#### Principais (por tenant)

| Tabela | Campos |
|--------|--------|
| `people` | name, birth_date, order, active |
| `users` | person_id (FK people), email, password, active |

#### Configuração

| Tabela | Campos |
|--------|--------|
| `modules` | owner_level (enum: master/platform/tenant, default tenant), owner_id (default 0), slug (unique), url_prefix (nullable), name, icon (nullable), type (enum: module/submodule/pivot, default module), model, request, controller (nullable), size_modal (enum: p/m/g, default m), description_index, description_show, description_store, description_update, description_delete, description_restore, after_store, after_update, after_restore, active, order |
| `module_fields` | module_id (FK modules, cascade), name, label, icon (nullable), type (string), length (int, nullable), precision (int, nullable), default (nullable), nullable (bool), required (bool), min (int, nullable), max (int, nullable), unique (bool), index (bool), unique_table (nullable), unique_column (nullable), fk_table (nullable), fk_column (nullable), fk_label (nullable), auto_from (nullable), auto_type (nullable), main (bool), is_custom (bool), owner_level, owner_id, order, active |

Campos `after_*` são combobox com opções: `index`, `show`, `create`, `edit`.
- `owner_level` = nível de propriedade do módulo (master = TwoClicks, platform = plataforma, tenant = cliente)
- `owner_id` = ID do owner (0 = todos / sem dono específico)
- `slug` = identificador único usado na URL (substitui `name_url` e `name_table`)
- `url_prefix` = prefixo opcional de URL antes do slug
- `icon` = nome do ícone Lucide (ex: `Users`, `Package`) — renderizado dinamicamente
- `controller` = controller específica no formato `System\\TenantController` (nullable — usa ModuleController genérica se nulo)
- `size_modal` = tamanho padrão do modal CRUD (p/m/g)

#### Tabelas de Tipo (referência)

| Tabela | Campos |
|--------|--------|
| `type_documents` | name, mask, order, active |
| `type_contacts` | name, mask, order, active |
| `type_addresses` | name, order, active |

#### Submódulos (reutilizáveis via module_id + register_id)

| Tabela | Campos |
|--------|--------|
| `notes` | module_id, register_id, name, content, order, active |
| `files` | module_id, register_id, name, slug, path, size, type, order, active |
| `documents` | type_document_id, module_id, register_id, value, expiration_date, order, active |
| `contacts` | type_contact_id, module_id, register_id, value, order, active |
| `addresses` | type_address_id, module_id, register_id, zip_code, street, number, complement, neighborhood, city, state, country, order, active |

**Total MVP: 11 tabelas**

#### Tabelas de Sistema (geradas automaticamente)

| Tabela | Descrição |
|--------|-----------|
| `personal_access_tokens` | Tokens Sanctum (gerada via migration Sanctum) |
| `sessions` | Sessões de usuário (migration padrão Laravel) |
| `password_reset_tokens` | Tokens de reset de senha (migration padrão Laravel) |
| `cache` | Cache da aplicação (migration padrão Laravel) |
| `jobs` / `job_batches` / `failed_jobs` | Filas (migration padrão Laravel) |

### Autenticação (Sanctum)

Controller: `App\Http\Controllers\Auth\AuthController` (`app/Http/Controllers/Auth/AuthController.php`) — rotas públicas e protegidas por `auth:sanctum`.

O `{tenant}` pode ser qualquer slug de tenant (ex: `valsul`) ou `admin` (acessa `tc_main`).

| Método | URL | Descrição | Auth |
|--------|-----|-----------|------|
| POST | `api.{domínio}/v1/{tenant}/auth/login` | Login → retorna token + user | Público |
| POST | `api.{domínio}/v1/{tenant}/auth/logout` | Logout → revoga token atual | Bearer |
| GET | `api.{domínio}/v1/{tenant}/auth/me` | Retorna usuário autenticado com `person` | Bearer |

Resposta do login:
```json
{ "token": "1|abc...", "user": { "id": 1, "email": "...", "active": true, "person": { "id": 1, "name": "..." } } }
```

### Rotas CRUD Genéricas (System\ModuleController)

Controller: `App\Http\Controllers\System\ModuleController` (`app/Http/Controllers/System/ModuleController.php`).

Todas protegidas por `auth:sanctum`. `{module}` = `slug` do registro na tabela `modules`.

| Método | URL | Método Controller | Descrição |
|--------|-----|-------------------|-----------|
| GET | `api.{domínio}/v1/{tenant}/{module}` | `index` | Lista paginada com sort, per_page e filtros (search_id, search_name, search_type, date_type, date_from, date_to, expiration_date_from, expiration_date_to, birth_month_day_from, birth_month_day_to, active, include_deleted) |
| POST | `api.{domínio}/v1/{tenant}/{module}` | `store` | Cria registro (usa Request dinâmica) |
| GET | `api.{domínio}/v1/{tenant}/{module}/check-slug` | `checkSlug` | Verifica disponibilidade de slug (`?slug=&exclude_id=`) |
| GET | `api.{domínio}/v1/{tenant}/{module}/scan-files` | `scanFiles` | Retorna listas de Models, Requests e Controllers disponíveis no projeto |
| GET | `api.{domínio}/v1/{tenant}/{module}/{id}` | `show` | Exibe registro (inclui soft-deleted via `withTrashed`) |
| PUT/PATCH | `api.{domínio}/v1/{tenant}/{module}/{id}` | `update` | Atualiza registro |
| DELETE | `api.{domínio}/v1/{tenant}/{module}/{id}` | `destroy` | Soft delete + seta `active=false` |
| PATCH | `api.{domínio}/v1/{tenant}/{module}/{id}/restore` | `restore` | Restaura soft-deleted |

### CORS (`config/cors.php`)

| Chave | Valor |
|-------|-------|
| `paths` | `['api/*', 'v1/*', 'sanctum/csrf-cookie']` |
| `allowed_methods` | `['*']` |
| `allowed_origins` | `['http://localhost:5173']` |
| `allowed_origins_patterns` | `['#^https?://(.*\.)?tc\.test(:\d+)?$#']` (todos os subdomínios + domínio base) |
| `allowed_headers` | `['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']` |
| `supports_credentials` | `true` |

### Requests (`app/Http/Requests/`)

| Request | Módulo |
|---------|--------|
| `TenantRequest` | Validação de tenants — valida `platform_id` (required); credenciais geradas pelo Observer, não mais no Request |
| `PlatformRequest` | Validação de platforms — valida `name`, `domain`, `slug`, `expiration_date`; credenciais geradas pelo Observer |
| `PersonRequest` | Validação de pessoas |
| `UserRequest` | Validação de usuários |
| `ModuleRequest` | Validação de módulos — campos: `owner_level`, `owner_id`, `slug`, `url_prefix`, `name`, `icon`, `type`, `model`, `request`, `controller`, `size_modal`, descriptions, after_* |
| `ModuleFieldRequest` | Validação de campos de módulo — campos: `module_id`, `name`, `label`, `icon`, `type`, `length`, `precision`, `default`, `nullable`, `required`, `min`, `max`, `unique`, `index`, `unique_table`, `unique_column`, `fk_table`, `fk_column`, `fk_label`, `auto_from`, `auto_type`, `main`, `is_custom`, `owner_level`, `owner_id`, `order`, `active` |

### Padrão de Desenvolvimento

#### Organização de Controllers

Controllers organizadas em subpastas por responsabilidade:

| Pasta | Namespace | Controllers |
|-------|-----------|-------------|
| `app/Http/Controllers/Auth/` | `App\Http\Controllers\Auth` | `AuthController` (login, logout, me) |
| `app/Http/Controllers/System/` | `App\Http\Controllers\System` | `ModuleController` (CRUD genérico + scanFiles), `TenantController` (credentials), `PlatformController` (credentials) |

#### Controller Genérica

`System\ModuleController` resolve o CRUD de qualquer módulo. Busca as configurações na tabela `modules` (model, request, controller) e executa dinamicamente. O campo `controller` permite sobrescrever a controller genérica por uma específica.

> **Atenção — binding de parâmetro:** O Laravel faz injeção posicional para tipos primitivos (`string`). Quando a rota tem múltiplos parâmetros (`{tenant}` + `{module}`), `string $module` receberia o valor de `{tenant}`. A solução é usar `$request->route('module')` em todos os métodos. Todos os métodos do `ModuleController` recebem `Request $request` como primeiro parâmetro e obtêm o módulo via `$request->route('module')`.

#### Rota Genérica

`{module}` corresponde ao `slug` da tabela `modules`. Uma única rota atende módulos e submódulos.

Padrão de URL: `api.{domínio}/v1/{tenant}/{module}` e `api.{domínio}/v1/{tenant}/{module}/{id}`

O prefixo de path é `/v1/{tenant}` — sem prefixo `/api`. As rotas não estão mais restritas por domínio via `env('API_DOMAIN')`.

**Rotas específicas (antes dos genéricos para evitar conflito):**
- `GET /v1/{tenant}/tenants/{id}/credentials` → `System\TenantController::credentials` — retorna `sand_password`, `prod_password`, `log_password` descriptografados
- `GET /v1/{tenant}/platforms/{id}/credentials` → `System\PlatformController::credentials` — mesma resposta para platforms
- `GET /v1/{tenant}/modules/scan-files` → `System\ModuleController::scanFiles` — retorna `{ models: [], requests: [], controllers: {} }` (lista de classes disponíveis no projeto)

#### Configuração de Módulo

Os campos `model` e `request` identificam as classes PHP usadas pelo `ModuleController` para resolver dinamicamente o CRUD.

**Para criar um novo módulo:**
1. Criar migration, model, request
2. Cadastrar o módulo na tela de modules (slug, nome, model, request, size_modal, etc.)

Sem mexer em rotas, sem criar controller de CRUD. Tudo dinâmico.

### Middleware Multi-Tenancy (`app/Http/Middleware/ResolveTenant.php`)

Resolve a conexão do banco com base no `{tenant}` da URL e no subdomínio da requisição:
- Detecta ambiente via hostname: `.sandbox.` presente → `schema='sand'`, caso contrário → `schema='prod'`
- `search_path` = `'{schema},log'` (ex: `'prod,log'` ou `'sand,log'`)
- `{tenant} = 'admin'` → reconfigura `main` com o `search_path` correto (`DB::purge('main')`) e define como default
- `{tenant} = qualquer slug` → configura conexão `tenant` com `database=tc_{db_name}`, credenciais do schema correto (`sand_user/sand_password` ou `prod_user/prod_password`) e `search_path` correto

**Prioridade de Middleware** (`bootstrap/app.php`):
```php
$middleware->prependToPriorityList(
    \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
    \App\Http\Middleware\ResolveTenant::class,
);
```
O Laravel reordena middleware por prioridade. Sem isso, `auth:sanctum` rodaria antes do `resolve.tenant`, causando 401.

**Handler de Exceções** (`bootstrap/app.php`):
```php
$exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
    return response()->json(['message' => 'Unauthenticated.'], 401);
});
```
Garante retorno 401 JSON para requisições não autenticadas. Sem isso, o Laravel tenta redirecionar para `route('login')` (que não existe nesta API), causando 500.

### Models (`app/Models/`)

| Model | Conexão | Observação |
|-------|---------|-----------|
| `Tenant` | `main` (explícita) | Sempre usa tc_main; `$hidden = ['sand_password', 'prod_password', 'log_password']`; casts encrypted nos 3 passwords; cast `expiration_date` como `'date:Y-m-d'`; `platform_id` FK; `platform()` belongsTo |
| `Platform` | `main` (explícita) | `$hidden = ['sand_password', 'prod_password', 'log_password']`; casts encrypted nos 3 passwords; campo `domain`; `tenants()` hasMany; `db_name` = `{slug}_main` |
| `User` | default (dinâmica) | Usa a conexão setada pelo middleware |
| `Person` | default (dinâmica) | Usa a conexão setada pelo middleware; cast `birth_date` como `'date:Y-m-d'` |
| `Module` | default (dinâmica) | Usa a conexão setada pelo middleware |
| `ModuleField` | default (dinâmica) | Usa a conexão setada pelo middleware; `module()` belongsTo; casts int/bool nos campos numéricos e booleanos |
| `PersonalAccessToken` | via `getConnectionName()` | Retorna `DB::getDefaultConnection()` — garante que Sanctum use a conexão correta |

### Migrations por banco

**`database/migrations/main/`** — roda com `--database=main --path=database/migrations/main`

| Migration | Cria |
|-----------|------|
| `0001_01_01_000000` | password_reset_tokens, sessions |
| `0001_01_01_000001` | cache, cache_locks |
| `0001_01_01_000002` | jobs, job_batches, failed_jobs |
| `2025_02_24_000003` | platforms |
| `2025_02_24_000004` | tenants (com platform_id FK) |
| `2025_02_24_000005` | people |
| `2025_02_24_000006` | users (com person_id FK) |
| `2025_02_24_000007` | personal_access_tokens |
| `2025_02_24_000008` | modules |
| `2026_02_27_000001` | module_fields (FK modules, cascadeOnDelete) |

**`database/migrations/tenant/`** — roda com `--database=tenant_sand` / `--database=tenant_prod`

| Migration | Cria |
|-----------|------|
| `2025_02_24_000001` | modules |
| `2025_02_24_000002` | people |
| `2025_02_24_000003` | users (com person_id FK) |
| `2026_02_24_213424` | personal_access_tokens |
| `2026_02_27_000001` | module_fields (FK modules, cascadeOnDelete) |

**`database/migrations/log/`** — roda com `--database=tenant_log`

| Migration | Cria |
|-----------|------|
| `2026_02_26_000001` | audit_logs (user_id, action, schema, status_code, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at) |

### Observers (`app/Observers/`)

| Observer | Gatilho | O que faz |
|----------|---------|-----------|
| `ModuleObserver` | `creating` | (a definir — arquivo criado, lógica pendente) |
| `TenantObserver` | `creating` | Gera `slug`, `db_name` (slug com `_` no lugar de `-`), `sand_user/password`, `prod_user/password`, `log_user/password`, `expiration_date` |
| `TenantObserver` | `created` | Chama `TenantDatabaseService::provision()` — provisiona banco do novo tenant |
| `PlatformObserver` | `creating` | Gera `slug`, `db_name` = `{slug}_main`, `sand_user/password`, `prod_user/password`, `log_user/password`, `expiration_date` |
| `PlatformObserver` | `created` | Chama `PlatformDatabaseService::provision()` — provisiona banco da nova platform |

Registrados em `AppServiceProvider::boot()` — ordem: `ModuleObserver`, `TenantObserver`, `PlatformObserver`.

### Services (`app/Services/`)

| Service | O que faz |
|---------|-----------|
| `TenantDatabaseService` | `provision(Tenant)`: cria banco, 3 users (`sand_`, `prod_`, `log_`), dropa schema `public`, cria schemas `sand`/`prod`/`log`, configura ownership e privileges, roda migrations tenant (sand+prod) e log. Idempotente (verifica existência antes de criar). Rollback completo em erro. |
| `PlatformDatabaseService` | Mesma lógica que `TenantDatabaseService`, mas para o model `Platform`. Cria também user `admin` com acesso a todos os schemas. Idempotente. |

### Seeders (`database/seeders/`)

| Seeder | O que faz |
|--------|-----------|
| `DatabaseSeeder` | Chama MainSeeder + TenantSeeder + AdminSeeder |
| `MainSeeder` | Cria exatamente 3 módulos em tc_main via `Module::on('main')->firstOrCreate` usando `slug` como chave: `modules` (order=1, controller=`System\\ModuleController`), `module-fields` (order=2, type=submodule, model=ModuleField, request=ModuleFieldRequest), `platforms` (order=3, controller=`System\\PlatformController`). **Não cria tenant/platform** — provisionamento é feito pelos Observers ao salvar. |
| `TenantSeeder` | Todos os inserts comentados — vazio por enquanto. Módulos para tenant serão cadastrados via interface. |
| `AdminSeeder` | Cria person 'Alex Twoclicks Technology' (birth_date=1985-05-09) + user alex@twoclicks.com.br (password: Alex1985@) na conexão default atual (main ou tenant) |

**Comandos para rodar:**
```bash
php artisan migrate:fresh --database=main --path=database/migrations/main --seed
php artisan migrate:fresh --database=tenant --path=database/migrations/tenant --seed
```

---

## Frontend (Metronic React)

- **Pasta:** `frontend/`
- **Versão:** Metronic v9.4.5 — React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- **Layout de referência:** `C:\Herd\themeforest\metronic\crm`
- **URL local:** http://tc.test:5173
- **Auth:** Laravel Sanctum ✅ — adapter e provider implementados e em uso
- **Status:** instalado, rodando em dev
- **Layout em uso:** `Demo3Layout` (`frontend/src/layouts/demo3/`)
- **Provider de auth em uso:** `AuthProvider` de `frontend/src/auth/providers/laravel-provider.tsx` (importado em `App.tsx`)
- **Providers em uso em `App.tsx`:** `AuthProvider`, `PlatformProvider`, `SettingsProvider`, `ThemeProvider`, `I18nProvider`, `TooltipsProvider`, `QueryProvider`, `ModulesProvider`

### Variáveis de Ambiente (`frontend/.env`)

```env
VITE_APP_NAME=metronic-tailwind-react
VITE_APP_VERSION=9.2.6

## Laravel API
VITE_API_URL=https://api.tc.test
VITE_TENANT_SLUG=demo

## Supabase Configuration (placeholder — não utilizado)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> `VITE_TENANT_SLUG` é fallback para desenvolvimento local em `localhost` (sem subdomínio). Em produção/dev com subdomínio, o tenant é detectado automaticamente via `getTenantSlug()`.

### Auth (Laravel Sanctum) — estrutura em `frontend/src/auth/`

| Arquivo | Descrição |
|---------|-----------|
| `adapters/laravel-adapter.ts` | Adapter Laravel — login/logout/me via `VITE_API_URL` + `getTenantSlug()` |
| `adapters/supabase-adapter.ts` | Adapter Supabase (legado — mantido, não utilizado) |
| `providers/laravel-provider.tsx` | `AuthProvider` em uso — expõe `login`, `logout`, `getUser`, etc. via context |
| `providers/supabase-provider.tsx` | Provider Supabase (legado — mantido, não utilizado) |
| `context/auth-context.ts` | AuthContext + hook `useAuth()` |
| `lib/models.ts` | `AuthModel` (`access_token`, `refresh_token?`) e `UserModel` |
| `lib/helpers.ts` | getAuth/setAuth/removeAuth via localStorage |
| `require-auth.tsx` | HOC que redireciona para `/auth/signin` se não autenticado |

### Estrutura frontend/src/

```
src/
├── App.tsx               ← importa AuthProvider de laravel-provider
├── main.tsx
├── auth/                 ← providers, adapters, pages de login/register
│   ├── adapters/         ← laravel-adapter.ts (em uso) + supabase-adapter.ts (legado)
│   ├── context/          ← auth-context.ts + useAuth()
│   ├── forms/            ← signin-schema.ts, signup-schema.ts, reset-password-schema.ts
│   ├── layouts/          ← branded.tsx, classic.tsx
│   ├── lib/              ← models.ts, helpers.ts
│   ├── pages/            ← signin-page.tsx, signup-page.tsx, etc.
│   ├── providers/        ← laravel-provider.tsx (em uso) + supabase-provider.tsx (legado)
│   ├── auth-routing.tsx
│   ├── auth-routes.tsx
│   └── require-auth.tsx
├── components/           ← componentes reutilizáveis (generic-grid.tsx, generic-modal.tsx, grid-actions.tsx, icon-picker-modal.tsx)
├── config/               ← configurações do app
├── css/                  ← estilos globais
├── errors/               ← páginas de erro (404, etc.)
├── hooks/                ← hooks customizados
├── i18n/                 ← internacionalização
├── layouts/              ← demo1..demo10 (em uso: demo3)
├── lib/                  ← api.ts, supabase.ts, tenant.ts e utilitários
├── pages/                ← páginas por módulo (dashboard/, tenants/, pessoas/, produtos/, compras/, vendas/, financeiro/, pagar/, receber/, configuracao/)
├── partials/             ← partes reutilizáveis de UI
├── providers/            ← providers React (tema, i18n, platform-provider.tsx, etc.)
└── routing/              ← app-routing.tsx, app-routing-setup.tsx
```

### Rotas Frontend (`frontend/src/routing/app-routing-setup.tsx`)

O arquivo contém as rotas do Metronic boilerplate (account, network, store, public-profile, etc.) além das rotas do projeto. As rotas do projeto ficam dentro de `<RequireAuth>` + `<Demo3Layout>`.

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Navigate to="/dashboard"` | Redireciona para dashboard |
| `/dashboard` | `DashboardPage` | Dashboard geral (placeholder) |
| `/platforms` | `PlatformsPage` | Grid de platforms — CRUD completo via modal ✅ + filtro de Validade ✅ + modal CRM (`PlatformShowModal`, max-w-6xl) ✅ — **só acessível no tenant `admin`** |
| `/tenants` | `TenantsPage` | Grid de tenants — CRUD completo via modal ✅ + filtro de Validade ✅ + modal CRM (`TenantShowModal`, max-w-6xl) ✅ — **só acessível no tenant `admin`** |
| `/modules` | `ModulesPage` | Gestão de módulos ✅ — GenericGrid agrupado em 2 níveis (owner_level + type) com DnD por grupo (moduleId=2) + ModuleModal (create/delete/restore) + ModuleShowModal (show/edit, inline na página com breadcrumb "← Voltar") — colunas: name, slug, order + filtros: Proprietário, Tipo |
| `/pessoas` | `PessoasPage` | Cadastro de pessoas ✅ — GenericGrid com filtro de aniversário + PersonModal (create/delete/restore) + PersonShowModal (show/edit, CRM max-w-4xl) |
| `/produtos` | `ProdutosPage` | Produtos (placeholder) |
| `/compras` | `ComprasPage` | Compras (placeholder) |
| `/vendas` | `VendasPage` | Vendas (placeholder) |
| `/financeiro` | `FinanceiroPage` | Financeiro (placeholder) |
| `/pagar` | `PagarPage` | Contas a pagar (placeholder) |
| `/receber` | `ReceberPage` | Contas a receber (placeholder) |
| `/configuracao` | `ConfiguracaoPage` | Configurações (placeholder) |

### Platform Selector (`frontend/src/layouts/demo3/components/header-logo.tsx`)

Dropdown no header (visível apenas quando `getUrlTenantSlug() === 'admin'`) para selecionar a plataforma ativa. Consome `platforms` e `selectPlatform` do `PlatformProvider`.

- **Principal** — sem override (acessa `tc_main` diretamente)
- **{nome da plataforma}** — seta override via `setPlatformOverride(slug)`, fazendo `getTenantSlug()` retornar o slug da plataforma selecionada

### ModulesProvider (`frontend/src/providers/modules-provider.tsx`)

Contexto React que carrega e expõe a lista de módulos `type=module` ativos do backend. Usado pelo `SidebarMenu` e outros componentes.

| Valor/Função | Descrição |
|---|---|
| `modules` | Lista de módulos (`type=module`, `active=true`) — `id`, `slug`, `name`, `icon`, `type`, `owner_level`, `order` |
| `loading` | Boolean de carregamento |
| `refreshModules()` | Rebusca a lista — chamar após criar/editar/deletar módulo |

Fetch: `GET /v1/{tenant}/modules?type=module&per_page=100&sort=order&direction=desc&active=true`. Recarrega automaticamente quando `selectedPlatform` muda.

Hook: `useModules(): ModulesContextValue`

### PlatformProvider (`frontend/src/providers/platform-provider.tsx`)

Contexto React que centraliza a lista de plataformas e a plataforma selecionada.

| Valor/Função | Descrição |
|---|---|
| `platforms` | Lista de plataformas carregada do backend |
| `refreshPlatforms()` | Rebusca a lista — chamado em `onDataLoad` do `PlatformsPage` |
| `selectedPlatform` | Plataforma atualmente selecionada (ou `null` = Principal) |
| `selectPlatform(platform)` | Seleciona plataforma + seta override no `tenant.ts` |

### Navbar (`frontend/src/layouts/demo3/components/navbar-menu.tsx`)

O menu horizontal do Demo3 tem um item fixo "Dashboard" como primeiro item (hardcoded no componente), seguido dos itens dinâmicos do `MENU_SIDEBAR[3]` (Account, Billing, Security, etc. — legado Metronic).

**Dropdown Dashboard:**
- Geral → `/dashboard`
- Plataformas → `/platforms` — **visível apenas quando `getUrlTenantSlug() === 'admin'` e sem plataforma selecionada**
- Tenants → `/tenants` — **visível apenas quando `getUrlTenantSlug() === 'admin'`**
- Módulos → `/modules`
- Pessoas → `/pessoas`
- Produtos → `/produtos`
- Comercial → `/comercial`
- Financeiro → `/financeiro`

**Sidebar (`sidebar-menu.tsx`):** dinâmico — consome `useModules()` do `ModulesProvider`. Item fixo "Dashboard" (ícone `LayoutDashboard`) sempre primeiro. Demais itens renderizados a partir dos módulos `type=module` retornados pela API, com ícone dinâmico via `DynamicIcon` (importa de `lucide-react` pelo nome; fallback `CircleDot`). Filtros de visibilidade: `platforms` visível só para admin sem plataforma selecionada; `tenants` visível só para admin.

### API Client (`frontend/src/lib/api.ts`)

Wrapper centralizado para chamadas à API Laravel. Injeta `Authorization: Bearer {token}` automaticamente.

| Função | Método HTTP | Descrição |
|--------|-------------|-----------|
| `apiFetch(path, options)` | qualquer | Base — retorna `Response` bruta |
| `apiGet<T>(path)` | GET | Retorna `T` parseado; lança erro se `!res.ok` |
| `apiPost<T>(path, body)` | POST | Retorna `T`; lança erro com `status` + `data` |
| `apiPut<T>(path, body)` | PUT | Retorna `T`; lança erro com `status` + `data` |
| `apiDelete<T>(path)` | DELETE | Retorna `T`; lança erro com `status` + `data` |

### Tenant Detection (`frontend/src/lib/tenant.ts`)

```ts
getUrlTenantSlug(): string   // slug detectado pela URL (subdomínio)
getTenantSlug(): string      // slug efetivo — retorna override da plataforma selecionada ou getUrlTenantSlug()
setPlatformOverride(slug: string | null): void
```
- `getUrlTenantSlug()` — detecta tenant pelo subdomínio: `demo.tc.test` → `'demo'`; fallback para `VITE_TENANT_SLUG` em localhost
- `getTenantSlug()` — retorna o override de plataforma (quando uma plataforma foi selecionada no header) ou o slug da URL; usado para chamadas de API e checks de permissão em tela
- `getUrlTenantSlug()` usado em: `laravel-adapter.ts` (auth), navbar/sidebar (checks de visibilidade admin)
- `getTenantSlug()` usado em: chamadas de API de módulos, verificações de acesso a rotas

### Vite Config (`frontend/vite.config.ts`)

```ts
server: { host: '0.0.0.0', port: 5173, https: false, allowedHosts: ['.tc.test', 'tc.test'] }
```
- `host: '0.0.0.0'` — responde em qualquer subdomínio em dev
- `allowedHosts: ['.tc.test', 'tc.test']` — permite todos os subdomínios `*.tc.test` e o domínio base

---

## Fluxo de Desenvolvimento por Módulo

| Fase | Descrição |
|------|-----------|
| **Fase 1** | Criar migration, model, request, controller (modules, people, users) ✅ |
| **Fase 2** | Montar rotas (routes/api.php com prefixo `v1/{tenant}/{module}`, sem prefixo /api) ✅ |
| **Fase 3** | Login + tela — backend ✅ (AuthController + Sanctum, multi-tenant + admin) / frontend ✅ (laravel-adapter.ts + laravel-provider.tsx + getTenantSlug() implementados) |
| **Fase 4** | Dashboard demonstração — placeholder criado (`/dashboard`, página "Em desenvolvimento") ✅ |
| **Fase 5** | Tela padrão index (grid) — ✅ `GenericGrid` implementado (reutilizável para todos os módulos) |
| **Fase 5.1** | Tela show/create/edit/delete/restore (página inteira) — não utilizada; projeto usa modal |
| **Fase 5.2** | Tela show/create/edit/delete/restore (modal) — ✅ `GenericModal` implementado com todos os 5 modos (create/edit/show/delete/restore) |
| **Fase 6** | Tela people ✅ — `PessoasPage` + `PersonModal` + `PersonShowModal` implementados |
| **Fase 6.1** | Tela modules ✅ — `ModulesPage` + `ModuleModal` + `ModuleShowModal` implementados |
| **Fase 7** | Criar migration, model, request, controller das tabelas restantes (type_documents, type_contacts, type_addresses, notes, files, documents, contacts, addresses) |

---

## Fase 5 — Tela Index (Grid)

**Componente genérico:** `frontend/src/components/generic-grid.tsx` (`GenericGrid`)

- Recebe `moduleId` + `columns` (config declarativa) + `modalComponent` — tudo reutilizável
- Busca `moduleConfig` via `GET /v1/{tenant}/modules/{moduleId}` (name, slug) — **ou bypass**: props `slug` e `title` fornecidos diretamente, dispensando o fetch de config
- Colunas configuráveis: `key`, `label`, `sortable`, `type` (text/date/datetime/boolean/badge/currency), `alignHead`, `alignBody`, `meta` (`{ style?: CSSProperties }`) — largura via `meta: { style: { width: '12%' } }`
- Prop `render` na `ColumnConfig` — renderer customizado: `(value, record, openModal) => ReactNode`; tem precedência sobre `type`
- Colunas padrão: drag handle, checkbox, id, active (badge com label "Status" no thead) — toggle via props `showDrag`, `showCheckbox`, `showId`, `showActive`
- Ações por linha extraídas para `GridActions` (`frontend/src/components/grid-actions.tsx`) — show, edit, delete, restore — toggle via props `showAction*`; edit/delete ocultos em soft-deleted; restore visível apenas em soft-deleted
- Botões topo: Novo, Pesquisar — toggle via `showBtn*`; Export movido para a barra de paginação como DropdownMenu (PDF/Excel)
- Paginação — exibida somente quando necessário; toggle via `showPagination`; `DataGridPagination` com `hideSizes` e info customizável; contador de registros oculto quando `recordCount === 0`
- Order by — `SortableColumnHeader`: DropdownMenu com opções Asc/Desc + reset para `order DESC` (substitui botão simples); **ordenação padrão: `order DESC`**
- Ações em massa — DropdownMenu com Badge trigger (Ativar/Desativar); toggle via `showBulkActions`
- Btn novo — sempre abre modal com `mode='create'`
- Btn pesquisar — abre `Dialog` de pesquisa (implementado) ✅; calendar com locale `ptBR`
- Empty state — exibe ícone `SearchX` + mensagem "Nenhum registro encontrado"
- `fetchData` usa `URLSearchParams` — inclui `activeFilters` spread nos params da query
- **Agrupamento simples:** props `groupBy` (campo), `groupByLabels` (mapa key→label), `groupByOrder` (ordem dos grupos) — quando definido, renderiza `GroupedTable` com cabeçalhos separadores entre grupos
- **Agrupamento duplo:** props `groupByCompute` (função `(record) => string` que calcula chave composta `"level1|level2"`) + `groupByLevel1Labels` (mapa key→label do nível 1) — renderiza dois níveis de cabeçalhos: nível 1 (bold, fundo escuro) e nível 2 (semibold, fundo muted) — ex: `owner_level|type`
- **DnD em grupos agrupados:** quando `showDrag=true` + `groupBy` definido, usa `GroupedDndSection` (DndContext por grupo) e `handleGroupedDragEnd` para reordenar dentro de cada grupo separadamente

**Props de pesquisa (`GenericGridProps`):**
- `renderSearchFilters` — `ReactNode` com filtros específicos do módulo (linha 2 do modal)
- `onDataLoad(data)` — callback chamada após cada fetch (para o pai consumir os dados carregados)
- `onClearSearchFilters()` — chamada ao limpar filtros; pai reseta seus próprios filtros específicos
- `onSearch(baseFilters)` — chamada ao pesquisar; retorna `Record<string, string>` com params extras do módulo
- `hasModuleFilters` — `boolean` controlado pelo pai; `true` quando algum filtro específico do módulo está ativo

**Modal de pesquisa — filtros padrão:**
- ID, Tipo (contains/starts/exact), Nome, Data (created_at/updated_at/deleted_at), Período (date range), Registros por página (10/20/25/50/100), Ativo (all/active/inactive), Switch "Mostrar deletados"
- `hasFilters` — `useMemo` que monitora TODOS os states; `true` quando qualquer filtro difere do default:
  - `searchId !== ''` | `searchContentMode !== 'contains'` | `searchContentText !== ''`
  - `searchDateType !== 'created_at'` | `searchDateRange?.from !== undefined`
  - `searchPerPage !== '10'` | `searchActive !== 'all'` | `searchDeleted !== false` | `hasModuleFilters`
- Botão "Limpar Filtros" — visível quando `hasFilters === true`; reseta tudo, chama `onClearSearchFilters`, mantém modal aberto
- Botão "Fechar" — visível quando `hasFilters === false`
- Botão "Pesquisar" — sempre visível; monta `activeFilters`, chama `onSearch` para extras do módulo, atualiza `pagination.pageSize`, fecha modal
- `activeFilters` state — persiste os filtros aplicados entre aberturas do modal; passado como spread no `URLSearchParams` do `fetchData`

**Params enviados à API (`fetchData`):**
```
?page=1&per_page=10&sort=order&direction=desc
  &search_id=42&search_name=teste&search_type=contains
  &date_type=created_at&date_from=2025-01-01&date_to=2025-12-31
  &active=true&include_deleted=true
  &[extras do módulo — ex: expiration_date_from=..., type=module, owner_level=master]
```

**Filtros extras suportados pelo `ModuleController.index`:**
- `type` — filtra por enum `module/submodule/pivot` (verificado via `in_array($fillable)`)
- `owner_level` — filtra por enum `master/platform/tenant` (verificado via `in_array($fillable)`)

**Drag & drop (implementado com `@dnd-kit`):**
- Componente `DragHandle` usa `useSortable` do `@dnd-kit/sortable`; tooltip "Arrastar para reordenar" some durante o drag (`isDragging ? false : undefined`)
- `DataGridTableDndRows` envolve o grid com `DndContext`; aceita `renderDragOverlay` (callback) e `onDragStart` (opcional)
- **DragOverlay** com `dropAnimation={null}`: ao arrastar, a linha original fica invisível (`opacity: 0`, mantendo espaço), e uma cópia visual segue o cursor — sem animação de retorno ao soltar
- Sem `transition` CSS nas linhas — evita que as linhas animem de volta antes do React re-renderizar com a nova ordem
- `blur()` chamado em `internalHandleDragEnd` e `internalHandleDragCancel` — elimina qualquer foco/highlight residual
- `handleDragEnd` e `handleGroupedDragEnd`: usam record ID (não índice de array) para lookup — `data.findIndex(d => String(d.id) === activeId)`. Recalcula `order` (`baseOrder = total - pageIndex * pageSize`, decrementa por posição). Sempre chama `fetchData()` no `finally` (sem update otimista).
- `GroupedDndSection`: usa `String(row.original.id)` como ID dos itens sortable (não `row.id` do TanStack). `GroupedDndOverlay` usa `createPortal` para renderizar o `DragOverlay` no `document.body`.
- Dois overlays distintos: `renderDragOverlay` (modo simples) e `renderGroupedDragOverlay` (modo agrupado) — ambos buscam item por record ID.
- Só os itens cujo `order` mudou de fato são enviados via PUT (otimização)
- `DragHandle`: tooltip controlado por state local `tooltipOpen` para evitar glitch após soltar

**Auto-order no backend (`ModuleController.store`):**
- Se `order` não vier no payload: `order = MAX(order) + 1`
- Novos registros sempre aparecem no topo quando ordenado por `order DESC`

---

## Fase 5.2 — Modal CRUD (Padrão)

**Componente genérico:** `frontend/src/components/generic-modal.tsx` (`GenericModal`)

**Tamanhos:** `p` (max-w-sm), `m` (max-w-lg, default), `g` (max-w-4xl)

**Estrutura:**
- **Header esquerda:** label da ação (Criando / Alterando / Visualizando / Deletando / Restaurando registro)
- **Header direita:** btn X (fecha o modal)
- **Content:** `children` (campos do módulo) ou `tabs` para modal com abas
- **Timestamps:** `Criado em: dd/mm/yyyy | Alterado em: dd/mm/yyyy` — visível quando `record` está presente; `Deletado em: dd/mm/yyyy` em `text-destructive` — visível apenas quando `deleted_at` está preenchido
- **Footer esquerda:** switch ativo/inativo + badge clicável (oculto em show e delete)
- **Footer direita:** botões conforme ação

**Badge do switch:**
- `active = true` → `<Badge variant="primary" appearance="light">Ativo</Badge>` (clicável → seta false)
- `active = false` → `<Badge variant="destructive" appearance="light">Inativo</Badge>` (clicável → seta true)

**Regras por ação:**

| Ação | Campos | Switch+Badge | Botões |
|------|--------|--------------|--------|
| Create | editáveis | ✅ visível | Cancelar + Salvar |
| Edit | editáveis | ✅ visível | Cancelar + Salvar |
| Show | `pointer-events-none opacity-60` | — oculto | Fechar |
| Delete | `pointer-events-none opacity-60` | — oculto | Cancelar + Deletar (destructive) |
| Restore | `pointer-events-none opacity-60` | ✅ visível | Cancelar + Salvar (PATCH /restore) |

**Modos implementados:** `create`, `edit`, `show`, `delete`, `restore` ✅ — todos os 5 modos

**Props da interface `GenericModalProps`:**
- `moduleId` — (opcional) busca `slug` + `after_*` via `GET /v1/{tenant}/modules/{id}`
- `slug` — (opcional) bypass: slug direto, dispensa fetch de moduleConfig
- `afterStore`, `afterUpdate`, `afterRestore` — (opcional) sobrescrevem os valores `after_*` do banco
- `onSaveSuccess(record)` — callback chamado com o record retornado pela API após create/edit/restore bem-sucedido
- `record` — registro atual (qualquer módulo)
- `onGetData()` — coleta dados do formulário externo; retornar `null` aborta o save
- `onErrors(errors)` — repassa erros 422 ao pai para exibir nos campos
- `saveDisabled` — boolean externo para desabilitar o botão Salvar (ex: slug inválido, campo obrigatório vazio)
- `tabs` — array `{label, content}` para modal com abas
- `children` — campos do módulo (usado quando sem abas)

**Comportamento `after_*` (lido da tabela `modules`):**
- `index` → fecha o modal e recarrega o grid
- `show` → mantém modal aberto, muda para modo `show` com o registro salvo
- `create` → mantém modal aberto, limpa campos, modo `create`
- `edit` → mantém modal aberto, carrega registro salvo, modo `edit`

**Validação de slug em tempo real (tenants):**
- `useEffect` com debounce de 500ms observa `slug`
- Chama `GET /v1/admin/tenants/check-slug?slug=&exclude_id=`
- Status: `idle | checking | available | unavailable`
- `onGetData` retorna `null` enquanto `checking` ou `unavailable`, abortando o save
- Ativo nos modos `create`, `edit`, `restore`

**Regras extras:**
- Ao deletar, `active` é setado para `false` automaticamente (backend: `destroy` do `ModuleController`)
- Existe um único componente modal reutilizável para todos os módulos — não criar outros modais de CRUD salvo casos extremamente necessários

**Submódulos no modal:**
- Módulos com submódulos (documentos, contatos, endereços, notas, arquivos) usam modal `g` com prop `tabs`
- Primeira tab: dados principais
- Demais tabs: submódulos
- Módulos sem submódulos usam `children` (sem tabs)

---

## Fase 5.3 — Modal CRM de Detalhes

Padrão de modal CRM adotado para Platforms, Tenants e Pessoas. Aberto quando `mode = 'show'` ou `mode = 'edit'` via dispatcher no modal específico do módulo.

**Dispatcher (padrão em todos os modais CRM):**
- `toRenderMode('show')` → `'show-crm'` → abre modal CRM
- `toRenderMode('edit')` → `'show-crm'` → abre modal CRM
- `toRenderMode('create' | 'delete' | 'restore')` → passa direto para `GenericModal`

### TenantShowModal (`tenant-show-modal.tsx`) — max-w-6xl

**Estrutura:**
- Header: #ID + Nome + Badge Ativo/Inativo + sub-header de timestamps
- Coluna esquerda (20%): Validade, Slug, Banco, Usuário (Badges)
- Coluna direita: Tabs — Visão Geral, Documentos, Endereços, Observação, Arquivos

**Tab Visão Geral:**
- Grid editável: Nome + Slug (validação real-time) + Validade + Platform (select)
- 3 cards: Sandbox (DatabaseZap) | Produção (Server) | Log (ScrollText) com Banco/Usuário/Senha (Eye/EyeOff)
- Senhas carregadas sob demanda via `GET /v1/admin/tenants/{id}/credentials`

**TenantsPage — colunas `render`:**
- `name` → botão clicável abre `TenantShowModal`
- `platform_id` → `<Badge variant="secondary">` com nome da plataforma
- `slug`, `db_name` → `<Badge variant="info" appearance="light">`
- `expiration_date` → Badge colorido (success/warning/destructive) com duração legível

### PlatformShowModal (`platform-show-modal.tsx`) — max-w-6xl

Mesma estrutura do `TenantShowModal`. Aberto quando `mode = 'show'` ou `mode = 'edit'` via `PlatformModal`.

**Tab Visão Geral:**
- Grid editável: Nome + Domínio + Slug (validação real-time) + Validade
- 3 cards: Sandbox | Produção | Log com Banco/Usuário/Senha (Eye/EyeOff)
- Senhas carregadas sob demanda via `GET /v1/admin/platforms/{id}/credentials`

**PlatformsPage — colunas `render`:**
- `name` → botão clicável abre `PlatformShowModal`
- `slug`, `db_name` → `<Badge variant="info" appearance="light">`
- `expiration_date` → Badge colorido com duração legível

### ModuleShowModal (`module-show-modal.tsx`) — max-w-6xl, h-85vh / inline

Modal CRM para módulos. Suporta dois modos de renderização:
- **Dialog** (padrão): abre como modal quando `mode = 'show'` ou `mode = 'edit'` via `ModuleModal` (sem `ModuleInlineCtx`)
- **Inline** (`inline` prop): renderizado diretamente na página quando `ModuleInlineCtx` está disponível — substituindo o grid no `ModulesPage`

**Props adicionais:**
- `inline?: boolean` — renderiza sem Dialog, integrado à página
- `onBack?: () => void` — callback do botão "← Voltar" (inline mode)
- `moduleId?: number` — ID do módulo pai; usado no modo inline para buscar nome/ícone do módulo pai e exibir no breadcrumb

**Estrutura (ambos os modos):**
- **Linha 1 (inline):** `← Voltar` + breadcrumb `[ícone] Módulos > ` + #ID + Nome + Badge Ativo/Inativo + badges Tipo/Proprietário (direita)
- **Linha 1 (dialog):** #ID + Nome + Badge Ativo/Inativo + badges Tipo/Proprietário (direita)
- **Linha 2:** Timestamps (Criado em / Alterado em / Deletado em)
- **Tabs:** Dados ✅, Campos ✅, Grid, Form, Restrições, Seeds (últimas 4: "Em desenvolvimento")

**Tab Dados — 4 cards:**
- **Identificação:** Ícone (span 1, botão abre `IconPickerModal`) + Nome (span 5) + Tipo (span 2) + Proprietário (span 2) + Tamanho Modal (span 2)
- **Configuração:** Slug (span 2, validação real-time) + Prefixo URL (span 4, com preview `/{slug}`) + Model (span 2, select scan-files) + Request (span 2, select scan-files) + Controller (span 2, select scan-files agrupado por pasta)
- **Linha 3 (3 cards lado a lado):**
  - **Tela de Exibição (col-4):** 6 Selects em grid 2×3 (Index/Visualizar | Criar/Editar | Deletar/Restaurar) — opções: `none` (Nenhum), `page` (Tela), `modal` (Modal), `card` (Card); campos: `screen_index`, `screen_show`, `screen_create`, `screen_edit`, `screen_delete`, `screen_restore` — apenas visual no frontend por enquanto (backend ainda não tem essas colunas)
  - **Ações de Comportamento (col-2):** Selects Após Criar/Editar/Restaurar
  - **Submódulos (col-6):** checkboxes de submódulos disponíveis (visível apenas quando type=module; busca `GET /v1/{tenant}/modules?type=submodule`)
- **Descrições:** 6 Textareas 3×2 (index, show, store, update, delete, restore) — **card colapsável**; começa fechado (default); abre automaticamente se o record tiver algum campo de descrição preenchido; botão toggle com ChevronDown/ChevronRight

**Tab Campos:** componente `ModuleFieldsTab` — CRUD inline de campos com drag-and-drop (@dnd-kit), tabela com linha editável por campo. Interface: Nome, Tipo, Tamanho/FK, Nulo, Obrigatório, Único, Índice, Default, Ativo, Deletar. Campos padrão (`is_custom=false`) read-only e sem drag handle. Botão "+ Adicionar Campo" ao fundo.

**Detalhes de `ModuleFieldsTab`:**
- `FieldRow` inclui `owner_level` e `owner_id` (mapeados em `normalize`, enviados em todos PUT/POST)
- `toApiPayload(field)` — converte `type` para minúsculo antes de enviar à API (validação backend exige lowercase)
- `sortFields(fields)` — ordena: `id` primeiro → custom (por `order ASC`) → `order, active, created_at, updated_at, deleted_at` (ordem fixa ao final)
- Fetch com `direction=asc`; aplicar `sortFields` após fetch, após insert e após DnD
- Novo campo: POST com `type: 'string'`, `order: 1`, `is_custom: true`; inserido via `sortFields` (aparece logo após `id`)
- DnD: redistribui os valores de `order` existentes dos campos custom entre as novas posições (ASC); campos padrão mantêm orders fixas
- `FkModal` — dialog para configurar FK (`fk_table`, `fk_column`, `fk_label`); aparece quando tipo=`BIGINT`; busca módulos + campos via API

**Scan de arquivos:** `GET /v1/{tenant}/modules/scan-files` — popula selects de Model, Request e Controller

**Ícone dinâmico:** `import * as LucideIcons` — converte o valor do campo `icon` em componente React; `null` se ícone não encontrado (sem fallback).

**ModuleModal — contexto inline:**
- Exporta `ModuleInlineCtx = createContext<((record: ModuleForEdit) => void) | null>(null)`
- Quando context está disponível e mode=show/edit: chama `goInline(record)` + fecha modal
- Quando sem context: abre `ModuleShowModal` como Dialog (comportamento anterior)

**ModulesPage — renderização inline:**
- `selectedModule: ModuleForEdit | null` state
- Quando `selectedModule !== null`: renderiza `ModuleShowModal inline` diretamente (sem título da página — o breadcrumb inline já exibe "← Voltar [ícone] Módulos > #ID Nome")
- Quando `null`: renderiza `ModuleInlineCtx.Provider` + `GenericGrid` (com `key={gridKey}` para forçar refresh)
- `handleSuccess()`: limpa `selectedModule` + incrementa `gridKey`

**ModulesPage — agrupamento duplo:**
- `groupByCompute={(record) => \`${record.owner_level}|${record.type}\`}` — chave composta
- `groupByLevel1Labels={{ master: 'MASTER', platform: 'PLATFORM', tenant: 'TENANT' }}`
- `groupByLabels={{ module: 'Módulo', submodule: 'Submódulo', pivot: 'Pivot' }}`
- `groupByOrder`: 9 combinações na ordem master→platform→tenant, dentro de cada um module→submodule→pivot
- DnD dentro de grupos habilitado (`showDrag=true`)
- Filtros de pesquisa específicos: Proprietário (owner_level) e Tipo (type) via `renderSearchFilters`

**ModulesPage — colunas `render`:**
- `name` → botão clicável dispara inline via context
- `slug` → `<Badge variant="info" appearance="light">`
- `order` → `<Badge variant="info" appearance="light">`
- `type` e `owner_level` — removidas do grid (agrupamento duplo já comunica essa informação)

### PersonShowModal (`person-show-modal.tsx`) — max-w-4xl

Modal CRM para pessoas. Aberto quando `mode = 'show'` ou `mode = 'edit'` via `PersonModal`.

**Estrutura:**
- Header: #ID + Nome + Badge Ativo/Inativo + Nascimento (direita)
- Sub-header de timestamps
- Tabs: Visão Geral, Documentos, Endereços, Observação, Arquivos (4 últimas: "Em desenvolvimento")

**Tab Visão Geral:**
- Grid 12 colunas: Nome (span 6) + Data de Nascimento (span 3)

**PessoasPage — filtros extras (aniversário):**
- `birth_month_day_from`, `birth_month_day_to` — filtro de aniversário por período no ano (MM-DD)
- Seletor de mês no modal de pesquisa

---

## Convenções Gerais

- Português para nomes de campos e labels de interface
- Inglês para nomes de variáveis, classes, métodos e arquivos de código
- Sempre usar `softDeletes` em todas as tabelas
- `active` é booleano, padrão `true`
- `order` é inteiro, padrão `1`, usado para drag & drop de ordenação
- Nunca criar rotas ou controllers de CRUD específicos — tudo via `ModuleController` genérica
