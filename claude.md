# CLAUDE.md - Guia de Desenvolvimento

Este ficheiro fornece contexto ao Claude Code para trabalhar eficazmente neste projeto.

## Visao Geral do Projeto

CRM interno para gestao de prestadores de servicos. Permite gerir candidaturas, onboarding, prestadores ativos, precos e cobertura de rede.

### Stack Tecnologico

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19
- **Linguagem**: TypeScript (strict mode)
- **Base de Dados**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS v4
- **Componentes UI**: Radix UI + shadcn/ui
- **Validacao**: Zod
- **Graficos**: Recharts
- **Drag & Drop**: dnd-kit

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento

# Build e Producao
npm run build        # Build para producao
npm run start        # Iniciar em producao
npm run lint         # Verificar ESLint

# Base de Dados (Supabase)
npm run db:generate  # Gerar tipos TypeScript a partir do schema (requer Docker)
npm run db:push      # Push de migracoes para Supabase
npm run db:reset     # Reset da base de dados local
```

### Regenerar Tipos da Base de Dados

O comando `npm run db:generate` requer Docker a correr localmente. Em alternativa, usa o Supabase remoto:

```bash
# Com Docker (local)
npm run db:generate

# Sem Docker (remoto) - usa o project ID do Supabase
npx supabase gen types typescript --project-id nyrnjltpyedfoommmbhs > src/types/database.ts
```

Os tipos sao gerados para `src/types/database.ts` e devem ser regenerados sempre que o schema da base de dados mudar (novas tabelas, colunas, etc.).

## Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js)
│   ├── (auth)/            # Rotas de autenticacao
│   ├── (dashboard)/       # Rotas protegidas do dashboard
│   │   ├── candidaturas/  # Gestao de candidaturas
│   │   ├── onboarding/    # Pipeline de onboarding (Kanban)
│   │   ├── prestadores/   # Lista de prestadores ativos
│   │   ├── pedidos/       # Pedidos de servico (importados do backoffice)
│   │   ├── providers/[id] # Detalhe de prestador (tabs)
│   │   ├── agenda/        # Calendario de tarefas
│   │   ├── kpis/          # Dashboard de metricas
│   │   ├── rede/          # Mapa de cobertura
│   │   └── configuracoes/ # Definicoes do sistema
│   └── api/               # API Routes
│       ├── webhooks/      # Webhooks externos (HubSpot)
│       └── alerts/        # Sistema de alertas
├── components/
│   ├── ui/                # Componentes base (shadcn/ui)
│   ├── candidaturas/      # Componentes de candidaturas
│   ├── onboarding/        # Kanban e tarefas
│   ├── prestadores/       # Listagens e filtros
│   ├── pedidos/           # Listagens e filtros de pedidos
│   ├── providers/         # Detalhe de prestador
│   ├── kpis/              # Graficos e metricas
│   ├── sync/              # Dialogo de sincronizacao com backoffice
│   └── layout/            # Header, navegacao
├── lib/
│   ├── supabase/          # Clientes Supabase (server/client/admin)
│   ├── candidaturas/      # Server actions de candidaturas
│   ├── onboarding/        # Server actions de onboarding
│   ├── prestadores/       # Server actions de prestadores
│   ├── providers/         # Server actions de providers
│   ├── pricing/           # Server actions de precos
│   ├── service-requests/  # Server actions de pedidos de servico
│   ├── sync/              # Server actions de sincronizacao
│   └── utils.ts           # Utilitarios (cn, etc.)
├── scripts/
│   └── export-backoffice-data.ts  # Scraper para importar dados do backoffice (Puppeteer)
└── types/
    └── database.ts        # Tipos gerados do Supabase
```

## Padroes de Codigo

### Server Actions

Todas as operacoes de dados usam Server Actions com `'use server'`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function myAction(formData: FormData) {
  const supabase = await createClient()

  // Verificar autenticacao
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Usar adminClient para operacoes que bypasam RLS
  const { data, error } = await createAdminClient()
    .from('table')
    .select('*')

  revalidatePath('/path')
  return { success: true }
}
```

### Componentes de Pagina (Server Components)

```typescript
import { Header } from '@/components/layout/header'
import { getCandidaturas } from '@/lib/candidaturas/actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const data = await getCandidaturas()

  return (
    <div className="flex flex-col h-full">
      <Header title="Titulo" description="Descricao" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Conteudo */}
      </div>
    </div>
  )
}
```

### Componentes UI (Client Components)

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  data: SomeType
  onAction?: () => void
}

export function MyComponent({ data, onAction }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={onAction}
    >
      Acao
    </Button>
  )
}
```

### Forms com useActionState

```typescript
'use client'

import { useActionState } from 'react'
import { myFormAction } from '@/lib/actions'

export function MyForm() {
  const [state, formAction, pending] = useActionState(myFormAction, {})

  return (
    <form action={formAction}>
      <input name="field" required />
      <Button type="submit" disabled={pending}>
        {pending ? 'A processar...' : 'Submeter'}
      </Button>
      {state.error && <p className="text-destructive">{state.error}</p>}
    </form>
  )
}
```

