# Documentação da Página de KPIs de Onboarding

## Visão Geral

A página `/kpis` fornece métricas e indicadores de desempenho para acompanhar o processo de onboarding de prestadores. Permite visualização agregada ou filtrada por utilizador, tipo de entidade, distrito, tipo de onboarding e período temporal.

---

## Sistema de Filtros

### Filtros Disponíveis

| Filtro | Campo URL | Descrição |
|--------|-----------|-----------|
| **Período** | `dateFrom`, `dateTo` | Intervalo de datas (formato ISO) |
| **Tipo Entidade** | `entityType` | `tecnico`, `eni`, `empresa` |
| **Distrito** | `district` | Distrito geográfico |
| **Tipo Onboarding** | `onboardingType` | `normal`, `urgente` |
| **Utilizador** | `userId` | UUID do Relationship Manager |

### Presets de Período

- últimos 7 dias
- Semana passada (segunda a domingo)
- Últimos 30 dias
- Este mês
- Mês anterior
- Este ano

### Lógica de Filtragem por Utilizador

Quando um utilizador é selecionado:

| Tipo de Métrica | Campo Usado |
|-----------------|-------------|
| Dados de prestadores | `providers.relationship_owner_id` |
| Tarefas concluídas | `onboarding_tasks.completed_by` |
| Prestadores trabalhados | `relationship_owner_id` **OU** `completed_by` |

---

## KPI Cards (5 métricas principais)

### 1. Em Onboarding

**Resumo:** *"Quantos prestadores estão atualmente em processo de onboarding?"*

**Função:** `getOnboardingTotals(filters)`

**Query:**
```sql
SELECT id, onboarding_type, started_at, provider(...)
FROM onboarding_cards
WHERE completed_at IS NULL
  AND [filtros aplicados]
```

**Cálculo:**
- `total`: Contagem de cards ativos
- `normal`: Cards com `onboarding_type = 'normal'`
- `urgente`: Cards com `onboarding_type = 'urgente'`

**Filtros aplicados em:** `started_at`, `onboarding_type`, `provider.entity_type`, `provider.districts`, `provider.relationship_owner_id`

---

### 2. Tarefas Concluídas

**Resumo:** *"Quantas tarefas de onboarding foram concluídas no período selecionado?"*

**Função:** `getTasksCompleted(filters)`

**Query:**
```sql
SELECT id, completed_at, completed_by, card(...)
FROM onboarding_tasks
WHERE status = 'concluida'
  AND completed_at IS NOT NULL
  AND [filtros de data em completed_at]
```

**Cálculo:** Contagem total de tarefas com `status = 'concluida'`

**Filtros aplicados em:** `completed_at`, `onboarding_type` (via card), `entity_type` (via provider), `districts` (via provider), `completed_by` (quando userId filtrado)

---

### 3. Contactos Feitos

**Resumo:** *"Quantas chamadas telefónicas foram feitas aos prestadores no período?"*

**Função:** `getContactsMade(filters)`

**Query:**
```sql
-- Primeiro obter task_definition "Ligar"
SELECT id FROM task_definitions
WHERE task_number = 2
  AND stage.stage_number = '1'

-- Depois contar tarefas concluídas dessa definição
SELECT COUNT(*)
FROM onboarding_tasks
WHERE task_definition_id = [id do Ligar]
  AND status = 'concluida'
  AND completed_at IS NOT NULL
```

**Nota:** A tarefa "Ligar" é identificada como `task_number = 2` na etapa 1 (`stage_number = '1'`)

**Filtros aplicados em:** `completed_at`, `completed_by` (quando userId filtrado)

---

### 4. Prestadores Trabalhados

**Resumo:** *"Quantos prestadores únicos tiveram pelo menos uma tarefa concluída no período?"*

**Função:** `getProvidersWorked(filters)`

**Query:**
```sql
SELECT DISTINCT card.provider_id
FROM onboarding_tasks
WHERE status = 'concluida'
  AND completed_at IS NOT NULL
  AND [filtros aplicados]
```

**Cálculo:** Contagem de `provider_id` únicos que tiveram pelo menos 1 tarefa concluída no período

**Filtro userId:** Considera **ambos** `relationship_owner_id` e `completed_by` (OR)

---

### 5. Tempo Médio Entrada na Rede

**Resumo:** *"Os prestadores que ficaram ativos no período, quanto tempo demoraram desde o início do onboarding?"*

**Função:** `getAverageTimeToNetwork(filters)`

