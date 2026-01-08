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
npm run db:generate  # Gerar tipos TypeScript a partir do schema
npm run db:push      # Push de migracoes para Supabase
npm run db:reset     # Reset da base de dados local
```

## Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js)
│   ├── (auth)/            # Rotas de autenticacao
│   ├── (dashboard)/       # Rotas protegidas do dashboard
│   │   ├── candidaturas/  # Gestao de candidaturas
│   │   ├── onboarding/    # Pipeline de onboarding (Kanban)
│   │   ├── prestadores/   # Lista de prestadores ativos
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
│   ├── providers/         # Detalhe de prestador
│   ├── kpis/              # Graficos e metricas
│   └── layout/            # Header, navegacao
├── lib/
│   ├── supabase/          # Clientes Supabase (server/client/admin)
│   ├── candidaturas/      # Server actions de candidaturas
│   ├── onboarding/        # Server actions de onboarding
│   ├── prestadores/       # Server actions de prestadores
│   ├── providers/         # Server actions de providers
│   ├── pricing/           # Server actions de precos
│   └── utils.ts           # Utilitarios (cn, etc.)
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
- **notes**: Notas em prestadores
- **history_log**: Historico de alteracoes
- **users**: Utilizadores do sistema

## Notas Importantes

- Usar `'use server'` em todos os ficheiros de actions
- Revalidar paths apos mutacoes com `revalidatePath()`
- Verificar autenticacao em todas as server actions
- Usar `adminClient` apenas quando necessario (bypass RLS)
- Os tipos de database estao em `src/types/database.ts`
- Nao modificar `database.generated.ts` manualmente
