# Proposta de Granularidade - Documentação Técnica

## Contexto

**Público-alvo**: Equipa mista (júniors a séniors)
**Formato**: Múltiplos ficheiros organizados em `/docs`
**Foco principal**: Arquitetura/decisões + Fluxos de dados/negócio

---

## Estrutura Proposta

```
docs/
├── README.md                    # Índice e quick start (entry point)
├── 01-ARQUITETURA.md           # Visão macro do sistema
├── 02-FLUXOS-NEGOCIO.md        # Estados, transições, regras
├── 03-BASE-DADOS.md            # Schema, relações, tipos
├── 04-INTEGRAÇÕES.md           # Backoffice, HubSpot, GitHub Actions
├── 05-COMPONENTES.md           # Padrões UI e reutilização
├── 06-DEPLOY.md                # Ambientes, CI/CD, configuração
└── diagramas/                  # Imagens e diagramas
    ├── arquitetura-sistema.png
    ├── fluxo-onboarding.png
    └── schema-bd.png
```

---

## Níveis de Granularidade

### Nível 1: Overview (para todos)
Responde: "O que é isto e como funciona em alto nível?"

### Nível 2: Detalhes Técnicos (para quem vai implementar)
Responde: "Como é que isto foi construído e porquê?"

### Nível 3: Referência Rápida (para consulta)
Responde: "Onde está X? Como faço Y?"

---

## Detalhe por Ficheiro

### `README.md` - Índice e Quick Start

**Objetivo**: Ponto de entrada, orientação rápida

**Conteúdo**:
- O que é o projeto (2-3 frases)
- Stack tecnológica (lista simples)
- Como correr localmente (5 comandos)
- Mapa da documentação (links para outros docs)
- Glossário de termos de negócio

**Exemplo**:
```markdown
## Quick Start

1. Clone o repositório
2. `cp .env.example .env.local` e preencher variáveis
3. `npm install`
4. `npm run dev`
5. Abrir http://localhost:3000

## Mapa da Documentação

| Preciso de...                        | Ver ficheiro        |
|--------------------------------------|---------------------|
| Entender a arquitetura               | 01-ARQUITETURA.md   |
| Ver como funciona o onboarding       | 02-FLUXOS-NEGOCIO.md|
| Saber que tabelas existem            | 03-BASE-DADOS.md    |
```

---

### `01-ARQUITETURA.md` - Visão Macro

**Objetivo**: Explicar o "porquê" das decisões técnicas

**Conteúdo**:

1. **Diagrama de Sistema** (visual)
   - Browser → Vercel (Next.js) → Supabase
   - GitHub Actions → Backoffice FIXO → Supabase

2. **Decisões Arquitecturais**

   | Decisão | Escolha | Alternativa Rejeitada | Motivo |
   |---------|---------|----------------------|--------|
   | Framework | Next.js App Router | Pages Router | Server Components, melhor DX |
   | Auth | Supabase Auth | NextAuth | Já usamos Supabase, menos deps |
   | Scraping | GitHub Actions | Vercel Functions | Puppeteer precisa browser, Vercel não suporta |

3. **Padrões de Código**
   - Server Actions vs API Routes (quando usar cada)
   - Client vs Server Components (critérios de decisão)
   - Estrutura de pastas (convenções)

**Exemplo de secção**:
```markdown
## Porquê GitHub Actions para Scraping?

**Problema**: Precisamos importar dados do backoffice FIXO via Puppeteer.

**Opções consideradas**:
1. Vercel Functions → Não suporta Puppeteer (sandbox limitada)
2. AWS Lambda → Overhead de infra, custos adicionais
3. GitHub Actions → Grátis, já usamos GitHub, cron nativo

**Decisão**: GitHub Actions com repository_dispatch para trigger manual.

**Trade-offs**:
- (+) Zero custo, fácil manutenção
- (-) Latência ~30s para iniciar workflow
- (-) Logs dispersos (GitHub UI vs app)
```

---