**Query:**
```sql
SELECT id, onboarding_started_at, activated_at
FROM providers
WHERE status = 'ativo'
  AND onboarding_started_at IS NOT NULL
  AND activated_at IS NOT NULL
  AND activated_at BETWEEN [dateFrom] AND [dateTo]
```

**Cálculo:**
```
tempo_dias = (activated_at - onboarding_started_at) / (1000 * 60 * 60 * 24)
média = SUM(tempo_dias) / COUNT(providers)
```

**Retorno:** `{ days: number, count: number }`

---

## Gráficos

### Funil de Conversão

**Resumo:** *"Qual é a taxa de conversão de candidaturas para prestadores ativos?"*

**Função:** `getConversionFunnel(filters)`

**Query:**
```sql
SELECT id, status, entity_type, districts, first_application_at
FROM providers
WHERE [filtros aplicados]
```

**Cálculos:**
```
candidaturas = providers WHERE status != 'abandonado'
emOnboarding = providers WHERE status = 'em_onboarding'
ativos = providers WHERE status = 'ativo'
abandonados = providers WHERE status = 'abandonado'

totalCandidaturas = candidaturas + abandonados
taxaConversao = (ativos / totalCandidaturas) * 100
```

**Retorno:**
```typescript
{
  candidaturas: number,
  emOnboarding: number,
  ativos: number,
  abandonados: number,
  taxaConversao: number  // percentagem
}
```

---

### Prestadores por Etapa (Stages Chart)

**Resumo:** *"Quantos prestadores estão em cada etapa do pipeline de onboarding?"*

**Função:** `getProvidersPerStage(filters)`

**Queries:**
```sql
-- 1. Obter etapas ativas
SELECT id, stage_number, name
FROM stage_definitions
WHERE is_active = true
ORDER BY display_order

-- 2. Obter cards em onboarding
SELECT id, current_stage_id, provider(...)
FROM onboarding_cards
WHERE completed_at IS NULL
```

**Cálculo:** Agrupa cards por `current_stage_id` e conta por etapa

**Retorno:**
```typescript
{
  id: string,
  stage_number: string,
  name: string,
  count: number
}[]
```

---

### Saúde do Onboarding (Health Indicators)

**Resumo:** *"Quantos onboardings estão dentro do prazo, em risco ou atrasados?"*

**Função:** `getHealthIndicators(filters)`

**SLAs definidos (hardcoded):**
| Tipo | Alerta (warning) | Atrasado (delayed) |
|------|------------------|-------------------|
| Normal | > 10 dias | > 14 dias |
| Urgente | > 3 dias | > 5 dias |

**Cálculo:**
```typescript
daysElapsed = (now - started_at) / (1000 * 60 * 60 * 24)

if (daysElapsed > sla.expected) → delayed
else if (daysElapsed > sla.warning) → atRisk
else → onTime
```

**Retorno:**
```typescript
{
  onTime: number,
  atRisk: number,
  delayed: number,
  total: number
}
```

---

### Cadência Semanal (Cadence Chart)

**Resumo:** *"Quantos prestadores entraram e saíram do onboarding por semana?"*

**Função:** `getWeeklyCadence(filters)`

**Queries:**
```sql
-- Entradas: providers que começaram onboarding
SELECT id, onboarding_started_at
FROM providers
WHERE onboarding_started_at >= [queryStartDate]

-- Saídas: providers que foram activados
SELECT id, activated_at
FROM providers
WHERE activated_at >= [queryStartDate]
```

**Agregação:** Por semana ISO (segundas a domingos), limitado a 12 semanas

**Retorno:**
```typescript
{
  week: string,      // "Sem 1", "Sem 2", ...
  entradas: number,  // providers que entraram em onboarding
  saídas: number     // providers que foram activados
}[]
```

---

### Contactos por Semana (Contacts Trend Chart)

**Resumo:** *"Qual foi a evolução semanal do número de contactos telefónicos realizados?"*

**Função:** `getContactsTrend(filters)`

**Query:**
```sql
SELECT id, completed_at, completed_by, card(...)
FROM onboarding_tasks
WHERE task_definition_id = [id da tarefa "Ligar"]
  AND status = 'concluida'
  AND completed_at >= [queryStartDate]
```

**Agregação:** Por semana ISO, limitado a 12 semanas

**Filtro userId:** Usa `completed_by` (quem completou a tarefa)

**Retorno:**
```typescript
{
  week: string,
  count: number
}[]
```

