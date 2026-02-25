# CLAUDE.md — sc360-valsul (Auto Peças)

> MVP em andamento. Novas features e módulos serão adicionados conforme a evolução do projeto.

---

## Equipe

- **Gerentes de Projeto** — Usuário + Claude (claude.ai) → planejamento, escopo, arquitetura, specs
- **Executor / Programador** — Claude Code → implementação, código, commits

## Regras do Chat (claude.ai)

- Não usar caixas de perguntas (widgets de seleção). Sempre perguntar em texto direto.

## Repositório

- **GitHub:** https://github.com/twoclicksbr/sc360-valsul.git
- **CLAUDE.md (raw):** https://raw.githubusercontent.com/twoclicksbr/sc360-valsul/refs/heads/main/CLAUDE.md

---

## Sobre o Projeto

Sistema simples de gerenciamento para loja de auto peças, desenvolvido em **Laravel + JavaScript**. O objetivo é ter um sistema funcional em 20 dias, começando pelo cadastro de pessoas, autenticação e submódulos reutilizáveis.

---

## Stack

- **Backend:** Laravel 12 (API)
- **Frontend:** React 19 + TypeScript + Vite (Metronic v9.4) + Tailwind CSS 4
- **Banco de dados:** PostgreSQL
- **Ambiente local:** Laravel Herd
- **Documentação API:** Scribe

---

## Backend (Laravel)

### Documentação da API

- **URL local:** https://sc360.test/docs
- **Regenerar:** `php artisan scribe:generate`

### Padrão de Tabelas

Todas as tabelas seguem a ordem de colunas:

```
id → campos específicos → order (default 1) → active (default true) → timestamps → deleted_at (softDeletes)
```

### Estrutura de Tabelas

#### Principais

| Tabela | Campos |
|--------|--------|
| `people` | name, birth_date, order, active |
| `users` | person_id (FK people), email, password, active |

#### Configuração

| Tabela | Campos |
|--------|--------|
| `modules` | name, type (módulo/submódulo), name_table (unique), name_url (unique), model, request, controller_front, controller_back, description_index, description_show, description_store, description_update, description_delete, description_restore, after_store, after_update, after_restore, active, order |

Campos `after_*` são combobox com opções: `index`, `show`, `create`, `edit`.

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

Controller: `AuthController` — rotas públicas e protegidas por `auth:sanctum`.

| Método | URL | Descrição | Auth |
|--------|-----|-----------|------|
| POST | `api.{domínio}/valsul/auth/login` | Login → retorna token + user | Público |
| POST | `api.{domínio}/valsul/auth/logout` | Logout → revoga token atual | Bearer |
| GET | `api.{domínio}/valsul/auth/me` | Retorna usuário autenticado com `person` | Bearer |

Resposta do login:
```json
{ "token": "1|abc...", "user": { "id": 1, "email": "...", "active": true, "person": { "id": 1, "name": "..." } } }
```

### CORS (`config/cors.php`)

| Chave | Valor |
|-------|-------|
| `paths` | `['api/*', 'valsul/*', 'sanctum/csrf-cookie']` |
| `allowed_methods` | `['*']` |
| `allowed_origins` | `['http://sc360.test:5173', 'http://localhost:5173']` |
| `allowed_headers` | `['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']` |
| `supports_credentials` | `true` |

### Padrão de Desenvolvimento

#### Controller Genérica

Uma única `ModuleController` resolve o CRUD de qualquer módulo. Ela busca as configurações na tabela `modules` (model, request, etc.) e executa dinamicamente. Somente em casos extremos se cria uma controller específica.

#### Rota Genérica

`{module}` corresponde ao `name_url` da tabela `modules`. Uma única rota atende módulos e submódulos.

Padrão de URL: `api.{domínio}/valsul/{module}` e `api.{domínio}/valsul/{module}/{id}`

