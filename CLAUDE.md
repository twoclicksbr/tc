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

---

## Padrão de Tabelas

Todas as tabelas seguem a ordem de colunas:

```
id → campos específicos → order (default 1) → active (default true) → timestamps → deleted_at (softDeletes)
```

---

## Estrutura de Tabelas

### Principais

| Tabela | Campos |
|--------|--------|
| `people` | name, birth_date, order, active |
| `users` | person_id (FK people), email, password, active |

### Configuração

| Tabela | Campos |
|--------|--------|
| `modules` | name, type (módulo/submódulo), name_table (unique), name_url (unique), model, request, controller_front, controller_back, description_index, description_show, description_store, description_update, description_delete, description_restore, after_store, after_update, after_restore, active, order |

Campos `after_*` são combobox com opções: `index`, `show`, `create`, `edit`.

### Tabelas de Tipo (referência)

| Tabela | Campos |
|--------|--------|
| `type_documents` | name, mask, order, active |
| `type_contacts` | name, mask, order, active |
| `type_addresses` | name, order, active |

### Submódulos (reutilizáveis via module_id + register_id)

| Tabela | Campos |
|--------|--------|
| `notes` | module_id, register_id, name, content, order, active |
| `files` | module_id, register_id, name, slug, path, size, type, order, active |
| `documents` | type_document_id, module_id, register_id, value, expiration_date, order, active |
| `contacts` | type_contact_id, module_id, register_id, value, order, active |
| `addresses` | type_address_id, module_id, register_id, zip_code, street, number, complement, neighborhood, city, state, country, order, active |

**Total MVP: 11 tabelas**

---

## Padrão de Desenvolvimento

### Controller Genérica

Uma única `ModuleController` resolve o CRUD de qualquer módulo. Ela busca as configurações na tabela `modules` (model, request, etc.) e executa dinamicamente. Somente em casos extremos se cria uma controller específica.

### Rota Genérica

`{module}` corresponde ao `name_url` da tabela `modules`. Uma única rota atende módulos e submódulos.

### Configuração de Módulo

Os campos `model`, `request`, `controller_front` e `controller_back` são combobox que fazem scan das respectivas pastas e listam os arquivos disponíveis.

**Para criar um novo módulo:**
1. Criar migration, model, request, controller
2. Cadastrar o módulo na tela de modules selecionando os arquivos nos combos

Sem mexer em rotas, sem criar controller de CRUD. Tudo dinâmico.

---

## Fluxo de Desenvolvimento por Módulo

| Fase | Descrição |
|------|-----------|
| **Fase 1** | Criar migration, model, request, controller |
| **Fase 2** | Montar rotas |
| **Fase 3** | Login + tela |
| **Fase 4** | Dashboard demonstração |
| **Fase 5** | Tela padrão index (grid) |
| **Fase 5.1** | Tela show/create/edit/delete/restore (página inteira) |
| **Fase 5.2** | Tela show/create/edit/delete/restore (modal) |
| **Fase 6** | Tela people |

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
