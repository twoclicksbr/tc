# CLAUDE.md — TwoClicks (tc)

> Sistema de fazer sistemas. Plataforma SaaS genérica para criação de sistemas completos via configuração.

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
Branch management + sincroniza CLAUDE.md + commit/push. Gerencia branches de feature (criar, trocar, combinar), analisa diffs detalhadamente, atualiza CLAUDE.md seção por seção, commita e faz push na branch de feature. Para automaticamente se não houver mudanças para documentar.
Arquivo: `.claude/commands/docs.md`

### /merge
Mergea branch de feature na main. Fetch, seleção de branch, merge, push da main, deleta branch (local + remota).
Arquivo: `.claude/commands/merge.md`

### /deploy
Deploy no servidor sandbox. Merge main → sandbox, push, SSH (`ssh twoclicks`): git pull + composer + migrate + cache no backend; git pull + npm install --legacy-peer-deps + build no frontend. Opção de seeders.
Arquivo: `.claude/commands/deploy.md`

### /merge-production
Mergea sandbox na production. Merge, push.
Arquivo: `.claude/commands/merge-production.md`

### /deploy-production
Deploy produção via SSH. Mesmo fluxo do /deploy mas branch production e diretório /var/www/tc/prod/.
Arquivo: `.claude/commands/deploy-production.md`

### /vite
Inicia o Vite dev server em background sem bloquear o terminal.
Arquivo: `.claude/commands/vite.md`

### /vite-reset
Fecha o Vite (porta 5173) e reinicia em background.
Arquivo: `.claude/commands/vite-reset.md`

### /vite-close
Fecha o processo do Vite na porta 5173.
Arquivo: `.claude/commands/vite-close.md`

## Regras do Chat (claude.ai)

- Não usar caixas de perguntas (widgets de seleção). Sempre perguntar em texto direto.
- Ao enviar prompts para o Claude Code, sempre envolver o prompt inteiro em um único bloco de código (``` ```) para que o usuário copie com um clique. Texto explicativo fica fora do bloco, antes ou depois.

## Repositório

- **GitHub:** https://github.com/twoclicksbr/tc.git
- **CLAUDE.md (raw):** https://raw.githubusercontent.com/twoclicksbr/tc/refs/heads/main/CLAUDE.md

---

## Hierarquia

```
TwoClicks (sistema)
├── tc (plataforma TwoClicks)
│   └── master (tenant)
├── sc360 (plataforma SmartClick360°)
│   ├── master (tenant)
│   └── valsul (tenant)
└── b360 (plataforma Bethel360°)
    ├── master (tenant)
    └── igrejadacidade (tenant)
```

Todas as plataformas seguem o mesmo padrão. tc é uma plataforma como qualquer outra — o que muda são as restrições de acesso.

## Restrições de Acesso

A visibilidade desce, nunca sobe. Funciona como níveis de suporte:

- **tc_master (nível 2)** → enxerga todas as plataformas e todos os tenants. Conecta diretamente no banco de destino (cross-database). Não replica dados.
- **sc360_master (nível 1)** → enxerga só seus tenants. Conecta no banco do tenant quando precisa. Nunca sobe pro tc_master.
- **sc360_valsul (nível 0)** → enxerga só seus próprios dados. Nunca sobe pra ninguém. Nem sabe que os níveis acima existem.

**Fluxo de suporte:** tenant tem problema → plataforma (nível 1) conecta no banco do tenant e investiga → não resolveu → TwoClicks (nível 2) conecta em qualquer banco e resolve.

**Dados por nível:**
- **tc_master** — plataformas (cadastro) + people/users dos admins das plataformas (são "clientes" da TwoClicks) + modules (configuração). Ex: Alex (dono TwoClicks) e João (admin sc360) estão no tc_master como people.
- **sc360_master** — tenants da sc360 + people/users da operação sc360. Ex: Valsul como tenant está aqui.
- **sc360_valsul** — dados operacionais do tenant.

Os dados moram onde pertencem. Pra ver tenants da sc360, tc_master conecta direto no `sc360_master` — não tem cópia local.

**Visibilidade de módulos:**
- **Plataformas** — visível apenas em tc_master
- **Tenants** — visível em tc_master + {platform}_master
- **Tenant comum** — não vê Plataformas nem Tenants

---

## Banco de Dados

Padrão: `{platform.slug}_{tenant.slug}`

- `tc_master` — platform=tc, tenant=master
- `sc360_master` — platform=sc360, tenant=master
- `sc360_valsul` — platform=sc360, tenant=valsul

Todos com 3 schemas: sand, prod, log. Sem exceção.

### Schemas

Cada banco tem 3 schemas PostgreSQL:
- **`sand`** — sandbox (ambiente de testes)
- **`prod`** — produção (recebe dados apenas via deploy, nunca via migrations diretas)
- **`log`** — audit logs (tabela `audit_logs`)

Schema `public` removido. Middleware detecta `.sandbox.` no hostname → `sand`, caso contrário → `prod`. O `search_path` = `'{schema},log'`.

**Regra de migrations:** tudo nasce em sand. Prod nunca recebe migrations diretas — só via processo de deploy. O comando `migrate:schemas` roda migrations apenas em sand e log.

### Padrão de Tabelas

Todas as tabelas seguem a ordem de colunas:

```
id → campos específicos → order (default 1) → active (default true) → timestamps → deleted_at (softDeletes)
```

### Estrutura de Tabelas

#### Banco master (ex: `tc_master`)

