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

- **URL local:** https://sc360-valsul.test/docs
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

### Padrão de Desenvolvimento

#### Controller Genérica

Uma única `ModuleController` resolve o CRUD de qualquer módulo. Ela busca as configurações na tabela `modules` (model, request, etc.) e executa dinamicamente. Somente em casos extremos se cria uma controller específica.

#### Rota Genérica

`{module}` corresponde ao `name_url` da tabela `modules`. Uma única rota atende módulos e submódulos.

Padrão de URL: `api.{domínio}/valsul/{module}` e `api.{domínio}/valsul/{module}/{id}`

As rotas da API estão restritas ao subdomínio `api` via `env('API_DOMAIN')` (ex: `api.sc360-valsul.test`). O `apiPrefix` está vazio — sem prefixo `/api` no path, apenas no subdomínio.

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
- **URL local:** http://sc360-valsul.test:5173
- **Auth:** Supabase ainda ativo como adapter — substituição por Laravel Sanctum pendente (Fase 3)
- **Status:** instalado, rodando em dev
- **Layout em uso:** `Demo1Layout` (`frontend/src/layouts/demo1/`)
- **Provider de auth em uso:** `AuthProvider` de `frontend/src/auth/providers/supabase-provider.tsx` (importado em `App.tsx`)

### Variáveis de Ambiente (`frontend/.env`)

```env
VITE_APP_NAME=metronic-tailwind-react
VITE_APP_VERSION=9.2.6
VITE_SUPABASE_URL=your_supabase_url          # placeholder — não usado em produção
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# A adicionar:
# VITE_API_URL=http://api.sc360-valsul.test
```

### Auth atual (Supabase) — estrutura em `frontend/src/auth/`

| Arquivo | Descrição |
|---------|-----------|
| `adapters/supabase-adapter.ts` | Adapter Supabase (login, logout, register, OAuth, etc.) |
| `providers/supabase-provider.tsx` | AuthProvider — expõe `login`, `logout`, `getUser`, etc. via context |
| `context/auth-context.ts` | AuthContext + hook `useAuth()` |
| `lib/models.ts` | `AuthModel` (`access_token`, `refresh_token?`) e `UserModel` |
| `lib/helpers.ts` | getAuth/setAuth/removeAuth via localStorage |
| `require-auth.tsx` | HOC que redireciona para `/auth/signin` se não autenticado |

### Estrutura frontend/src/

```
src/
├── App.tsx               ← importa AuthProvider de supabase-provider
├── main.tsx
├── auth/                 ← providers, adapters, pages de login/register
│   ├── adapters/         ← supabase-adapter.ts (a criar: laravel-adapter.ts)
│   ├── context/          ← auth-context.ts + useAuth()
│   ├── forms/            ← signin-schema.ts, signup-schema.ts
│   ├── layouts/          ← branded.tsx, classic.tsx
│   ├── lib/              ← models.ts, helpers.ts
│   ├── pages/            ← signin-page.tsx, signup-page.tsx, etc.
│   ├── providers/        ← supabase-provider.tsx
│   ├── auth-routing.tsx
│   ├── auth-routes.tsx
│   └── require-auth.tsx
├── components/           ← componentes reutilizáveis
├── config/               ← configurações do app
├── css/                  ← estilos globais
├── errors/               ← páginas de erro (404, etc.)
├── hooks/                ← hooks customizados
├── i18n/                 ← internacionalização
├── layouts/              ← demo1..demo10 (em uso: demo1)
├── lib/                  ← supabase.ts e utilitários
├── pages/                ← páginas por módulo
├── partials/             ← partes reutilizáveis de UI
├── providers/            ← providers React (tema, i18n, etc.)
└── routing/              ← app-routing.tsx, app-routing-setup.tsx
```

---

## Fluxo de Desenvolvimento por Módulo

| Fase | Descrição |
|------|-----------|
| **Fase 1** | Criar migration, model, request, controller (modules, people, users) ✅ |
| **Fase 2** | Montar rotas (routes/api.php com prefixo `valsul/{module}`, sem prefixo /api) ✅ |
| **Fase 3** | Login + tela — backend ✅ (AuthController + Sanctum) / frontend pendente (substituir Supabase por Laravel adapter) |
| **Fase 4** | Dashboard demonstração |
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