### `02-FLUXOS-NEGOCIO.md` - Estados e Transições

**Objetivo**: Documentar a lógica de negócio e máquinas de estado

**Conteúdo**:

1. **Ciclo de Vida do Prestador**
   ```
   novo → em_onboarding → ativo
                ↓           ↓
           abandonado ← suspenso
   ```

2. **Fluxo de Onboarding** (diagrama + descrição)
   - 6 etapas com tarefas específicas
   - Quem pode fazer o quê
   - Condições de transição

3. **Fluxo de Candidaturas**
   - Entrada via HubSpot webhook vs manual
   - Detecção de duplicados (email, NIF, fuzzy name)
   - Merge automático vs manual

4. **Fluxo de Pedidos de Serviço**
   - Importação do backoffice
   - Estados possíveis
   - Relação com prestadores

**Exemplo de secção**:
```markdown
## Onboarding: Etapas e Tarefas

### Etapa 1: Documentação Inicial
**Objetivo**: Recolher documentos legais do prestador

| Tarefa | Responsável | Obrigatória | Notas |
|--------|-------------|-------------|-------|
| Alvará | Backoffice | Sim | PDF ou foto |
| Seguro RC | Backoffice | Sim | Válido por 1 ano |
| Contrato assinado | Comercial | Sim | Template v2.3 |

**Condição para avançar**: Todas as tarefas obrigatórias concluídas.

**Casos especiais**:
- Prestador urgente: pode avançar com documentos pendentes
- Reactivação: salta para etapa 4 se já tiver docs válidos
```

---

### `03-BASE-DADOS.md` - Schema e Relações

**Objetivo**: Mapa completo da base de dados

**Conteúdo**:

1. **Diagrama ER** (visual simplificado)

2. **Tabelas Principais**

   | Tabela | Descrição | Relações |
   |--------|-----------|----------|
   | providers | Prestadores de serviço | → onboarding_cards, notes, provider_prices |
   | onboarding_cards | Cards do Kanban | → onboarding_tasks, stage_definitions |
   | service_requests | Pedidos importados | → providers |

3. **Enums e Estados**
   ```typescript
   provider_status: 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado'
   task_status: 'por_fazer' | 'em_curso' | 'concluida'
   ```

4. **Regeneração de Tipos**
   - Quando regenerar
   - Comando a usar
   - Armadilhas comuns

**Exemplo**:
```markdown
## providers

Tabela central do sistema. Cada prestador tem um registo aqui.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK, auto-gerado |
| name | text | Nome completo ou empresa |
| email | text | Email principal, único |
| nif | text | NIF, único, validado |
| status | enum | Estado atual (ver ciclo de vida) |
| hubspot_id | text? | ID no HubSpot se veio de lá |

**RLS**: Todos os users autenticados podem ler. Apenas admins podem eliminar.
```

---

### `04-INTEGRACOES.md` - Sistemas Externos

**Objetivo**: Como o CRM comunica com outros sistemas

**Conteúdo**:

1. **Backoffice FIXO**
   - Arquitetura do sync (diagrama)
   - Workflows GitHub Actions
   - Mapeamento de campos
   - Tratamento de erros

2. **HubSpot**
   - Webhook de candidaturas
   - Payload esperado
   - Validação e transformação

3. **Mapbox**
   - Mapa de cobertura
   - GeoJSON dos concelhos
   - Configuração de tokens

**Exemplo**:
```markdown
## Sync com Backoffice FIXO

### Arquitetura

┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  CRM UI     │────>│ GitHub       │────>│ Supabase │
│  (Vercel)   │     │ Actions      │     │          │
└─────────────┘     └──────────────┘     └──────────┘
       │                   │
       │ repository_       │ Puppeteer scrape
       │ dispatch          │ → Excel download
       │                   │ → Parse & insert
       └───────────────────┘

### Fluxo Detalhado

1. User clica "Sincronizar" no CRM
2. API cria registo em `sync_logs` com status `pending`
3. API dispara `repository_dispatch` para GitHub
4. GitHub Actions inicia workflow:
   a. Login no backoffice com Puppeteer
   b. Navega para exportação
   c. Download do Excel
   d. Parse e inserção no Supabase
   e. Atualiza `sync_logs` com resultado
5. CRM faz polling de `sync_logs` cada 5s
6. UI atualiza quando status muda para `completed` ou `failed`
```