| Tabela | Campos |
|--------|--------|
| `platforms` | name, domain, domain_local (nullable), slug (unique), db_name, sand_user, sand_password (encrypted), prod_user, prod_password (encrypted), log_user, log_password (encrypted), expiration_date, order, active |
| `tenants` | platform_id (FK platforms), name, slug (unique), db_name, sand_user, sand_password (encrypted), prod_user, prod_password (encrypted), log_user, log_password (encrypted), expiration_date, order, active |
| `people` | name, birth_date (nullable), order, active |
| `users` | person_id (FK people), email, password, active |
| `modules` | (ver seção Configuração) |
| `module_fields` | (ver seção Configuração) |
| `personal_access_tokens` | tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at |

#### Por tenant

| Tabela | Campos |
|--------|--------|
| `people` | name, birth_date (nullable), order, active |
| `users` | person_id (FK people), email, password, active |
| `modules` | (ver seção Configuração) |
| `module_fields` | (ver seção Configuração) |
| `personal_access_tokens` | tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at |

#### Configuração

| Tabela | Campos |
|--------|--------|
| `modules` | slug (unique), url_prefix (nullable), name, icon (nullable), type (enum: module/submodule/pivot, default module), is_custom (bool, default false), model (default GenericModel), request (default GenericRequest), controller (default GenericController), observer (default GenericObserver), service (default GenericService), order, active |
| `module_fields` | module_id (FK modules, cascade), name, type (string, default string), length (string, nullable), nullable (bool), default (nullable), unique (bool), index (bool), fk_table (nullable), fk_column (nullable), is_system (bool, default false), order, active |

- `slug` = identificador único usado na URL
- `url_prefix` = prefixo opcional de URL antes do slug
- `icon` = nome do ícone Lucide (ex: `Users`, `Package`) — renderizado dinamicamente
- `is_custom` = true quando o módulo usa classes PHP específicas (Model/Request/Controller/Observer/Service customizados); false usa GenericModel/GenericRequest etc.
- `controller` = controller específica no formato `System\\TenantController`; default `GenericController`
- `type` = `module`, `submodule` ou `pivot`
- `is_system` = true para campos criados pelo Observer (id, order, active, created_at, updated_at, deleted_at) — read-only na UI, não arrastáveis
- `length` = string (ex: `255` para string, `10,2` para decimal/enum)

#### Tabelas de Tipo (referência) — não implementadas

| Tabela | Campos |
|--------|--------|
| `type_documents` | name, mask, order, active |
| `type_contacts` | name, mask, order, active |
| `type_addresses` | name, order, active |

#### Submódulos (reutilizáveis via module_id + register_id) — não implementados

| Tabela | Campos |
|--------|--------|
| `notes` | module_id, register_id, name, content, order, active |
| `files` | module_id, register_id, name, slug, path, size, type, order, active |
| `documents` | type_document_id, module_id, register_id, value, expiration_date, order, active |
| `contacts` | type_contact_id, module_id, register_id, value, order, active |
| `addresses` | type_address_id, module_id, register_id, zip_code, street, number, complement, neighborhood, city, state, country, order, active |

#### Tabelas de Sistema (geradas automaticamente)

| Tabela | Descrição |
|--------|-----------|
| `personal_access_tokens` | Tokens Sanctum |
| `sessions` | Sessões de usuário |
| `password_reset_tokens` | Tokens de reset de senha |
| `cache` | Cache da aplicação |
| `jobs` / `job_batches` / `failed_jobs` | Filas |

---

## Motor do Sistema (hardcode)

Tabelas com código PHP (Model, Request, Observer, Service, Controller):

**Independentes:**
- `modules` — define módulos do sistema
- `module_components` — catálogo global de componentes do page builder (não implementado)
- `platforms` — plataformas (Observer + Service provisiona banco)
- `tenants` — empresas (Observer + Service provisiona banco)
- `users` — autenticação (Sanctum, person_id FK, password hashing)

**Submodules de modules (por module_id):**
- `module_fields` — colunas/campos do módulo ✅
- `module_permissions` — permissões por pessoa + módulo + ação (não implementado)
- `module_pages` — página montada por módulo, árvore JSON (não implementado)
- `module_seeds` — dados iniciais + controle de execução (não implementado)

```
modules
├── module_fields ✅
├── module_permissions (futuro)
├── module_pages (futuro)
└── module_seeds (futuro)

module_components (independente, futuro)
platforms ✅
tenants ✅
users ✅
```

## Módulos Dinâmicos (configuração)

Tudo que não é motor nasce da configuração. O primeiro módulo 100% dinâmico é `people`. Depois: produtos, notas, contatos, endereços, e qualquer coisa que o usuário criar.

Fluxo: cadastra módulo → define campos (module_fields) → monta tela no page builder (module_pages) → configura permissões (module_permissions) → roda seeds se necessário (module_seeds).

## is_custom vs Generic

Módulos com `is_custom=false` usam classes genéricas (`GenericModel`, `GenericRequest`, `GenericController`, `GenericObserver`, `GenericService`). Módulos com `is_custom=true` definem classes PHP específicas. O campo `is_custom` é um switch na UI — quando false, os campos de classe ficam ocultos e o payload envia os valores Generic* automaticamente.

---

## URLs & Domínios

**Frontend (produção):**
- Master TwoClicks: `master.twoclicks.com.br`
- Platform admin: `master.smartclick360.com` (domínio próprio da platform)
- Tenant: `valsul.smartclick360.com`

**Frontend (sandbox):**
- `master.sandbox.twoclicks.com.br`
- `valsul.sandbox.smartclick360.com`

