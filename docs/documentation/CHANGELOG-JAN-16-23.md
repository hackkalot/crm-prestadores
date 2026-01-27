# Changelog - 16 a 23 de Janeiro 2026

Levantamento estruturado de todas as funcionalidades desenvolvidas desde 16 de Janeiro de 2026.

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Período** | 16-23 Janeiro 2026 |
| **Total de Commits** | 14 |
| **Novas Funcionalidades** | 8 |
| **Melhorias/Refactoring** | 4 |
| **Documentação** | 2 |

---

## Timeline de Desenvolvimento

### 📅 16 Janeiro 2026

#### 1. Correcções TypeScript e Restauro de Funcionalidades
- **Commit**: `d95e856`
- **Descrição**: Resolução de erros de build TypeScript e restauro do tab "Angariação" nas configurações

#### 2. Sistema de Formulários para Prestadores (Fase 1)
- **Commit**: `3fb0ac5`
- **Descrição**: Infraestrutura base para formulários de serviços de prestadores
- **Ficheiros principais**:
  - Criação de tabelas: `provider_forms`, `form_submissions`
  - API routes para gestão de tokens
  - Páginas públicas de formulário

#### 3. Sistema de Propostas de Preços (Fase 1)
- **Commit**: `57f3ae8`
- **Descrição**: Sistema completo de formulários para prestadores e propostas de preços
- **Funcionalidades**:
  - Formulário público para prestadores submeterem serviços
  - Sistema de tokens únicos para acesso seguro
  - Fluxo de submissão e aprovação

---

### 📅 20 Janeiro 2026

#### 4. Major Cleanup e Melhorias no Sistema de Formulários
- **Commit**: `6ddfa89`
- **Descrição**: Refactoring significativo e melhorias no sistema de formulários
- **Alterações**:
  - Limpeza de código duplicado
  - Optimização de queries
  - Melhoria na UX dos formulários

#### 5. Alteração de Schedule dos Scrapers
- **Commit**: `6b9b850`
- **Descrição**: Mudança dos scrapers de execução diária para semanal (segundas-feiras)
- **Impacto**: Redução de custos e carga no backoffice

---

### 📅 21 Janeiro 2026

#### 6. Documentação de Componentes
- **Commit**: `147b0eb`
- **Descrição**: Adição de documentação técnica para componentes UI
- **Ficheiros**: Nova documentação em `docs/documentation/`

---

### 📅 22 Janeiro 2026

#### 7. Documentação de Segurança
- **Commit**: `80481c4`
- **Descrição**: Documentação completa de segurança com diagramas Mermaid
- **Novos ficheiros**:
  - `docs/documentation/07-SEGURANCA.md`
  - `docs/documentation/diagrams/security/attack-prevention.md`
  - `docs/documentation/diagrams/security/rls-policies.md`
- **Conteúdo**:
  - Políticas RLS (Row Level Security)
  - Prevenção de ataques
  - Autenticação e autorização
  - Fluxos de segurança com diagramas

#### 8. Sistema de Permissões Dinâmicas
- **Commit**: `61e7323`
- **Descrição**: Implementação de sistema de permissões granular e reestruturação do sidebar
- **Funcionalidades**:
  - Permissões por recurso (providers, candidaturas, pedidos, etc.)
  - Níveis: none, read, write, admin
  - Sidebar dinâmico baseado em permissões do utilizador
  - Nova tabela `user_permissions`
- **Ficheiros principais**:
  - `src/lib/permissions/actions.ts`
  - `src/components/layout/dynamic-sidebar.tsx`
  - `src/app/(dashboard)/configuracoes/permissoes/page.tsx`

#### 9. Pesquisa Fuzzy Client-Side com SWR Caching
- **Commit**: `53ffa83`
- **Descrição**: Sistema de pesquisa instantânea com cache inteligente
- **Funcionalidades**:
  - Pesquisa fuzzy em memória (Fuse.js)
  - Cache SWR para dados de prestadores
  - Pesquisa instantânea sem latência de rede
  - Debounce automático
- **Ficheiros principais**:
  - `src/lib/search/fuzzy-search.ts`
  - `src/hooks/use-providers-search.ts`
  - API route para lista de prestadores

#### 10. Sistema de Email Templates
- **Commit**: `0e5e396`
- **Descrição**: Sistema completo de templates de email com integração em tarefas
- **Funcionalidades**:
  - CRUD de templates de email
  - Editor Rich Text (Tiptap)
  - Variáveis dinâmicas: `{{nome_prestador}}`, `{{email_prestador}}`, `{{forms_link}}`, etc.
  - Sintaxe especial: `{{forms_link:Texto Customizado}}`
  - Associação template-tarefa
  - Botão de email nas tarefas de onboarding
- **Novos ficheiros**:
  - `src/lib/email-templates/actions.ts`
  - `src/lib/email-templates/utils.ts`
  - `src/components/settings/email-templates-settings.tsx`
  - `src/components/ui/rich-text-editor.tsx`
  - Migration: `email_templates` table
