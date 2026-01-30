# CLAUDE.md - Guia de Desenvolvimento

CRM interno para gestão de prestadores de serviços (candidaturas, onboarding, preços, cobertura).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Supabase** (PostgreSQL) + **Tailwind CSS v4** + **shadcn/ui**
- **Zod** (validação) + **Recharts** (gráficos) + **dnd-kit** (drag & drop)

## Comandos

```bash
npm run dev          # Desenvolvimento
npm run build        # Build (SEMPRE correr antes de commits grandes)
npm run lint         # ESLint

# O 2>/dev/null filtra mensagens do CLI que corrompem o ficheiro
# Regenerar tipos (OBRIGATÓRIO após alterar schema)
npx supabase gen types typescript --project-id nyrnjltpyedfoommmbhs 2>/dev/null > src/types/database.ts
```
Os tipos sao gerados para `src/types/database.ts` e devem ser regenerados sempre que o schema da base de dados mudar (novas tabelas, colunas, etc.).

**IMPORTANTE**: Ao criar migrations, o fluxo correto é:
1. Escrever a migration SQL
2. Aplicar com `npx supabase db push --linked`
3. Regenerar tipos com o comando acima

---

## REGRAS CRÍTICAS

### 1. database.ts
- ❌ **NUNCA** editar manualmente - é auto-gerado
- ❌ **NUNCA** criar interfaces locais para tipos de BD
- ✅ Regenerar após qualquer alteração de schema
- ✅ Importar tipos de `@/types/database.ts` ou `@/lib/*/actions.ts`

### 2. TypeScript
- ❌ **NUNCA** usar `as any` sem `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- ❌ **NUNCA** corrigir erros um a um - usar `npm run build` para ver todos
- ✅ Preferir `as unknown as Type` quando necessário
- ✅ Se >5 erros de tipos → regenerar database.ts

### 3. Queries Supabase
- ❌ **NUNCA** inventar nomes de colunas/tabelas
- ✅ **SEMPRE** verificar `database.ts` antes de escrever queries
- ✅ Atenção a nomes exactos (ex: `assigned_provider_id` não `provider_id`)

### 4. Novas Páginas
- ❌ **NUNCA** criar página sem adicionar à tabela `pages`
- ✅ Criar migration com INSERT em `pages` + `role_permissions`
- ✅ Sem isto, página fica invisível (sistema de permissões dinâmico)

```sql
-- Exemplo para nova página
INSERT INTO pages (key, name, path, section, display_order) VALUES
  ('nova_pagina', 'Nova Página', '/nova-pagina', 'onboarding', 5);

INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, TRUE FROM roles r, pages p WHERE p.key = 'nova_pagina';
```

### 5. Server Components
- ❌ **NUNCA** usar `console.log()` em server components (causa EPIPE)
- ✅ Logs apenas em `'use server'` actions

### 6. Ficheiros
- ✅ Usar `cp` via Bash para copiar ficheiros, depois Edit para alterar
- ❌ **NUNCA** usar Write tool para duplicar ficheiros grandes

---

## Estrutura Principal

```
src/
├── app/(dashboard)/      # Páginas protegidas
├── components/           # UI components
├── lib/                  # Server actions por domínio
│   ├── supabase/        # Clientes (server/client/admin)
│   └── */actions.ts     # Actions por feature
└── types/database.ts    # Tipos gerados (NÃO EDITAR)
```

## Clientes Supabase

```typescript
// Server Components/Actions - respeita RLS
const supabase = await createClient()

// Bypass RLS - usar apenas quando necessário
const admin = createAdminClient()

// Client Components - browser
const supabase = createClient()
```

## Fluxo de Dados

```
Candidatura (novo) → Onboarding (em_onboarding) → Ativo (ativo)
                                                 ↓
                                          Abandonado/Suspenso
```

## Entidades Principais

| Tabela | Descrição |
|--------|-----------|
| `providers` | Prestadores |
| `onboarding_cards` | Cards Kanban |
| `onboarding_tasks` | Tarefas por card |
| `service_requests` | Pedidos (sync backoffice) |
| `roles` / `pages` / `role_permissions` | Sistema de permissões |

## Sincronização Backoffice

- **Produção**: GitHub Actions (Puppeteer não corre na Vercel)
- **Local**: Puppeteer directo
- **Detecção automática** nos dialogs de sync
- **Logs**: `/configuracoes/sync-logs` com polling em tempo real

---

## Consultar Base de Dados (Quick Scripts)

Para consultar a BD directamente, usar scripts em `scripts/db-queries/`:

```bash
# Executar um script existente
npx tsx scripts/db-queries/_template.ts

# Criar novo script baseado no template
cp scripts/db-queries/_template.ts scripts/db-queries/minha-query.ts
# Editar e executar
npx tsx scripts/db-queries/minha-query.ts
```

O template já carrega as variáveis de ambiente e configura o cliente Supabase com service role (bypass RLS).

**Exemplo de uso:**
```typescript
const { data } = await supabase
  .from('pages')
  .select('key, name, section')
  .order('section')

console.table(data)
```

---

## Quick Reference

```typescript
// Server Action padrão
'use server'
export async function myAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  // ...
  revalidatePath('/path')
  return { success: true }
}

// Tipo de página (searchParams é Promise no Next.js 16)
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  // ...
}
```