### Componentes UI Customizados

#### DatePicker e Calendar

Para selecao de datas, usar `DatePicker` do shadcn/ui (baseado em react-day-picker):

```typescript
import { DatePicker } from '@/components/ui/date-picker'

const [date, setDate] = useState<Date | undefined>()

<DatePicker
  value={date || null}
  onChange={(date) => setDate(date)}
  placeholder="Selecionar data"
/>
```

**Formato:** dd/MM/yyyy (locale pt-PT)
**Features:** Calendario popup, botao limpar, validacao de intervalos (fromDate/toDate)

## Tipos da Base de Dados

Os tipos sao gerados automaticamente com `npm run db:generate`:

```typescript
import type { Database } from '@/types/database'

// Tipos de tabelas
type Provider = Database['public']['Tables']['providers']['Row']
type ProviderInsert = Database['public']['Tables']['providers']['Insert']

// Enums
type ProviderStatus = Database['public']['Enums']['provider_status']
// Valores: 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado'

type TaskStatus = Database['public']['Enums']['task_status']
// Valores: 'por_fazer' | 'em_curso' | 'concluida'

type OnboardingType = Database['public']['Enums']['onboarding_type']
// Valores: 'normal' | 'urgente'
```

## Clientes Supabase

### Server Client (em Server Components/Actions)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
// Respeita RLS, usa cookies para autenticacao
```

### Admin Client (bypass RLS)

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const admin = createAdminClient()
// Usa service role key, bypassa RLS
// Usar apenas quando necessario
```

### Client (em Client Components)

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
// Para uso no browser
```

## Convencoes de Estilo

### Tailwind CSS

- Usar classes utilitarias do Tailwind
- Combinar classes com `cn()` de `@/lib/utils`
- Componentes UI baseados em shadcn/ui

### Cores Semanticas

```
primary          - Cor principal (azul)
destructive      - Acoes destrutivas (vermelho)
muted            - Texto/fundos secundarios
accent           - Destaques
```

### Espacamento

```
p-6              - Padding padrao de paginas
space-y-6        - Espacamento vertical entre seccoes
gap-4            - Gap em grids/flex
```

## Fluxo de Dados Principal

1. **Candidatura** (status: `novo`)
   - Criada via webhook HubSpot ou manualmente

2. **Onboarding** (status: `em_onboarding`)
   - Card criado no Kanban
   - Tarefas atribuidas por etapa
   - Progresso por conclusao de tarefas

3. **Ativo** (status: `ativo`)
   - Onboarding completo
   - Precos definidos
   - Pronto para receber trabalhos

4. **Abandonado/Suspenso**
   - Pode ser recuperado

## Entidades Principais

- **providers**: Prestadores de servicos
- **onboarding_cards**: Cards no pipeline de onboarding
- **onboarding_tasks**: Tarefas de cada card
- **stage_definitions**: Etapas do onboarding (1-6)
- **task_definitions**: Definicoes de tarefas por etapa
- **service_requests**: Pedidos de servico importados do backoffice FIXO
- **sync_logs**: Logs de sincronizacao com backoffice
- **notes**: Notas em prestadores
- **history_log**: Historico de alteracoes
- **users**: Utilizadores do sistema

## Features Principais

### Sincronizacao com Backoffice via GitHub Actions

O sistema de sincronizacao com o backoffice FIXO usa **GitHub Actions** para executar scrappers Puppeteer em producao (Vercel nao suporta Puppeteer).

#### Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  CRM (Vercel)   │────>│  GitHub Actions  │────>│  Supabase   │
│  Botao Sync     │     │  Puppeteer       │     │  Database   │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                        │
        │ repository_dispatch    │ Atualiza status
        └────────────────────────┘ via logs tables
```

#### Workflows Disponiveis

| Workflow | Ficheiro | Schedule | Tabela de Logs |
|----------|----------|----------|----------------|
| Pedidos de Servico | `.github/workflows/sync-backoffice.yml` | 6:00 UTC (dia anterior) | `sync_logs` |
| Prestadores | `.github/workflows/sync-providers.yml` | 5:00 UTC (todos) | `provider_sync_logs` |

#### Scripts

- `scripts/export-backoffice-data.ts` - Scrapper Puppeteer para pedidos de servico
- `scripts/export-providers-data.ts` - Scrapper Puppeteer para prestadores
- `scripts/sync-backoffice-github.ts` - Script standalone para GitHub Actions (pedidos)
- `scripts/sync-providers-github.ts` - Script standalone para GitHub Actions (prestadores)

#### API Routes

- `/api/sync/backoffice` - Sync local (localhost apenas)
- `/api/sync/providers` - Sync local (localhost apenas)
- `/api/sync/github-actions` - Dispara workflow de pedidos via `repository_dispatch`
- `/api/sync/providers-github-actions` - Dispara workflow de prestadores via `repository_dispatch`

#### Detecao Automatica de Ambiente

Os dialogs de sync (`SyncBackofficeDialog`, `SyncProvidersDialog`) detetam automaticamente o ambiente:
- **Localhost**: Executa Puppeteer localmente
- **Producao (Vercel)**: Dispara GitHub Actions via API