As rotas da API estão restritas ao subdomínio `api` via `env('API_DOMAIN')` (ex: `api.sc360.test`). O `apiPrefix` está vazio — sem prefixo `/api` no path, apenas no subdomínio.

#### Configuração de Módulo

Os campos `model`, `request`, `controller_front` e `controller_back` são combobox que fazem scan das respectivas pastas e listam os arquivos disponíveis.

**Para criar um novo módulo:**
1. Criar migration, model, request, controller
2. Cadastrar o módulo na tela de modules selecionando os arquivos nos combos

Sem mexer em rotas, sem criar controller de CRUD. Tudo dinâmico.

---

## Frontend (Metronic React)

- **Pasta:** `frontend/`
- **Versão:** Metronic v9.4.5 — React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- **Layout de referência:** `C:\Herd\themeforest\metronic\crm`
- **URL local:** http://sc360.test:5173
- **Auth:** Laravel Sanctum ✅ — adapter e provider implementados e em uso
- **Status:** instalado, rodando em dev
- **Layout em uso:** `Demo3Layout` (`frontend/src/layouts/demo3/`)
- **Provider de auth em uso:** `AuthProvider` de `frontend/src/auth/providers/laravel-provider.tsx` (importado em `App.tsx`)
- **Providers em uso em `App.tsx`:** `AuthProvider`, `SettingsProvider`, `ThemeProvider`, `I18nProvider`, `TooltipsProvider`, `QueryProvider`, `ModulesProvider`

### Variáveis de Ambiente (`frontend/.env`)

```env
VITE_APP_NAME=metronic-tailwind-react
VITE_APP_VERSION=9.2.6

## Laravel API
VITE_API_URL=http://api.sc360.test

## Supabase Configuration (placeholder — não utilizado)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Auth (Laravel Sanctum) — estrutura em `frontend/src/auth/`

| Arquivo | Descrição |
|---------|-----------|
| `adapters/laravel-adapter.ts` | Adapter Laravel — login/logout/me via `VITE_API_URL` |
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
├── components/           ← componentes reutilizáveis
├── config/               ← configurações do app
├── css/                  ← estilos globais
├── errors/               ← páginas de erro (404, etc.)
├── hooks/                ← hooks customizados
├── i18n/                 ← internacionalização
├── layouts/              ← demo1..demo10 (em uso: demo3)
├── lib/                  ← supabase.ts e utilitários
├── pages/                ← páginas por módulo (dashboard/, pessoas/, produtos/, compras/, vendas/, financeiro/, pagar/, receber/, configuracao/)
├── partials/             ← partes reutilizáveis de UI
├── providers/            ← providers React (tema, i18n, etc.)
└── routing/              ← app-routing.tsx, app-routing-setup.tsx
```

### Rotas Frontend (`frontend/src/routing/app-routing-setup.tsx`)