**API (centralizada):**
- Prod: `{tenant}.{platform}.api.twoclicks.com.br`
- Sand: `api.sandbox.twoclicks.com.br`

**Dev local:**
- `master.tc.test` / `master.sandbox.tc.test` / `valsul.sc360.test`
- `api.tc.test` com headers X-Tenant, X-Platform, X-Sandbox

### Validade

- Quando `expiration_date` expirar, exibe tarja vermelha no topo do site: "Sua assinatura expirou em dd/mm/yyyy. Entre em contato para renovar."
- NÃO bloqueia o acesso, apenas avisa

---

## Stack

- **Backend:** Laravel 12 (API)
- **Frontend:** React 19 + TypeScript + Vite (Metronic v9.4.5) + Tailwind CSS 4
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

### Documentação da API

- **URL local:** https://tc.test/docs
- **Regenerar:** `"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan scribe:generate`

### Autenticação (Sanctum)

Controller: `App\Http\Controllers\Auth\AuthController` — rotas públicas e protegidas por `auth:sanctum`.

| Método | URL | Descrição | Auth |
|--------|-----|-----------|------|
| POST | `api.{domínio}/v1/auth/login` | Login → retorna token + user | Público |
| POST | `api.{domínio}/v1/auth/logout` | Logout → revoga token atual | Bearer |
| GET | `api.{domínio}/v1/auth/me` | Retorna usuário autenticado com `person` | Bearer |

Resposta do login:
```json
{ "token": "1|abc...", "user": { "id": 1, "email": "...", "active": true, "person": { "id": 1, "name": "..." } } }
```

### Rotas CRUD Genéricas (System\ModuleController)

Todas protegidas por `auth:sanctum`. `{module}` = `slug` do registro na tabela `modules`.

| Método | URL | Método Controller | Descrição |
|--------|-----|-------------------|-----------|
| GET | `/v1/{module}` | `index` | Lista paginada com sort, per_page e filtros |
| POST | `/v1/{module}` | `store` | Cria registro (usa Request dinâmica) |
| GET | `/v1/{module}/check-slug` | `checkSlug` | Verifica disponibilidade de slug |
| GET | `/v1/{module}/scan-files` | `scanFiles` | Retorna Models, Requests, Controllers, Observers e Services disponíveis |
| GET | `/v1/{module}/{id}` | `show` | Exibe registro (inclui soft-deleted) |
| PUT/PATCH | `/v1/{module}/{id}` | `update` | Atualiza registro |
| DELETE | `/v1/{module}/{id}` | `destroy` | Soft delete + seta active=false |
| PATCH | `/v1/{module}/{id}/restore` | `restore` | Restaura soft-deleted |

**Rotas específicas (antes das genéricas):**
- `GET /v1/tenants/{id}/credentials` → `System\TenantController::credentials`
- `GET /v1/platforms/{id}/credentials` → `System\PlatformController::credentials`
- `GET /v1/modules/scan-files` → `System\ModuleController::scanFiles`
- `GET /v1/modules/check-slug` → `System\ModuleController::checkSlug`
- `GET /v1/modules/{id}/table-status` → `System\ModuleController::tableStatus`
- `POST /v1/modules/{id}/generate-table` → `System\ModuleController::generateTable` (body: `{ confirm_dangerous: bool }`)

**Filtros do index:**
```
?page=1&per_page=10&sort=order&direction=desc
  &search_id=42&search_name=teste&search_type=contains
  &date_type=created_at&date_from=2025-01-01&date_to=2025-12-31
  &active=true&include_deleted=true
  &type=module&owner_level=master
  &expiration_date_from=...&expiration_date_to=...
  &birth_month_day_from=...&birth_month_day_to=...
```

### Controllers

| Pasta | Controllers |
|-------|-------------|
| `Auth/` | `AuthController` (login, logout, me) |
| `System/` | `ModuleController` (CRUD genérico + scanFiles + checkSlug + tableStatus + generateTable), `TenantController` (credentials), `PlatformController` (credentials) |

### Middleware Multi-Tenancy (`ResolveTenant.php`)

Resolve a conexão do banco com base no hostname ou headers.

**Resolução:**
- **Produção** — hostname: `{tenant}.{platform}.api.{base-domain}` (ex: `master.tc.api.twoclicks.com.br`)
- **Header-based** — quando `parts[0] === 'api'` (ex: `api.tc.test`, `api.sandbox.twoclicks.com.br`) ou hostname tem < 4 partes: usa headers `X-Tenant`, `X-Platform`, `X-Sandbox`
- `X-Sandbox: 1` ou `X-Sandbox: true` → `schema='sand'`
- Em produção, `sandbox` presente em qualquer parte após `parts[1]` → `schema='sand'`

**Níveis de acesso (`config('app.access_level')`):**
- `master` — tenant=`master` + platform=`ROOT_PLATFORM_SLUG` (env, default `tc`)
- `platform` — tenant=`master` + outra platform
- `tenant` — qualquer outro tenant

**Fluxo de conexão:**
- `search_path` = `'{schema},log'`
- Busca a `Platform` pelo `slug` no banco `tc_master` → 404 se não encontrada
- Acesso `master`/`platform` → aponta `tc_master` para `{platform->db_name}`, usa como default
- Acesso `tenant` → usa conexão `platform_lookup` para buscar o tenant; configura conexão `tenant` com credenciais do schema correto

**Prioridade:** ResolveTenant roda antes do `auth:sanctum` (via `prependToPriorityList`).

### Models (`app/Models/`)