---

### `05-COMPONENTES.md` - Padrões UI

**Objetivo**: Como construir UI consistente

**Conteúdo**:

1. **Componentes Base** (shadcn/ui)
   - Onde estão, como usar
   - Customizações feitas

2. **Padrões de Página**
   - Layout padrão
   - Header component
   - Tabs pattern

3. **Formulários**
   - useActionState pattern
   - Validação com Zod
   - Estados de loading

4. **Tabelas com Filtros**
   - Componente de filtros
   - URL params para estado
   - Paginação

**Exemplo**:
```markdown
## Padrão: Página com Filtros e Tabela

Todas as listagens seguem este padrão:

### Estrutura
```tsx
// page.tsx (Server Component)
export default async function Page({ searchParams }) {
  const params = await searchParams
  const { data, total } = await getData(params)

  return (
    <div className="flex flex-col h-full">
      <Header title="Título" />
      <div className="flex-1 p-6 overflow-auto">
        <FilterBar filters={...} />      {/* Client Component */}
        <DataTable data={data} />        {/* Client Component */}
        <Pagination total={total} />     {/* Client Component */}
      </div>
    </div>
  )
}
```

### Estado via URL
Filtros são guardados em URL params para:
- Partilha de links filtrados
- Botão "voltar" preserva filtros
- SSR com dados filtrados
```

---

### `06-DEPLOY.md` - Ambientes e CI/CD

**Objetivo**: Como o sistema é deployado e configurado

**Conteúdo**:

1. **Ambientes**
   - Local (localhost)
   - Preview (Vercel branches)
   - Produção (Vercel main)

2. **Variáveis de Ambiente**
   - Lista completa
   - Onde configurar cada uma
   - Valores de exemplo

3. **CI/CD**
   - Build automático no push
   - Type checking
   - Linting

4. **Troubleshooting**
   - Erros comuns de build
   - Logs onde consultar

---

## Exemplos Concretos de Granularidade

### Demasiado Superficial ❌
> "O sistema usa Server Actions para operações de dados."

### Granularidade Adequada ✅
> "Server Actions (`'use server'`) são usadas para todas as mutações de dados. Cada action verifica autenticação via `supabase.auth.getUser()`, executa a operação com `adminClient` quando precisa bypass RLS, e termina com `revalidatePath()` para invalidar cache. Ver exemplo em `src/lib/candidaturas/actions.ts`."

### Demasiado Detalhado ❌
> "Na linha 45 do ficheiro actions.ts, a função getCandidaturas faz um select à tabela providers com as colunas id, name, email, phone..."

---

## Próximos Passos

1. **Validar esta proposta** - Confirmar estrutura e prioridades
2. **Gerar diagramas** - Arquitetura, fluxos, ER
3. **Escrever docs** - Começar pelo README + Arquitetura
4. **Rever com equipa** - Feedback e ajustes

---

## Estimativa de Esforço

| Ficheiro | Complexidade | Notas |
|----------|--------------|-------|
| README.md | Baixa | Quick start + índice |
| 01-ARQUITETURA.md | Alta | Requer diagramas, decisões documentadas |
| 02-FLUXOS-NEGOCIO.md | Alta | Core do sistema, muitos estados |
| 03-BASE-DADOS.md | Média | Pode ser parcialmente gerado do schema |
| 04-INTEGRACOES.md | Média | Backoffice é o mais complexo |
| 05-COMPONENTES.md | Baixa | Padrões repetitivos |
| 06-DEPLOY.md | Baixa | Checklist + troubleshooting |

**Sugestão de ordem**: README → 01 → 02 → 03 → 04 → 05 → 06