Todas as rotas do projeto ficam dentro de `<RequireAuth>` + `<Demo3Layout>`.

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Navigate to="/dashboard"` | Redireciona para dashboard |
| `/dashboard` | `DashboardPage` | Dashboard geral (placeholder) |
| `/pessoas` | `PessoasPage` | Cadastro de pessoas (placeholder) |
| `/produtos` | `ProdutosPage` | Produtos (placeholder) |
| `/compras` | `ComprasPage` | Compras (placeholder) |
| `/vendas` | `VendasPage` | Vendas (placeholder) |
| `/financeiro` | `FinanceiroPage` | Financeiro (placeholder) |
| `/pagar` | `PagarPage` | Contas a pagar (placeholder) |
| `/receber` | `ReceberPage` | Contas a receber (placeholder) |
| `/configuracao` | `ConfiguracaoPage` | Configurações (placeholder) |

### Navbar (`frontend/src/layouts/demo3/components/navbar-menu.tsx`)

O menu horizontal do Demo3 tem um item fixo "Dashboard" como primeiro item (hardcoded no componente), seguido dos itens dinâmicos do `MENU_SIDEBAR[3]` (Account, Billing, Security, etc. — legado Metronic).

**Dropdown Dashboard:**
- Geral → `/dashboard`
- Pessoas → `/pessoas`
- Produtos → `/produtos`
- Comercial → `/comercial`
- Financeiro → `/financeiro`

### Vite Config (`frontend/vite.config.ts`)

```ts
server: { host: 'sc360.test', port: 5173, https: false }
```

---

## Fluxo de Desenvolvimento por Módulo

| Fase | Descrição |
|------|-----------|
| **Fase 1** | Criar migration, model, request, controller (modules, people, users) ✅ |
| **Fase 2** | Montar rotas (routes/api.php com prefixo `valsul/{module}`, sem prefixo /api) ✅ |
| **Fase 3** | Login + tela — backend ✅ (AuthController + Sanctum) / frontend ✅ (laravel-adapter.ts + laravel-provider.tsx implementados) |
| **Fase 4** | Dashboard demonstração — placeholder criado (`/dashboard`, página "Em desenvolvimento") ✅ |
| **Fase 5** | Tela padrão index (grid) |
| **Fase 5.1** | Tela show/create/edit/delete/restore (página inteira) |
| **Fase 5.2** | Tela show/create/edit/delete/restore (modal) |
| **Fase 6** | Tela people |
| **Fase 7** | Criar migration, model, request, controller das tabelas restantes (type_documents, type_contacts, type_addresses, notes, files, documents, contacts, addresses) |

---

## Fase 5 — Tela Index (Grid)

- Colunas: btn order (drag & drop), checkbox, id, campos do módulo, active (badge success/danger), ações (show/create/edit/delete/restore)
- Paginação — exibida somente quando necessário
- Order by — clique no cabeçalho da coluna
- Ações em massa — ativar/desativar via checkboxes
- Btn novo — sempre abre modal
- Btn pesquisar — abre modal com campos do módulo, ignora campos vazios na URL

---

## Fase 5.2 — Modal CRUD (Padrão)

**Tamanhos:** `p`, `m`, `g` (definido por variável na index)

**Estrutura:**
- **Header esquerda:** label da ação (Criando / Alterando / Visualizando / Restaurando registro)
- **Header direita:** btn X (`btn-sm btn-light-danger`)
- **Content linha 1:** campos do módulo
- **Content linha 2:** Criado em: dd/mm/yyyy | Alterado em: dd/mm/yyyy | Deletado em: dd/mm/yyyy (`text-danger`, só aparece se soft deleted)
- **Footer esquerda:** switch ativo/inativo
- **Footer direita:** botões conforme ação

**Regras por ação:**

| Ação | Campos | Switch | Botões |
|------|--------|--------|--------|
| Create | editáveis | ativo | cancelar + salvar |
| Edit | editáveis | ativo | cancelar + salvar |
| Show | readonly | — | cancelar |
| Delete | readonly | — | deletar + cancelar |
| Restore | readonly → edit | ativo | cancelar + salvar |

**Regras extras:**
- Ao deletar, `active` é setado para `false` automaticamente
- Ao restaurar, modal muda para modo edit
- Existe um único componente modal reutilizável para todos os módulos — não criar outros modais de CRUD salvo casos extremamente necessários

**Submódulos no modal:**
- Módulos com submódulos (documentos, contatos, endereços, notas, arquivos) usam modal `G` com tabs
- Primeira tab: dados principais
- Demais tabs: submódulos
- Módulos sem submódulos usam o modal padrão sem tabs

---

## Convenções Gerais

- Português para nomes de campos e labels de interface
- Inglês para nomes de variáveis, classes, métodos e arquivos de código
- Sempre usar `softDeletes` em todas as tabelas
- `active` é booleano, padrão `true`
- `order` é inteiro, padrão `1`, usado para drag & drop de ordenação
- Nunca criar rotas ou controllers de CRUD específicos — tudo via `ModuleController` genérica