| Model | Conexão | Observação |
|-------|---------|-----------|
| `Tenant` | `tc_master` (explícita) | hidden passwords; casts encrypted + `'order' => 'integer'`; `platform()` belongsTo |
| `Platform` | `tc_master` (explícita) | hidden passwords; casts encrypted + `'order' => 'integer'`; campos `domain`, `domain_local`; `tenants()` hasMany |
| `User` | default (dinâmica) | Sanctum HasApiTokens |
| `Person` | default (dinâmica) | cast `birth_date` como `'date:Y-m-d'` |
| `Module` | default (dinâmica) | fillable: slug, url_prefix, name, icon, type, is_custom, model, request, controller, observer, service, order, active; casts: is_custom/order/active |
| `ModuleField` | default (dinâmica) | `module()` belongsTo; fillable: module_id, name, type, length, nullable, default, unique, index, fk_table, fk_column, is_system, order, active; casts: nullable/unique/index/is_system bool, order int |
| `PersonalAccessToken` | via `getConnectionName()` | Retorna `DB::getDefaultConnection()` |

### Migrations

**`database/migrations/tc_master/`** — roda via `migrate:schemas` (apenas sand + log)

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

**`database/migrations/tenant/`** — roda via provision (apenas sand + log)

| Migration | Cria |
|-----------|------|
| `2025_02_24_000001` | modules |
| `2025_02_24_000002` | people |
| `2025_02_24_000003` | users (com person_id FK) |
| `2026_02_24_213424` | personal_access_tokens |
| `2026_02_27_000001` | module_fields (FK modules, cascadeOnDelete) |

**`database/migrations/log/`**

| Migration | Cria |
|-----------|------|
| `2026_02_26_000001` | audit_logs |

**Comando de reset completo:**
```bash
"/c/Users/alexa/.config/herd/bin/php84/php.exe" artisan migrate:schemas --fresh --seed
```

### Observers (`app/Observers/`)

| Observer | Gatilho | O que faz |
|----------|---------|-----------|
| `ModuleObserver` | `created` | Cria 6 campos padrão no module_fields com `is_system=true` (id, order, active, created_at, updated_at, deleted_at) |
| `TenantObserver` | `creating` | Gera slug, db_name, sand/prod/log user+password, expiration_date |
| `TenantObserver` | `created` | Chama `TenantDatabaseService::provision()` |
| `PlatformObserver` | `creating` | Gera slug, db_name = `{slug}_master`, sand/prod/log user+password, expiration_date |
| `PlatformObserver` | `created` | Chama `PlatformDatabaseService::provision()` |

### Services (`app/Services/`)

| Service | O que faz |
|---------|-----------|
| `TenantDatabaseService` | `provision(Tenant)`: dbName = `{platform.slug}_{tenant.db_name}` (prefixo dinâmico). Cria banco, 3 users, 3 schemas. Banco novo → migrations sand + log + admin users. Banco existente → só garante infra (users, schemas), pula migrations. Idempotente. Rollback em erro. |
| `PlatformDatabaseService` | Mesma lógica. Banco novo → migrations sand + log + admin users (`sand@{domain}` / `prod@{domain}`, senhas `@sand_{slug}_999` / `@prod_{slug}_999`). Banco existente → só infra. |
| `TableGeneratorService` | Geração dinâmica de tabelas a partir de `module_fields`. Métodos públicos: `getTableStatus(Module): array` (compara campos ativos com `information_schema.columns` → retorna `table_exists`, `table_name`, `changes[]`, `has_pending_changes`, `dangerous_changes[]`) e `generateTable(Module, confirmDangerous): array` (CREATE ou ALTER TABLE com backup automático + rollback em erro). Usa schema ativo via `current_schema()`. Status por campo: `synced`, `new`, `altered`, `removed`. Alterações perigosas: mudança de tipo com dados, DROP com dados, NOT NULL com NULLs existentes. Mapeamento de tipos: string→varchar, text→text, integer→integer, bigint→bigint, boolean→boolean, date→date, datetime→timestamp, decimal→numeric, enum→varchar. |

### Seeders (`database/seeders/`)

| Seeder | O que faz |
|--------|-----------|
| `DatabaseSeeder` | Chama TcMasterSeeder + AdminSeeder |
| `TcMasterSeeder` | Cria: Platform "TwoClicks" (slug=tc, domain=twoclicks.com.br, domain_local=tc.test, validade +10 anos) → Tenant "Master" (slug=master, platform=tc, validade +10 anos) → 4 Modules com is_custom=true: modules (observer=ModuleObserver, service=GenericService), module-fields (controller=GenericController), platforms (observer=PlatformObserver, service=PlatformDatabaseService), tenants (observer=TenantObserver, service=TenantDatabaseService) |
| `AdminSeeder` | Cria person "Alex Twoclicks Technology" (birth_date=1985-05-09) + user alex@twoclicks.com.br (password: Alex1985@) |

### Requests (`app/Http/Requests/`)