- **Documentação**: `docs/documentation/diagrams/flows/email-templates-flow.md`

---

### 📅 23 Janeiro 2026

#### 11. Actualizações de Documentação
- **Commit**: `11d3129`
- **Descrição**: Várias actualizações de documentação e melhorias menores
- **Alterações**:
  - Actualização do diagrama catálogo de serviços
  - Novas API routes auxiliares
  - CLAUDE.md actualizado

#### 12. Sistema de Propostas de Preços com PDF
- **Commit**: `bbf7b6b`
- **Descrição**: Sistema completo de propostas de preços com geração de PDF e histórico
- **Funcionalidades**:
  - Geração de propostas de preços
  - Exportação para PDF
  - Histórico de propostas
  - Aprovação/rejeição de propostas

---

## Funcionalidades por Categoria

### 🔐 Segurança e Permissões

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Sistema de permissões dinâmicas | `61e7323` | 22 Jan |
| Documentação de segurança | `80481c4` | 22 Jan |
| Políticas RLS documentadas | `80481c4` | 22 Jan |

### 📧 Comunicação

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Sistema de email templates | `0e5e396` | 22 Jan |
| Editor Rich Text (Tiptap) | `0e5e396` | 22 Jan |
| Variáveis dinâmicas em emails | `0e5e396` | 22 Jan |
| Integração email-tarefa | `0e5e396` | 22 Jan |

### 📝 Formulários e Propostas

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Infraestrutura de formulários | `3fb0ac5` | 16 Jan |
| Sistema de propostas de preços | `57f3ae8` | 16 Jan |
| Geração de PDF de propostas | `bbf7b6b` | 23 Jan |
| Histórico de propostas | `bbf7b6b` | 23 Jan |

### 🔍 Pesquisa e Performance

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Pesquisa fuzzy client-side | `53ffa83` | 22 Jan |
| Cache SWR | `53ffa83` | 22 Jan |

### 🖥️ Interface e UX

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Sidebar dinâmico | `61e7323` | 22 Jan |
| Reestruturação de navegação | `61e7323` | 22 Jan |

### 📚 Documentação

| Funcionalidade | Commit | Data |
|----------------|--------|------|
| Documentação de componentes | `147b0eb` | 21 Jan |
| Documentação de segurança | `80481c4` | 22 Jan |
| Diagramas Mermaid | `80481c4` | 22 Jan |
| Flow de email templates | `0e5e396` | 22 Jan |

---

## Novas Tabelas de Base de Dados

| Tabela | Descrição | Commit |
|--------|-----------|--------|
| `user_permissions` | Permissões granulares por utilizador | `61e7323` |
| `email_templates` | Templates de email com variáveis | `0e5e396` |
| `provider_forms` | Formulários de serviços de prestadores | `3fb0ac5` |
| `form_submissions` | Submissões de formulários | `3fb0ac5` |
| `pricing_proposals` | Propostas de preços | `57f3ae8` |
| `pricing_proposal_history` | Histórico de propostas | `bbf7b6b` |

---

## Novos Componentes UI

| Componente | Descrição | Localização |
|------------|-----------|-------------|
| `RichTextEditor` | Editor Tiptap para emails | `src/components/ui/rich-text-editor.tsx` |
| `DynamicSidebar` | Sidebar com permissões | `src/components/layout/dynamic-sidebar.tsx` |
| `EmailTemplatesSettings` | CRUD de templates | `src/components/settings/email-templates-settings.tsx` |
| `PermissionsSettings` | Gestão de permissões | `src/components/settings/permissions-settings.tsx` |
| `PricingProposalPDF` | Geração de PDF | `src/components/pricing/proposal-pdf.tsx` |

---

## Novas API Routes

| Route | Método | Descrição |
|-------|--------|-----------|
| `/api/prestadores/request-counts` | GET | Contagem de pedidos por prestador |
| `/api/services/names` | GET | Lista de nomes de serviços |
| `/api/forms/[token]` | GET/POST | Acesso a formulários públicos |
| `/api/proposals/pdf` | POST | Geração de PDF de proposta |

---

## Métricas de Código

| Categoria | Ficheiros Modificados | Linhas Adicionadas |
|-----------|----------------------|-------------------|
| Funcionalidades | ~45 | ~4500 |
| Documentação | ~8 | ~800 |
| Migrações | ~6 | ~200 |
| **Total** | **~59** | **~5500** |

---

## Próximos Passos Sugeridos

1. **Testes** - Adicionar testes para o sistema de permissões e email templates
2. **Notificações** - Integrar envio de emails via serviço (Resend/SendGrid) em vez de mailto:
3. **Auditoria** - Implementar logging de acções sensíveis
4. **Mobile** - Optimizar sidebar para dispositivos móveis

---

*Documento gerado automaticamente em 23 Janeiro 2026*
