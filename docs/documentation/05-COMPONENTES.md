# Componentes UI e Padrões de Reutilização

Este documento descreve os componentes UI, padrões de interface e convenções de estilo utilizados no CRM Prestadores.

## Índice

- [Arquitectura de Componentes](#arquitectura-de-componentes)
- [Componentes Base (shadcn/ui)](#componentes-base-shadcnui)
- [Componentes Customizados](#componentes-customizados)
- [Componentes de Layout](#componentes-de-layout)
- [Padrões de Filtros](#padrões-de-filtros)
- [Padrões de Stats Cards](#padrões-de-stats-cards)
- [Padrões de Tabelas](#padrões-de-tabelas)
- [Padrões de Formulários](#padrões-de-formulários)
- [Padrões de Diálogos](#padrões-de-diálogos)
- [Convenções de Estilo](#convenções-de-estilo)
- [Boas Práticas](#boas-práticas)

---

## Arquitectura de Componentes

O projecto segue uma hierarquia de componentes em três níveis:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PÁGINAS                                        │
│                        src/app/(dashboard)/                                 │
│   candidaturas/page.tsx  │  onboarding/page.tsx  │  prestadores/page.tsx    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ importam
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPONENTES DE DOMÍNIO                                 │
│                      src/components/[domínio]/                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  candidaturas/  │  │   onboarding/   │  │   prestadores/  │   ...        │
│  │  - filters      │  │   - kanban      │  │   - list        │              │
│  │  - list         │  │   - stats       │  │   - stats       │              │
│  │  - stats        │  │   - actions     │  │   - actions     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ importam
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPONENTES BASE                                      │
│                                                                             │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                │
│  │  src/components/ui/     │     │  src/components/layout/ │                │
│  │                         │     │                         │                │
│  │  - button, input, card  │     │  - header               │                │
│  │  - dialog, table, tabs  │     │  - (sidebar futuro)     │                │
│  │  - searchable-select    │     │                         │                │
│  │  - coverage-filter      │     │                         │                │
│  │  - date-picker          │     │                         │                │
│  └─────────────────────────┘     └─────────────────────────┘                │
│                                                                             │
│                         shadcn/ui + Radix UI                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Organização de Pastas

| Pasta | Descrição | Exemplos |
|-------|-----------|----------|
| `src/components/ui/` | Componentes base (shadcn/ui + customizados) | button, input, coverage-filter |
| `src/components/layout/` | Estrutura global | header |
| `src/components/candidaturas/` | Componentes de candidaturas | filters, list, stats |
| `src/components/onboarding/` | Componentes de onboarding | kanban, stats, actions |
| `src/components/prestadores/` | Componentes de prestadores | list, stats, notes |
| `src/components/providers/` | Detalhe de prestador | editable-field, tabs |
| `src/components/pedidos/` | Pedidos de serviço | list, filters, map |
| `src/components/kpis/` | Dashboard de métricas | cards, charts |
| `src/components/sync/` | Sincronização backoffice | dialogs, logs |

---

## Componentes Base (shadcn/ui)

Componentes instalados via CLI do shadcn/ui em `src/components/ui/`:

| Componente | Descrição | Uso Típico |
|------------|-----------|------------|
| **Button** | Botão com variantes | Acções, submits, navegação |
| **Input** | Campo de texto | Formulários, pesquisa |
| **Textarea** | Área de texto | Notas, descrições |
| **Card** | Contentor com header/content | Stats, agrupamento |
| **Dialog** | Modal overlay | Formulários, confirmações |
| **AlertDialog** | Modal de confirmação | Acções destrutivas |
| **Table** | Tabela de dados | Listagens |
| **Tabs** | Navegação em abas | Detalhe de prestador |
| **Badge** | Etiqueta colorida | Status, contagens |
| **Checkbox** | Caixa de selecção | Formulários, filtros |
| **Select** | Dropdown simples | Selecção única |
| **Popover** | Contentor flutuante | Dropdowns complexos |
| **Command** | Interface de pesquisa | Base para comboboxes |
| **Calendar** | Calendário | Base para date-picker |
| **Skeleton** | Placeholder de loading | Estados de carregamento |
| **Alert** | Mensagem de aviso | Feedback ao utilizador |
| **Separator** | Linha divisória | Separação visual |
| **ScrollArea** | Área com scroll | Listas longas |
| **Tooltip** | Dica flutuante | Informação contextual |
| **DropdownMenu** | Menu de acções | Row actions em tabelas |
| **Accordion** | Painéis colapsáveis | FAQs, configurações |
| **Progress** | Barra de progresso | Loading, conclusão |
| **Switch** | Toggle on/off | Configurações booleanas |
| **RadioGroup** | Selecção exclusiva | Opções mutuamente exclusivas |
| **Collapsible** | Área colapsável | Filtros avançados |

---

## Componentes Customizados

### SearchableSelect

Dropdown com pesquisa para selecção única.

**Ficheiro:** `src/components/ui/searchable-select.tsx`

```typescript
interface SearchableSelectProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}
```

**Uso:**

```tsx
<SearchableSelect
  options={[
    { value: 'tecnico', label: 'Técnico' },
    { value: 'empresa', label: 'Empresa' },
  ]}
  value={entityType}
  onValueChange={setEntityType}
  placeholder="Selecionar tipo"
/>
```

---

### SearchableMultiSelect

Dropdown com pesquisa para selecção múltipla.

**Ficheiro:** `src/components/ui/searchable-multi-select.tsx`

```typescript
interface SearchableMultiSelectProps {
  options: { value: string; label: string }[]
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  maxDisplayed?: number  // Após este número, mostra "X selecionados"
}
```

**Features:**
- Botão "Selecionar todos" quando há pesquisa activa
- Checkbox visual para cada opção
- Botão X para limpar selecção
- Exibição adaptativa: "Item1, Item2" ou "5 selecionados"

---

### CoverageFilter

Filtro hierárquico de zonas geográficas (Distritos → Concelhos).

**Ficheiro:** `src/components/ui/coverage-filter.tsx`

```typescript
interface CoverageFilterProps {
  selected: string[]  // Array de nomes de concelhos
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
}
```

**Features:**
- Pesquisa por nome de distrito ou concelho
- Auto-expandir distritos ao pesquisar
- Checkbox tri-state para distritos (todos/alguns/nenhum)
- Badge com contagem (ex: "5/14" concelhos)
- Exibição inteligente: "2 distritos + 3 concelhos"

**Comportamento de selecção:**
- Clicar no checkbox do distrito selecciona TODOS os seus concelhos
- Clicar num concelho individual adiciona/remove apenas esse
- Distritos mostram estado "indeterminate" quando parcialmente seleccionados

**Integração com backend:**
- Usa dados estáticos de `PORTUGAL_DISTRICTS` (`src/lib/data/portugal-districts.ts`)
- Backend filtra tanto `counties` como `districts` usando `getFullySelectedDistricts()`

---

### CoverageMultiSelect

Selector de cobertura para formulários (não filtros).

**Ficheiro:** `src/components/ui/coverage-multi-select.tsx`

**Diferença do CoverageFilter:**
- Mostra badges dos itens seleccionados no próprio componente
- Permite remover itens individualmente clicando no X do badge
- Ocupa mais espaço vertical
- Ideal para formulários de criação/edição de prestador

---

### DatePicker

Selector de data localizado (pt-PT).

**Ficheiro:** `src/components/ui/date-picker.tsx`

```typescript
interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | undefined) => void
  placeholder?: string
  fromDate?: Date  // Data mínima
  toDate?: Date    // Data máxima
}
```

**Features:**
- Formato dd/MM/yyyy
- Locale pt-PT (dias da semana em português)
- Botão de limpar quando há valor
- Suporte a intervalos (fromDate/toDate)

---

### EditableField

Campo de edição inline (click-to-edit).

**Ficheiro:** `src/components/providers/editable-field.tsx`

```typescript
interface EditableFieldProps {
  value: string | null | undefined
  onSave: (value: string) => Promise<{ error?: string }>
  placeholder?: string
  icon?: React.ReactNode
  type?: 'text' | 'url' | 'email'
}
```

**Estados:**

```
┌─────────────────────────────────────────────────────────────────┐
│  VIEW MODE                                                      │
│  ┌────────────────────────────────────┐  ┌────┐                 │
│  │ valor ou placeholder               │  │ ✏️ │  (hover only)   │
│  └────────────────────────────────────┘  └────┘                 │
└─────────────────────────────────────────────────────────────────┘
                              │ click
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  EDIT MODE                                                      │
│  ┌────────────────────────────────────┐  ┌───┐  ┌───┐           │
│  │ [input editável]                   │  │ ✓ │  │ ✗ │           │
│  └────────────────────────────────────┘  └───┘  └───┘           │
└─────────────────────────────────────────────────────────────────┘
                              │ Enter ou click ✓
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SAVING MODE                                                    │
│  ┌────────────────────────────────────┐  ┌───┐                  │
│  │ [input disabled]                   │  │ ⟳ │  (spinner)       │
│  └────────────────────────────────────┘  └───┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**
- `Enter` - Guardar
- `Escape` - Cancelar

**Variantes relacionadas:**
- `EditableBoolean` - Toggle para campos booleanos
- `EditableNumber` - Input numérico
- `EditableArray` - Lista de valores

---

### ProviderLink

Link para prestador com preservação de estado.

**Ficheiro:** `src/components/ui/provider-link.tsx`

Guarda o URL actual (com filtros) antes de navegar, permitindo que o `BackButton` volte ao estado exacto.

---

### BackButton

Botão de retorno com recuperação de estado.

**Ficheiro:** `src/components/ui/back-button.tsx`

```typescript
interface BackButtonProps {
  fallbackUrl?: string  // URL se não houver histórico
}
```

---

## Componentes de Layout

### Header

Cabeçalho padrão de páginas.

**Ficheiro:** `src/components/layout/header.tsx`

```typescript
interface HeaderProps {
  title: string
  description?: string
  backButton?: React.ReactNode
  action?: React.ReactNode
}
```

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [←] Título da Página                    [Action] [🌙] [🔔] [⚠️]            │
│      Descrição opcional                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
      │                                         │     │    │    │
      │                                         │     │    │    └─ AlertsBell
      │                                         │     │    └─ PrioritiesBell
      │                                         │     └─ ThemeToggle
      │                                         └─ Slot para botão de acção
      └─ Slot para BackButton
```

**Uso:**

```tsx
<Header
  title="Candidaturas"
  description="Gestão de novas candidaturas"
  action={<CreateProviderDialog />}
/>
```

---

## Padrões de Filtros

Padrão usado em: `CandidaturasFilters`, `PrestadoresFilters`, `OnboardingFilters`, `PedidosFilters`

### Estrutura Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐  ┌──────────┐  ┌─────────┐    │
│  │ 🔍 Pesquisar por nome, email ou NIF...  │  │Pesquisar │  │ Limpar  │    │
│  └─────────────────────────────────────────┘  └──────────┘  └─────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Estado: [Todos] [Novos] [Em Onboarding] [Abandonados]                      │
│                                                                              │
│  Tipo: [▼ Selecionar]    [⚙️ Filtros avançados ▼]    [≡ Lista] [⊞ Grelha]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  FILTROS AVANÇADOS (colapsável)                                     │    │
│  │                                                                      │    │
│  │  Zona de atuação        Tipo de serviço      Data desde   Data até  │    │
│  │  [▼ CoverageFilter]     [▼ MultiSelect]      [📅]         [📅]      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Gestão de Estado via URL

```typescript
// Padrão de implementação
const router = useRouter()
const searchParams = useSearchParams()
const [isPending, startTransition] = useTransition()

// Ler valores da URL
const currentStatus = searchParams.get('status') || 'all'
const currentCounties = useMemo(() => {
  const param = searchParams.get('counties')
  return param ? param.split(',') : []
}, [searchParams])

// Actualizar filtro simples
const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString())
  if (value && value !== 'all') {
    params.set(key, value)
  } else {
    params.delete(key)
  }
  params.delete('page')  // Reset paginação
  startTransition(() => {
    router.push(`/rota?${params.toString()}`)
  })
}

// Actualizar filtro multi-select
const updateMultiFilter = (key: string, values: string[]) => {
  const params = new URLSearchParams(searchParams.toString())
  if (values.length > 0) {
    params.set(key, values.join(','))
  } else {
    params.delete(key)
  }
  params.delete('page')
  startTransition(() => {
    router.push(`/rota?${params.toString()}`)
  })
}
```

---

## Padrões de Stats Cards

Padrão usado em: `CandidaturasStats`, `PrestadoresStats`, `KpiCards`, `PedidosStats`

### Estrutura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Label           │  │ Label           │  │ Label           │  ...        │
│  │                 │  │                 │  │                 │             │
│  │ 123        [●]  │  │ 45         [●]  │  │ 78%        [●]  │             │
│  │ Subtexto       │  │ Subtexto       │  │ Subtexto       │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementação

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Em Onboarding
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {normal} normal, {urgente} urgente
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

### Cores Semânticas

| Cor | Uso | Classes |
|-----|-----|---------|
| Azul (primary) | Info geral, totais | `bg-primary/10`, `text-primary` |
| Verde | Sucesso, conversão | `bg-green-100`, `text-green-600` |
| Âmbar/Laranja | Alertas, urgente | `bg-amber-100`, `text-amber-600` |
| Vermelho | Erros, abandonos | `bg-red-100`, `text-red-600` |

---

## Padrões de Tabelas

### Headers Ordenáveis

```tsx
interface SortableHeaderProps {
  column: string
  label: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (column: string) => void
}

// No header da tabela
<TableHead
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => onSort('name')}
>
  <div className="flex items-center gap-1">
    Nome
    {currentSort === 'name' && (
      currentOrder === 'asc' ? <ChevronUp /> : <ChevronDown />
    )}
  </div>
</TableHead>
```

### Row Actions

```tsx
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => router.push(`/providers/${id}`)}>
        <Eye className="mr-2 h-4 w-4" />
        Ver detalhes
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => setDeleteId(id)}
        className="text-destructive"
      >
        <Trash className="mr-2 h-4 w-4" />
        Eliminar
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

### Paginação

```tsx
<div className="flex items-center justify-between">
  <p className="text-sm text-muted-foreground">
    A mostrar {start}-{end} de {total} resultados
  </p>
  <div className="flex items-center gap-2">
    <Select value={limit} onValueChange={setLimit}>
      <SelectTrigger className="w-20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10</SelectItem>
        <SelectItem value="25">25</SelectItem>
        <SelectItem value="50">50</SelectItem>
        <SelectItem value="100">100</SelectItem>
      </SelectContent>
    </Select>
    <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
      Anterior
    </Button>
    <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
      Seguinte
    </Button>
  </div>
</div>
```

---

## Padrões de Formulários

### Com useActionState

```tsx
'use client'

import { useActionState } from 'react'
import { createProvider } from '@/lib/providers/actions'

export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProvider, {})

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
          {state.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A criar...
            </>
          ) : (
            'Criar prestador'
          )}
        </Button>

        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  )
}
```

### Validação com Zod

```typescript
// Na server action
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  nif: z.string().regex(/^\d{9}$/, 'NIF deve ter 9 dígitos'),
})

export async function createProvider(prevState: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    nif: formData.get('nif'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  // Continuar com dados validados...
}
```

---

## Padrões de Diálogos

### Dialog de Confirmação

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acção não pode ser revertida.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        className="bg-destructive text-destructive-foreground"
      >
        Confirmar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Dialog com Formulário

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Enviar para Onboarding</DialogTitle>
      <DialogDescription>
        Seleccione o tipo de onboarding para este prestador.
      </DialogDescription>
    </DialogHeader>

    <form action={formAction}>
      <div className="space-y-4 py-4">
        {/* Campos do formulário */}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          Confirmar
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Convenções de Estilo

### Espaçamento

| Contexto | Classes | Uso |
|----------|---------|-----|
| Padding de página | `p-6` | Contentor principal |
| Espaço entre secções | `space-y-6` | Entre stats, filtros, tabela |
| Gap em grids | `gap-4` | Cards de stats, filtros |
| Gap em flex | `gap-2` | Botões, elementos inline |

### Tamanhos

| Elemento | Classes | Uso |
|----------|---------|-----|
| Botões de filtro | `size="sm"` | Botões de estado, acções de tabela |
| Inputs em filtros | `h-8` ou `h-9` | SearchableSelect, DatePicker |
| Ícones em botões | `h-4 w-4` | Ícones dentro de botões |
| Ícones de stats | `h-6 w-6` | Ícones nos cards de KPI |

### Cores Semânticas

```
┌─────────────────────────────────────────────────────────────────┐
│  CORES DO SISTEMA                                                │
├─────────────────────────────────────────────────────────────────┤
│  primary           - Acções principais, links activos            │
│  destructive       - Erros, acções destrutivas, alertas          │
│  muted-foreground  - Texto secundário, labels, placeholders      │
│  muted             - Fundos secundários (ex: bg-muted/50)        │
│  accent            - Hover states, destaques                     │
│  card              - Fundo de cards e áreas elevadas             │
│  border            - Bordas, separadores                         │
└─────────────────────────────────────────────────────────────────┘
```

### Classes Utilitárias Comuns

```tsx
// Combinar classes condicionais
import { cn } from '@/lib/utils'

<Button className={cn(
  "w-full",
  isActive && "bg-primary",
  disabled && "opacity-50"
)} />

// Texto truncado
<span className="truncate">{longText}</span>

// Flex com alinhamento
<div className="flex items-center justify-between gap-2">

// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Hover states
<div className="hover:bg-accent cursor-pointer">

// Transições
<div className="transition-opacity opacity-0 group-hover:opacity-100">
```

---

## Boas Práticas

### 1. useMounted para Hydration

```tsx
import { useMounted } from '@/hooks/use-mounted'

export function DateDisplay({ date }: { date: Date }) {
  const mounted = useMounted()

  if (!mounted) {
    return <Skeleton className="h-4 w-24" />
  }

  return <span>{formatDistanceToNow(date, { locale: pt })}</span>
}
```

### 2. useTransition para Navegação

```tsx
const [isPending, startTransition] = useTransition()

const handleFilter = (value: string) => {
  startTransition(() => {
    router.push(`/page?filter=${value}`)
  })
}

<Button disabled={isPending}>
  {isPending ? <Loader2 className="animate-spin" /> : 'Aplicar'}
</Button>
```

### 3. Evitar Nested Buttons

```tsx
// ❌ ERRADO - button dentro de button causa hydration error
<Button>
  <button onClick={handleClear}>
    <X />
  </button>
</Button>

// ✅ CORRETO - usar span com role="button"
<Button>
  <span
    role="button"
    tabIndex={0}
    onClick={(e) => {
      e.stopPropagation()
      handleClear()
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') handleClear()
    }}
  >
    <X />
  </span>
</Button>
```

### 4. Prefixar Client Components

```tsx
// Ficheiros que usam hooks ou eventos DEVEM ter 'use client'
'use client'

import { useState } from 'react'
// ...
```

### 5. Importar Tipos Separadamente

```tsx
// Importar tipos com 'type' para tree-shaking
import type { Provider } from '@/types/database'
import { createProvider } from '@/lib/providers/actions'
```

---

## Próximos Documentos

- [01-ARQUITETURA.md](./01-ARQUITETURA.md) - Decisões técnicas
- [02-FLUXOS-NEGOCIO.md](./02-FLUXOS-NEGOCIO.md) - Estados e transições
- [03-BASE-DADOS.md](./03-BASE-DADOS.md) - Schema da base de dados
- [04-INTEGRACOES.md](./04-INTEGRACOES.md) - Integrações externas

---

*Última actualização: Janeiro 2026*