| Request | Validação |
|---------|-----------|
| `PlatformRequest` | name, domain (unique:tc_master.platforms), domain_local (nullable), slug (unique:tc_master.platforms), db_name, sand/prod/log user+password, expiration_date, order, active |
| `TenantRequest` | platform_id (required, exists:tc_master.platforms), slug (unique:tc_master.tenants), demais credenciais pelo Observer |
| `PersonRequest` | name (required), birth_date (nullable) |
| `UserRequest` | person_id (required, FK), email (unique), password (required no create, nullable no update) |
| `ModuleRequest` | slug (required, unique), url_prefix (nullable), name (required), icon (nullable), type (required: module/submodule/pivot), is_custom (nullable bool), model (required), request (required), controller (required), observer (required), service (required), order (nullable int), active (nullable bool) |
| `ModuleFieldRequest` | module_id (required, exists:modules), name (required), type (required: string/text/integer/bigint/boolean/date/datetime/decimal/enum), length (nullable string max:50), nullable (nullable bool), default (nullable string), unique (nullable bool), index (nullable bool), fk_table (nullable, required_if:type,bigint), fk_column (nullable, required_if:type,bigint), is_system (nullable bool), order (nullable int), active (nullable bool) |

**Módulos de sistema** (modules, platforms, tenants, users) mantêm Model + Request + Observer hardcoded. **Módulos criados pela UI** usam validação dinâmica baseada em module_fields.

### CORS (`config/cors.php`)

| Chave | Valor |
|-------|-------|
| `paths` | `['api/*', 'v1/*', 'sanctum/csrf-cookie']` |
| `allowed_origins_patterns` | `['#^https?://(.*\.)?tc\.test(:\d+)?$#']` |
| `allowed_headers` | `['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Tenant', 'X-Platform', 'X-Sandbox']` |
| `supports_credentials` | `true` |

---

## Site Institucional (Blade)

Servido pelo Laravel via rotas `web` em `routes/web.php`. Views em `resources/views/site/`.

**Rotas web:**
| Rota | Comportamento |
|------|--------------|
| `GET /` | Renderiza `site.home` (site institucional) |
| `GET /login` | Redireciona para `http://master.tc.test:5173/auth/signin` |

**Views (`resources/views/site/`):**
| Arquivo | Descrição |
|---------|-----------|
| `home.blade.php` | Layout principal — inclui head, sandbox-banner, header, footer, modal, script |
| `sandbox-banner.blade.php` | Tarja vermelha de aviso — exibida quando `str_contains(request()->getHost(), 'sandbox')`; `position:fixed; top:0; z-index:9999`; spacer de 36px abaixo |
| `header.blade.php` | Header com navbar — botão Login com URL dinâmica via `request()->getHost()`: `.test` → `http://master.{host}:5173`; produção → `https://master.{host}` |
| `footer.blade.php` | Rodapé com copyright dinâmico (`date('Y')`) |

**Configuração:**
- `SESSION_DRIVER=file` — site institucional é estático, não usa session em banco

---

## Frontend (Metronic React)

- **Pasta:** `frontend/`
- **Versão:** Metronic v9.4.5 — React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- **Layout de referência:** `C:\Herd\themeforest\metronic\crm`
- **URL local:** http://master.sandbox.tc.test:5173
- **Auth:** Laravel Sanctum ✅
- **Layout em uso:** `Demo3Layout`

### Variáveis de Ambiente (`frontend/.env`)

```env
VITE_APP_NAME=metronic-tailwind-react
VITE_APP_VERSION=9.2.6
VITE_API_URL=https://api.tc.test
VITE_PLATFORM_SLUG=tc
```

> `VITE_PLATFORM_SLUG` identifica a plataforma ativa para este deployment. Enviado como header `X-Platform` em todas as chamadas de API.

### Providers em uso (`App.tsx`, de fora pra dentro)

QueryClientProvider > AuthProvider > PlatformProvider > SettingsProvider > ThemeProvider > I18nProvider > HelmetProvider > TooltipsProvider > QueryProvider > LoadingBarContainer > BrowserRouter > ModulesProvider > AppRouting

**ThemeProvider (`providers/theme-provider.tsx`):** `next-themes` com `defaultTheme="light"`, `storageKey="vite-theme"`. `enableSystem` removido — tema padrão é sempre light para manter o toggle (`checked={theme === 'dark'}`) sincronizado. Usuário pode alternar via dropdown no header.

### Auth (Laravel Sanctum)

| Arquivo | Descrição |
|---------|-----------|
| `adapters/laravel-adapter.ts` | Adapter em uso — login/logout/me via `VITE_API_URL`; headers X-Tenant/X-Platform/X-Sandbox |
| `providers/laravel-provider.tsx` | AuthProvider em uso |
| `context/auth-context.ts` | AuthContext + hook `useAuth()` |
| `lib/helpers.ts` | getAuth/setAuth/removeAuth via localStorage |
| `require-auth.tsx` | Redireciona para `/auth/signin` se não autenticado |

### Rotas Frontend (`app-routing-setup.tsx`)

Dentro de `<RequireAuth>` + `<Demo3Layout>`:

| Rota | Componente | Status |
|------|-----------|--------|
| `/` | `Navigate to="/dashboard"` | ✅ |
| `/dashboard` | `DashboardPage` | Placeholder |
| `/platforms` | `PlatformsPage` | ✅ CRUD + CRM modal |
| `/tenants` | `TenantsPage` | ✅ CRUD + CRM modal |
| `/modules` | `ModulesPage` | ✅ Grid agrupado + inline edit |
| `/pessoas` | `PessoasPage` | ✅ CRUD + CRM modal |
| `/produtos` | `ProdutosPage` | Placeholder |
| `/compras` | `ComprasPage` | Placeholder |
| `/vendas` | `VendasPage` | Placeholder |
| `/financeiro` | `FinanceiroPage` | Placeholder |
| `/pagar` | `PagarPage` | Placeholder |
| `/receber` | `ReceberPage` | Placeholder |
| `/configuracao` | `ConfiguracaoPage` | Placeholder |