---

### Prestadores Trabalhados por Semana (Worked Providers Chart)

**Resumo:** *"Quantos prestadores únicos foram trabalhados em cada semana?"*

**Função:** `getWorkedProvidersTrend(filters)`

**Query:**
```sql
SELECT id, completed_at, completed_by, card(provider_id, ...)
FROM onboarding_tasks
WHERE status = 'concluida'
  AND completed_at >= [queryStartDate]
```

**Cálculo:** Por semana, conta `provider_id` únicos com tarefas concluídas

**Filtro userId:** Usa `relationship_owner_id` **OU** `completed_by`

**Retorno:**
```typescript
{
  week: string,
  count: number  // prestadores únicos
}[]
```

---

### Distribuição do Pipeline (Pipeline Distribution Chart)

**Resumo:** *"Qual é a distribuição atual entre candidaturas e prestadores em onboarding?"*

**Função:** `getPipelineDistribution(filters)`

**Queries:**
```sql
-- Candidaturas (status = novo)
SELECT COUNT(*) FROM providers WHERE status = 'novo'

-- Em Onboarding
SELECT COUNT(*) FROM onboarding_cards WHERE completed_at IS NULL
```

**Retorno:**
```typescript
{
  candidaturas: number,
  onboarding: number
}
```

---

### Tendências (Trends Chart)

**Resumo:** *"Como evoluíram as candidaturas e ativações ao longo do tempo?"*

**Função:** `getTrends(filters)`

**Agregação dinâmica baseada no período:**
| Dias no período | Agregação |
|-----------------|-----------|
| <= 14 dias | Por dia |
| 15-60 dias | Por semana |
| > 60 dias | Por mes |

**Queries:**
```sql
-- Candidaturas
SELECT id, first_application_at
FROM providers
WHERE first_application_at >= [queryStartDate]

-- Ativações
SELECT id, completed_at, provider(...)
FROM onboarding_cards
WHERE completed_at >= [queryStartDate]
```

**Retorno:**
```typescript
{
  aggregationType: 'day' | 'week' | 'month',
  data: {
    key: string,
    label: string,
    candidaturas: number,
    ativações: number
  }[]
}
```

---

### Tempo por Etapa (Stage Time Chart)

**Resumo:** *"Quanto tempo, em média, os prestadores passam em cada etapa do onboarding?"*

**Função:** `getAverageTimePerStageByType(filters)`

**Query:**
```sql
SELECT card_id, field_name, old_value, new_value, created_at, onboarding_card(...)
FROM history_log
WHERE table_name = 'onboarding_cards'
  AND field_name = 'current_stage_id'
ORDER BY created_at ASC
```

**Cálculo:**
1. Agrupa transições por `card_id`
2. Para cada transição, calcula tempo entre entrada e saída da etapa
3. Separa por tipo de onboarding (normal vs urgente)
4. Calcula média por etapa

**Retorno:**
```typescript
{
  id: string,
  stage_number: string,
  name: string,
  normalHours: number,
  urgenteHours: number,
  normalCount: number,
  urgenteCount: number
}[]
```

---

### Tempo por Owner (Owner Time Chart)

**Resumo:** *"Qual é o tempo médio de onboarding por Relationship Manager?"*

**Função:** `getAverageTimeByOwner(filters)`

**Query:**
```sql
SELECT id, started_at, completed_at, provider(relationship_owner(id, name, email))
FROM onboarding_cards
WHERE completed_at IS NOT NULL
```

**Cálculo:**
```
dias = (completed_at - started_at) / (1000 * 60 * 60 * 24)
média_por_owner = SUM(dias) / COUNT(cards)
```

**Retorno:**
```typescript
{
  id: string,
  name: string,
  averageDays: number,
  count: number
}[]
```
Ordenado por `averageDays` (mais rápido primeiro)

---

### Abandonos por Etapa (Abandonment By Stage Chart)

**Resumo:** *"Em que etapa do onboarding ocorrem mais abandonos?"*

**Função:** `getAbandonmentByStage(filters)`

**Query:**
```sql
SELECT id, onboarding_card(current_stage_id, onboarding_type)
FROM providers
WHERE status = 'abandonado'
```

**Cálculo:** Conta abandonos por `current_stage_id` do card

**Retorno:**
```typescript
{
  id: string,
  stage_number: string,
  name: string,
  abandonedCount: number
}[]
```

---

### Motivos de Abandono (Abandonment Reasons Chart)