```typescript
const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
const apiEndpoint = isProduction ? '/api/sync/github-actions' : '/api/sync/backoffice'
```

#### Configuracao de Secrets

**GitHub Repository Secrets:**
- `BACKOFFICE_USERNAME` - Email de login no backoffice
- `BACKOFFICE_PASSWORD` - Password do backoffice
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key do Supabase

**Vercel Environment Variables:**
- `GITHUB_ACTIONS_TOKEN` - Fine-grained PAT com permissao Contents (read/write)
- `GITHUB_REPO` - Nome do repositorio (ex: `hackkalot/crm-prestadores`)

#### Triggers Disponiveis

Cada workflow pode ser disparado de 3 formas:
1. **Schedule (cron)** - Automatico diariamente
2. **workflow_dispatch** - Manual via GitHub UI
3. **repository_dispatch** - Via API (usado pelo CRM)

Exemplo de trigger via API (repository_dispatch):
```typescript
await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  },
  body: JSON.stringify({
    event_type: 'sync-backoffice',
    client_payload: {
      date_from: '01-01-2026',
      date_to: '10-01-2026',
      sync_log_id: 'uuid-do-log' // Permite rastrear user que disparou
    }
  })
})
```

#### Atribuicao de Utilizador nos Logs

Quando um utilizador dispara sync via CRM:
1. A API route cria o log com `triggered_by: user.id`
2. O `sync_log_id` e passado via `client_payload` ao GitHub Actions
3. O script recebe `--sync-log-id=` e usa o log existente (em vez de criar novo)

Para syncs automaticos (cron), o log e criado com:
- `triggered_by: null`
- `triggered_by_system: 'github-actions-scheduled'`

#### Artifacts

Os workflows guardam artifacts para debug:
- **Excel exportado**: `backoffice-data-{date}` ou `providers-data-{run_id}` (7 dias)
- **Logs e screenshots**: `sync-logs-{run_id}` (3 dias)

Para ver artifacts: GitHub > Actions > Workflow run > Artifacts (fundo da pagina)

#### Polling de Status

A pagina `/configuracoes/sync-logs` faz polling automatico (5s) quando ha syncs `in_progress` ou `pending`, mostrando o status em tempo real.

#### Puppeteer no GitHub Actions

Para funcionar no GitHub Actions, os scrappers usam:
```typescript
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
});
```

O workflow instala o Chrome e define `PUPPETEER_EXECUTABLE_PATH` automaticamente.

### Sistema de Alertas
- Alertas automaticos para tarefas em atraso
- Configuracoes personalizaveis por user
- Notificacoes no header (AlertsBell)

### Filtros e Paginacao
- Todos os listings (prestadores, pedidos, candidaturas) suportam:
  - Filtros multiplos (status, categoria, distrito, prestador, datas)
  - Ordenacao por coluna (sortable headers)
  - Paginacao com controlo de items por pagina
  - Estado mantido via URL params

## Notas Importantes

- Usar `'use server'` em todos os ficheiros de actions
- Revalidar paths apos mutacoes com `revalidatePath()`
- Verificar autenticacao em todas as server actions
- Usar `adminClient` apenas quando necessario (bypass RLS)
- Os tipos de database estao em `src/types/database.ts`
- Nao modificar `database.generated.ts` manualmente

---

## Changelog

### 12 Janeiro 2026

#### 1. Ordenacao em Candidaturas (`f33bec3`)
- Colunas ordenaveis na tabela de candidaturas (nome, email, data, etc.)
- **3 ficheiros, +78 linhas**

#### 2. Paginacao e Filtros Avancados (`2b9f2b2`)
- Paginacao completa em Candidaturas e Prestadores
- Filtros multi-select melhorados (distritos, servicos)
- Controlo de items por pagina (10, 25, 50, 100)
- Ordenacao por qualquer coluna
- **8 ficheiros, +889 linhas**

#### 3. Duplicados e Otimizacao CSV (`4c489e8`)
- Detecao de duplicados por email, NIF, nome (fuzzy 85%)
- Quick Merge automatico + Merge manual campo a campo
- Import CSV otimizado: **~3 min → ~5 seg** (1000 registos)
- Navegacao com estado (back button preserva filtros)
- **23 ficheiros, +2023 linhas**

#### 4. Mapa de Cobertura da Rede
- Mapa choropleth de Portugal com 308 concelhos (Mapbox)
- GeoJSON simplificado (29MB → 3.2MB) de OpenDataSoft/e-REDES
- Cores por cobertura: verde (2+ prestadores), amarelo (1), vermelho (0)
- Filtro por tipo de servico
- Hover com detalhes do concelho
- Nova tab "Mapa" na pagina /rede (default)
- **Ficheiros**: `public/geo/portugal-municipalities-simplified.geojson`, `src/components/network/network-mapbox-map.tsx`, `src/lib/network/actions.ts`

**Total do dia**: 38+ ficheiros modificados, ~3500 linhas adicionadas