**Páginas usam `slug` para identificar o módulo** (não moduleId numérico). Props: `slug="platforms"`, `slug="tenants"`, `slug="modules"`, `slug="people"`. Títulos passados via prop `title`.

### Componentes Genéricos

#### GenericGrid (`generic-grid.tsx`)

- Recebe `slug` + `title` + `columns` + `modalComponent` — tudo reutilizável
- Colunas configuráveis: `key`, `label`, `sortable`, `type` (text/date/datetime/boolean/badge/currency), `render` (customizado)
- Colunas padrão: drag handle, checkbox, id, active — toggle via props
- Ações por linha via `GridActions`: show, edit, delete, restore
- Agrupamento simples e duplo (`groupByCompute` para dois níveis)
- Modal de pesquisa com filtros padrão + filtros específicos do módulo
- Paginação, export (PDF/Excel), ações em massa, empty state

**Drag & Drop (reordenação):**
- Botão "Reordenar" — toggle ao lado de Pesquisar (visível quando `showDrag=true`). ON: sort muda para `order desc`, drag habilita, botão vira "Reordenando" (variant primary). OFF: restaura sort anterior, drag desabilita. Colunas ficam sem sort clicável durante reorderMode.
- Modo flat (`!groupBy && showDrag && reorderMode`): `DndContext` + `FlatDndTable` — uma zona por página
- Modo agrupado (`groupBy && showDrag && reorderMode`): `GroupedDndSection` por grupo — cada grupo é uma zona independente
- `!reorderMode`: tabela simples sem DnD (flat ou agrupada)
- Update otimístico: `setData` local imediato → PUTs em background apenas dos itens que mudaram de order → `fetchData` só no erro (rollback)
- **Prop `onReorder?: () => void`**: callback chamado após os PUTs completarem com sucesso no backend. Usado por `PlatformsPage` (`refreshPlatforms`) e `ModulesPage` (`refreshModules`) para sincronizar providers.
- DragHandle, sensores e overlay importados de `lib/dnd-config.tsx` (não definidos localmente)

#### DnD centralizado (`lib/dnd-config.tsx`)

Arquivo único para toda lógica de drag & drop. Consumido por `generic-grid.tsx` e `module-fields-tab.tsx`.

| Export | Descrição |
|--------|-----------|
| `useDndSensors()` | Hook — MouseSensor (distance:8) + TouchSensor (delay:200, tolerance:5) |
| `dndAccessibility` | Objeto `{ container: document.body }` |
| `DndOverlayPortal` | Componente — `DragOverlay` via `createPortal(document.body)`, `dropAnimation={null}` |
| `SortableRowCtx` | React context `{ attributes, listeners, isDragging } \| null` |
| `useSortableRow(id)` | Hook — `useSortable` + CSS.Transform + `animateLayoutChanges: () => false` |
| `DragHandle` | Componente — lê `SortableRowCtx`; prop `disabled`; Tooltip "Arrastar" |

Consumidores:

| Arquivo | Modo | Tela |
|---------|------|------|
| `generic-grid.tsx` | Flat (FlatDndTable, DndSortableRow) | Plataformas, Tenants, Pessoas |
| `generic-grid.tsx` | Grouped (GroupedDndSection, GroupedSortableRow) | Módulos (grid) |
| `module-fields-tab.tsx` | Fields (FieldTableRow + SystemFieldRow com useSortableRow) | Módulos (aba Campos) |

Regras:
- Todos `DndContext` usam `useDndSensors()` + `dndAccessibility`
- Todos `DragOverlay` usam `DndOverlayPortal`
- Todos `DragHandle` vêm de `dnd-config.tsx`
- Nenhum `useSortable` direto — sempre usar `useSortableRow`

#### GenericModal (`generic-modal.tsx`)

- 5 modos: create, edit, show, delete, restore
- Tamanhos: p (max-w-sm), m (max-w-lg), g (max-w-4xl)
- Props: slug, record, onGetData, onErrors, saveDisabled, tabs/children
- Comportamento `after_*` do módulo (index/show/create/edit)
- Switch ativo/inativo no footer

#### GridActions (`grid-actions.tsx`)

Botões: Visualizar (Eye), Editar (Pencil), Deletar (Trash2), Restaurar (RotateCcw)

#### IconPickerModal (`icon-picker-modal.tsx`)

1849 ícones Lucide, 27 categorias em PT, busca com debounce

### Módulos Implementados

#### ModulesPage — Grid agrupado + inline edit

- Grid com agrupamento simples por `type` (Módulo/Submódulo/Pivot)
- DnD dentro de grupos; `onReorder={refreshModules}` atualiza sidebar/navbar após reordenação
- Coluna `name`: renderiza ícone Lucide (campo `record.icon`) ao lado do nome do módulo
- Coluna `order` removida do grid (posição visual comunica a ordem)
- Filtro de pesquisa: apenas por Tipo (removido filtro Proprietário)
- Clique no nome → renderiza ModuleShowModal inline
- ModuleShowModal tabs: Dados ✅, Campos ✅, Layout ✅, Grid (futuro), Form (futuro), Restrições (futuro), Seeds (futuro)

**ModuleShowModal — aba Dados:**
- Header: botão "← Voltar" + `#ID` + Nome + badge Ativo/Inativo + badge Tipo (sem badge owner_level)
- Campos: Ícone, Nome, Tipo, Slug, URL Prefix, Customizado (switch `is_custom`)
- Quando `is_custom=true`: exibe selects de Model, Request, Controller, Observer, Service (populados via `scanFiles`)
- `scanFiles` disparado apenas quando `isCustom=true`
- Card "Configuração", "Ações de Comportamento" e "Descrições" removidos
- Card "Submódulos": grid 4 colunas (era 3); visível apenas quando type=module