**Resumo:** *"Quais são os principais motivos pelos quais os prestadores abandonam o processo?"*

**Função:** `getAbandonmentReasons(filters)`

**Query:**
```sql
SELECT id, abandonment_reason, abandonment_party, onboarding_card(onboarding_type)
FROM providers
WHERE status = 'abandonado'
  AND abandonment_reason IS NOT NULL
```

**Campos importantes:**
- `abandonment_reason`: Texto livre com o motivo
- `abandonment_party`: `'prestador'` ou `'fixo'` (quem iniciou o abandono)

**Retorno:**
```typescript
{
  reason: string,
  count: number,
  prestador: number,  // abandonos iniciados pelo prestador
  fixo: number        // abandonos iniciados pela FIXO
}[]
```
Ordenado por `count` DESC, limitado a top 5 na UI

---

### Performance por Owner (Owner Performance Table)

**Resumo:** *"Qual é a performance de cada Relationship Manager em termos de onboardings concluídos e tempo médio?"*

**Função:** `getPerformanceByOwner(filters)`

**Query:**
```sql
SELECT id, started_at, completed_at, provider(relationship_owner(id, name, email))
FROM onboarding_cards
```

**Métricas calculadas por owner:**
```typescript
{
  id: string,
  name: string,
  email: string,
  totalCards: number,
  completedCards: number,
  inProgressCards: number,
  averageDays: number,      // totalDays / completedCards
  completionRate: number    // (completedCards / totalCards) * 100
}[]
```
Ordenado por `completedCards` DESC

---

## Funções Auxiliares

### getDistrictsForKpis()

Retorna lista única de distritos presentes na base de dados para popular o filtro.

### getRelationshipManagers()

Retorna lista de utilizadores com `role = 'relationship_manager'` e `approval_status = 'approved'` para popular o filtro de utilizador.

### getWeekNumber(date)

Calcula número da semana ISO para uma data.

---

## Notas Técnicas

### Relações Supabase

O Supabase pode retornar relações como objeto ou array. Todas as funções usam helpers para normalizar:

```typescript
const getProvider = (rel) => {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] : rel
}
```

### Limites de Performance

- Graficos semanais: limitados a 12 semanas
- Tendências: limitado a 31 dias, 12 semanas ou 12 meses
- Motivos de abandono: top 5 na UI

### Filtros de Data

Todas as funções que filtram por data adicionam +1 dia ao `dateTo` para incluir registos do último dia:

```typescript
if (filters.dateTo) {
  const endDate = new Date(filters.dateTo)
  endDate.setDate(endDate.getDate() + 1)
  query = query.lt('completed_at', endDate.toISOString().split('T')[0])
}
```

---

## Layout da Página

```
1. Barra de Filtros (KpiFilters)
2. KPI Cards (5 em linha)
3. Funil + Etapas (2 colunas)
4. Saude + Cadencia (1 + 2 colunas)
5. Contactos + Trabalhados (2 colunas)
6. Pipeline + Tendencias (1 + 2 colunas)
7. Tempos etapa + Tempos owner (2 colunas)
8. Abandonos etapa + Abandonos motivos (2 colunas)
9. Performance Equipa (tabela completa)
```

---

## Componentes React

| Componente | Ficheiro | Tipo |
|------------|----------|------|
| KpiFilters | `kpi-filters.tsx` | Client |
| KpiCards | `kpi-cards.tsx` | Client |
| FunnelChart | `funnel-chart.tsx` | Client |
| StagesChart | `stages-chart.tsx` | Client |
| HealthIndicators | `health-indicators.tsx` | Client |
| CadenceChart | `cadence-chart.tsx` | Client |
| ContactsTrendChart | `contacts-trend-chart.tsx` | Client |
| WorkedProvidersChart | `worked-providers-chart.tsx` | Client |
| PipelineDistributionChart | `pipeline-distribution-chart.tsx` | Client |
| TrendsChart | `trends-chart.tsx` | Client |
| StageTimeChart | `stage-time-chart.tsx` | Client |
| OwnerTimeChart | `owner-time-chart.tsx` | Client |
| AbandonmentByStageChart | `abandonment-by-stage-chart.tsx` | Client |
| AbandonmentReasonsChart | `abandonment-reasons-chart.tsx` | Client |
| OwnerPerformanceTable | `owner-performance-table.tsx` | Client |

Todos os gráficos usam **Recharts** (BarChart, LineChart, ResponsiveContainer).