**`ModuleShowModalProps`:** props `moduleId`, `parentName`, `parentIcon` removidas

**`ModuleForEdit` interface:** removidos owner_level, owner_id, size_modal, description_*, after_*, screen_*; adicionados is_custom (bool), observer (string), service (string); model/request/controller agora string (não nullable)

**`ModuleModal` (create/edit rápido):**
- Removido select "Proprietário"; adicionado Switch "Customizado" (`is_custom`)
- Quando `is_custom=true`: exibe inputs para Model, Request, Controller, Observer, Service
- Quando `is_custom=false`: payload envia Generic* para todos os campos de classe

**`ModuleFieldsTab` (aba Campos):**
- Interface `FieldForEdit` (ex-`FieldRow`): removidos label, precision, required, min, max, fk_label, auto_from, auto_type, main, is_custom, owner_level, owner_id; adicionado is_system; id agora `number | null`
- Tipos em minúsculo: `string`, `text`, `integer`, `bigint`, `boolean`, `date`, `datetime`, `decimal`, `enum`
- `NO_LENGTH_TYPES`: text, boolean, date, datetime, integer, bigint (sem campo Tamanho)
- Colunas da tabela: Nome | Tipo | Tamanho | Nulo | Default | Único | Índice | FK | (delete)
  - Removidas colunas "Obrigatório" e "Ativo"; adicionada coluna "FK" (exibida apenas para bigint)
  - `length` agora campo texto livre (ex: `255` ou `10,2`)
- Novo componente `SystemFieldRow`: linha read-only (sem drag, sem delete, fundo muted) para campos `is_system=true`
- Layout: `systemTopFields` (id) → `nonSystemIds` (DnD) → `systemBottomFields` (order, active, timestamps)
- Delete: qualquer campo não-system pode ser deletado (removida guarda `isCustom`)
- `handleAdd()`: novo campo com `order = maxOrder(nonSystem) + 1`
- `FkModal`: removido campo `fk_label`; `onConfirm` retorna `(table, column)` apenas
- **Botão "Gerar Tabela"** no header da tab: ícone Database, chama `GET /v1/modules/{id}/table-status` ao abrir
- **Badge de status** ao lado do botão: "Verificando tabela…" (loading) | "Tabela não existe" (vermelho) | "N pendentes" (amarelo) | "Sincronizado" (verde)
- **`GenerateTableModal`** (max-w-lg): 3 estados visuais:
  - `table_exists=false` → lista de campos a criar em verde + botão "Criar Tabela"
  - `has_pending_changes=true` → lista com ícones + cores por status (+ verde / △ amarelo / × vermelho) + seção "Alterações de risco" com checkbox de confirmação quando `dangerous_changes` presente
  - synced → ✓ "A tabela está sincronizada" + botão "Fechar"
- `fetchTableStatus()`: disparado no mount + ao abrir modal; re-executa após geração bem-sucedida
- `handleGenerateTable()`: POST com `{ confirm_dangerous }` → `toast.success` / `toast.error`
- `TableStatus` interface: `{ table_exists, table_name, changes: TableStatusChange[], has_pending_changes, dangerous_changes: DangerousChange[] }`

**`ModuleLayoutTab` (aba Layout) — `pages/modules/components/module-layout-tab.tsx`:**
- Prop: `moduleId: number` (para uso futuro na API)
- Sidebar esquerda colapsável (w-56 / w-10): catálogo de componentes ou painel de propriedades do selecionado
- Catálogo: 10 componentes com ícones Lucide — Grid (LayoutGrid), Form (FormInput), Card (Square), Texto (Type), Botões (MousePointer), Container (Box), Abas (Layers), Gráfico (BarChart2), Imagem (Image), Divisor (Minus)
- Painel de propriedades: selects, inputs, número e toggles por tipo de componente
- Page tabs: 9 subabas — Index, Show, Create, Edit, Delete, Restore, Print, Dashboard, Pública
- Stage: área com fundo xadrez; clique em componente adiciona ao stage; item selecionado recebe ring azul
- Ações da toolbar: **Preview** | **Fullscreen** (Maximize2/Minimize2 — toggle `fixed inset-0 z-50 bg-white`) | **Salvar** (feedback "✓ Salvo" por 2s)
- Sem header simulado — usa header/tabs do `ModuleShowModal`

#### PlatformsPage / TenantsPage — Grid + CRM modal

- Grid com filtro de validade
- CRM modal (max-w-6xl): header com badges + tabs (Visão Geral + futuras)
- 3 cards de credenciais (Sandbox/Produção/Log) com senhas sob demanda
- Validação de slug em tempo real
- `PlatformsPage`: `onReorder={refreshPlatforms}` atualiza o Platform Selector do header após drag
- `TenantModal` / `TenantShowModal`: campo slug exibe prefixo `{platform.slug}_` via `InputGroup + InputAddon` (carrega slug da plataforma selecionada)
- `PlatformModal`: prop `moduleId` é opcional; aceita prop `slug` diretamente

#### PessoasPage — Grid + CRM modal

- Grid com filtro de aniversário (birth_month_day_from/to)
- CRM modal (max-w-4xl): Nome + Data de Nascimento

### Providers

#### ModulesProvider

Carrega módulos `type=module` ativos. Usado pelo sidebar dinâmico.
- `modules`, `loading`, `refreshModules()`
- Hook: `useModules()`

#### PlatformProvider

Centraliza lista de plataformas e plataforma selecionada.
- `platforms`, `selectedPlatform`, `selectPlatform()`, `refreshPlatforms()`
- Busca: `/v1/platforms?per_page=100&sort=order&direction=desc`
- Guarda de autenticação: `useAuth()` — fetch só dispara quando `auth?.access_token` existe (mesmo padrão do ModulesProvider)

### Sandbox Banner (`components/sandbox-banner.tsx`)

- Faixa de aviso no topo do site quando em ambiente sandbox (detectado via `isSandbox()`)
- CSS variable `--banner-height`: `0px` por padrão, `36px` quando sandbox ativo
- `Demo3Layout`: usa `useEffect` para setar `--banner-height` no `document.documentElement`; header, navbar e sidebar ajustam `top` via `calc(var(--header-height) + var(--banner-height))`; `pt-` do wrapper principal também compensado
- Auth layouts (`branded.tsx`, `classic.tsx`): renderizam `<SandboxBanner />` quando `isSandbox()`

### Sidebar e Navbar

- Sidebar dinâmico via `useModules()` — ícone dinâmico via `DynamicIcon` (lucide-react)
- Item fixo "Dashboard" sempre primeiro
- Navbar: dropdown Dashboard com módulos dinâmicos
- Platform Selector: dropdown no header (visível apenas em master)

### Tenant Detection (`lib/tenant.ts`)

- `getUrlTenantSlug()` — detecta pelo subdomínio da URL
- `getTenantSlug()` — alias direto
- `getPlatformSlug()` — lê `VITE_PLATFORM_SLUG`
- `isSandbox()` — detecta `.sandbox.` na URL

### API Client (`lib/api.ts`)

- `apiFetch`, `apiGet`, `apiPost`, `apiPut`, `apiDelete`
- Headers automáticos: X-Tenant, X-Platform, X-Sandbox
- URL fixa via `VITE_API_URL`

### Vite Config

```ts
server: { host: '0.0.0.0', port: 5173, https: false, allowedHosts: ['.tc.test', 'tc.test'] }
```

---

## Page Builder (em desenvolvimento)

**Localização:** Aba "Layout" no ModuleShowModal (inline + dialog). 9 subabas: Index, Show, Create, Edit, Delete, Restore, Print, Dashboard, Pública.

**Implementado:** UI base do builder — sidebar colapsável com catálogo + properties panel, stage com xadrez, page tabs, toolbar (Preview/Fullscreen/Salvar). Arquivo: `frontend/src/pages/modules/components/module-layout-tab.tsx`.

**Layout:** 3 colunas — Componentes (~15%) | Stage (~60%) | Painel (~25%)

**6 componentes iniciais:** Container, Grid, Form, Cards, Btns, Texto.

**Banco:** `module_components` (catálogo de tipos, hardcode) + `module_pages` (árvore JSON por módulo).

**Decisões técnicas:**
1. Permissões por pessoa + método do módulo, sem granularidade por componente
2. Visibility_rules + unique_check nas propriedades do componente
3. after_action no componente Btn
4. Múltiplos forms independentes por página
5. Página pública com SEO (title, description, og:image)
6. Mobile: tudo span 12 automático
7. Layout fixo Demo3, sem herança
8. Sem templates — cada página configurada individualmente
9. Validação cruzada: futuro
10. custom_classes em todo componente

**Extras:** Btns com lookup inline, grid referenciando outro módulo, on_change_action em selects.

**Estimativa:** ~35-45h.

---

## Deploy

5 comandos: `/docs`, `/merge`, `/deploy`, `/merge-production`, `/deploy-production`.

Branches protegidas: main, sandbox, production. Fluxo: feature → main → sandbox → production.

**SSH:** alias `twoclicks` → `root@168.231.64.36` (configurado em `~/.ssh/config`)

**Estrutura no servidor:**
```
/var/www/tc/
├── sand/          ← branch sandbox
│   └── frontend/
└── prod/          ← branch production
    └── frontend/
```

**Obs:** `npm install` no servidor requer `--legacy-peer-deps` (conflito `react-helmet-async@2` + React 19).

---

## Atualização Bottom-Up (conceito, não implementado)

Nada de cascata. Cada nível puxa atualizações ao acessar. Copia prod → sand, aplica, testa, passou → aplica no prod, falhou → notifica admin.

---

## Módulo Produtos (conceitual, não implementado)

Definido para SmartClick360°. 1 produto = 1 fornecedor. Mesmo item com fornecedores diferentes = cadastros separados.

**Tabelas auxiliares:** unit_measures, product_types, brands, product_families (N:N), product_groups (N:N).

**Tabela products:** dados básicos, estoque, preços de compra (cálculos bidirecionais), dimensões (peso cubado).

**Tabelas de preço:** product_price, product_price_table, product_price_discounts.

**Recálculo automático:** quando Reposição muda, recalcula todas as tabelas pela Margem%.

Total: 11 tabelas no módulo de produtos.

---

## Convenções Gerais

- Português para nomes de campos e labels de interface
- Inglês para nomes de variáveis, classes, métodos e arquivos de código
- Sempre usar `softDeletes` em todas as tabelas
- `active` é booleano, padrão `true`
- `order` é inteiro, padrão `1`, usado para drag & drop de ordenação
- Nunca criar rotas ou controllers de CRUD específicos — tudo via `ModuleController` genérica
- Páginas usam `slug` para referenciar módulos (não IDs numéricos)