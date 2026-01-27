# KPIs Operacionais - Requisitos e Acompanhamento

> **Página**: `/kpis-operacionais` (substituir a actual `/analytics`)
> **Última actualização**: 27 Janeiro 2026

---

## Estrutura de Tabs

| # | Tab | Estado | Notas |
|---|-----|--------|-------|
| 1 | Overview Geral | ✅ Concluído | Cards + Gráficos implementados |
| 2 | Prestadores (Rede) | ✅ Concluído | 5 KPI cards implementados |
| 3 | Clientes | ❌ Por fazer | **Nova tab** |
| 4 | Operacionais | ❌ Por fazer | Depende de email Francisco + Collab |
| 5 | Reclamações | ❌ Por fazer | Depende de integração Zendesk |
| 6 | Faturação | 🟡 Parcial | Faltam alguns componentes |

**Total: 6 tabs**

---

## Filtros Globais (Barra de Topo)

| Filtro | Estado | Notas |
|--------|--------|-------|
| Intervalo de datas (range picker) | ✅ Existe | `AnalyticsFilters` |
| Presets rápidos (7d, 30d, 90d, etc.) | ✅ Existe | Inclui "semana passada" |
| Escolha `created_at` vs `scheduled_to` | ❌ Falta | Novo requisito |
| Filtro de serviço (multi-select) | ✅ Existe | |
| Filtro de categoria (multi-select) | ✅ Existe | |
| Filtro de prestador (pesquisa nome) | ❌ Falta | |
| Filtro utilizador OPS | ❌ Falta | Apenas para tab Operacionais |

---

## Tab 1: Overview Geral

### Cards KPI (Requisitos Completos)

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Número total de serviços (SRs) | BO `service_requests` COUNT by `created_at` | ✅ Implementado | `AnalyticsSummaryCards` - Card 1 |
| Nr pedidos submetidos (`created_at`) | BO `service_requests` | ✅ Implementado | Card 1 + Avg/dia |
| Nr pedidos agendados (`scheduled_to`) | BO `service_requests` | ✅ Implementado | Card 2 + Avg/dia |
| Average SRs/dia submetidos | BO `service_requests` / dias do período | ✅ Implementado | Card 1 (info secundária) |
| Average SRs/dia agendados | BO `service_requests` / dias do período | ✅ Implementado | Card 2 (info secundária) |
| Receita total gerada | BO (P&L - a definir) | ✅ Implementado | Card 6 (teórico via paid_amount) |
| Taxa de aceitação de serviços | BO `allocation_history` | ✅ Implementado | Card 3 |
| Nº prestadores ativos no período | `service_requests.assigned_provider_id` unique count | ✅ Implementado | Card 4 |
| Satisfação média (Rating) | BO `service_requests.SERVICE_RATING` | ✅ Implementado | Card 5 |

### Implementação Final - 6 Cards ✅

| # | Card | Valor Principal | Info Secundária | Estado |
|---|------|-----------------|-----------------|--------|
| 1 | **Pedidos Submetidos** | Total (`created_at`) | Avg/dia + trend | ✅ |
| 2 | **Pedidos Agendados** | Total (`scheduled_to`) | Avg/dia + trend | ✅ |
| 3 | **Taxa de Aceitação** | % | Trend vs anterior | ✅ |
| 4 | **Prestadores Ativos** | Nº únicos | de X na rede | ✅ |
| 5 | **Satisfação** | Rating ★ | Nº avaliações | ✅ |
| 6 | **Receita Total** | € (s/IVA) | Ticket médio | ✅ |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Serviços por estado | Barras horizontais | BO `service_requests.STATUS` | ✅ Implementado | `ServicesByStatusChart` |
| Ticket Médio e Receita | Linha/Barras | BO | ✅ Implementado | `TicketTrendChart` |

---

## Tab 2: Prestadores (Rede)

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Nº médio serviços por prestador | BO `service_requests` COUNT / unique `assigned_provider_id` | ✅ Implementado | `NetworkSummaryCards` |
| Ratings (Técnico + Serviço) | BO `technician_rating` + `service_rating` | ✅ Implementado | `NetworkSummaryCards` - lado a lado |
| Taxa de cancelamento (indisponibilidade) | BO `cancellation_reason` = "Indisponibilidade de prestadores" / total | ✅ Implementado | `NetworkSummaryCards` |
| Número de reagendamentos | BO `service_requests.reschedule_bo = true` | ✅ Implementado | `NetworkSummaryCards` |
| Serviços com custos adicionais | BO `service_requests.net_additional_charges > 0` | ✅ Implementado | `NetworkSummaryCards` |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Saúde da Rede | Pie chart | CRM + BO | ✅ Implementado | `SlaHealthIndicators` |
| Aceites vs Rejeitados vs Cancelados | Barras verticais | BO `allocation_history` | ✅ Implementado | `AcceptanceTrendChart` |
| Issues detetados | Cards | BO | ✅ Implementado | `CriticalIssuesSummary` |
| Serviços concluídos | Barras verticais | BO `service_requests` | ✅ Implementado | `CompletionTrendChart` |
| Reagendamentos por prestador | Barras horizontais | BO `reschedule_bo` | ✅ Implementado | `ReschedulesByProviderChart` |
| Visitas adicionais por prestador | Barras horizontais | BO `number_additional_visits` | ✅ Implementado | `AdditionalVisitsByProviderChart` |
| Distribuição de Volume | Pie chart | BO | ✅ Implementado | `VolumeDistributionChart` |
| Concentração de Receita | Card + tabela | BO `billing_processes` | ✅ Implementado | `ConcentrationCard` |
| Ranking de Prestadores | Tabela interativa | BO | ✅ Implementado | `UnifiedRankingCard` |

---

## Tab 3: Clientes (NOVA)

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Nr total de clientes registados | BO `/Clientes` export | ❌ Falta | Novo - precisa tabela `clients` |
| Nr clientes ativos (últimos 6 meses) | BO `service_requests` unique `user` where `created_at` >= 6 meses | ❌ Falta | Novo |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Evolução clientes registados | Linha | BO `clients` | ❌ Falta | Novo |
| Clientes novos vs recorrentes | Barras/Pie | BO `service_requests` | ❌ Falta | Novo |
| Top clientes por volume | Tabela ranking | BO `service_requests` | ❌ Falta | Novo |

**Dependência**: Precisa nova tabela `clients` ou coluna identificadora em `service_requests`

---

## Tab 4: Operacionais

### Fonte de Requisitos
> Ver email do Francisco com subject: "Informação Operacional para Dashboard no CRM - Proposta"

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| (A definir com email Francisco) | Collab + CRM | ❌ Falta | - |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Chamadas inbound | Barras | Collab export | ❌ Falta | Precisa integração Collab |
| Chamadas outbound | Barras | Collab export | ❌ Falta | Precisa integração Collab |
| Tarefas OPS por utilizador | Barras | CRM | ❌ Falta | Novo |

**Dependências**:
- Integração com Collab (chamadas)
- Email do Francisco com requisitos detalhados

---

## Tab 5: Reclamações

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Tickets por serviço | Zendesk | ❌ Falta | Precisa integração |
| Tickets por prestador | Zendesk | ❌ Falta | Precisa integração |
| Motivo mais frequente | Zendesk | ❌ Falta | Precisa integração |
| Ranking prestadores + tickets | Zendesk | ❌ Falta | Precisa integração |
| Tickets por canal | Zendesk | ❌ Falta | Precisa integração |

**Dependência**: Integração com Zendesk (a ver com Mariana)

---

## Tab 6: Faturação

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Estado da Faturação (por status) | BO `billing` | ✅ Existe | `PaymentStatusChart` |
| Faturas pendentes por prestador | BO `billing` | ❌ Falta | Novo |
| Faturas com reclamações por prestador | BO `billing` | ❌ Falta | Novo |
| Faturas por receber (diferentes estados) | BO `billing` | 🟡 Parcial | Tem estados mas não breakdown |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Faturação por período | Barras horizontais | BO `billing` | ❌ Falta | Novo |
| Evolução faturação (mensal/trimestral) | Linha | BO `billing` | ❌ Falta | Novo |

---

## Fontes de Dados

| Fonte | Tabela/Export | Estado | Notas |
|-------|---------------|--------|-------|
| CRM | `providers` | ✅ Integrado | |
| CRM | `onboarding_tasks` | ✅ Integrado | |
| BO | `service_requests` | ✅ Integrado | Sync via GitHub Actions |
| BO | `allocation_history` | ✅ Integrado | Sync via GitHub Actions |
| BO | `billing` | ✅ Integrado | Sync via GitHub Actions |
| BO | `clients` (novo) | ❌ Falta | Precisa nova tabela + scrapper |
| Zendesk | tickets | ❌ Não integrado | Precisa integração API |
| Collab | chamadas | ❌ Não integrado | Precisa integração/export |

---

## Componentes Reutilizáveis

Componentes existentes em `/src/components/analytics/` que podem ser reutilizados:

| Componente | Reutilizar em | Notas |
|------------|---------------|-------|
| `AnalyticsFilters` | Todas as tabs | Precisa extensão (filtro prestador, date type) |
| `AnalyticsSummaryCards` | Overview | Precisa novos cards |
| `SlaHealthIndicators` | Prestadores | ✅ Pode usar directamente |
| `CriticalIssuesSummary` | Prestadores | ✅ Pode usar directamente |
| `AcceptanceTrendChart` | Prestadores | Precisa adicionar "cancelados" |
| `CompletionTrendChart` | Prestadores | ✅ Pode usar directamente |
| `ConcentrationCard` | Prestadores | Precisa ajustar para receita real |
| `PaymentStatusChart` | Faturação | ✅ Pode usar directamente |
| `UnifiedRankingCard` | Overview/Prestadores | ✅ Pode usar directamente |

---

## Plano de Implementação

### Fase 1: Overview Geral ⬅️ **ACTUAL**
- [ ] Renomear/mover página de `/analytics` para `/kpis-operacionais`
- [ ] Adicionar card: Nr pedidos agendados (`scheduled_to`)
- [ ] Adicionar card: Average SRs/dia submetidos
- [ ] Adicionar card: Average SRs/dia agendados
- [ ] Adicionar card: Nº prestadores ativos no período
- [ ] Adicionar card: Satisfação média (Rating)
- [ ] Adicionar gráfico: Serviços por estado (barras horizontais)
- [ ] Adicionar filtro: escolha `created_at` vs `scheduled_to`

### Fase 2: Prestadores
- [ ] Adicionar cards em falta
- [ ] Adicionar gráficos: reagendamentos, visitas adicionais
- [ ] Ajustar `AcceptanceTrendChart` para incluir cancelados

### Fase 3: Clientes
- [ ] Criar tabela `clients` no Supabase
- [ ] Criar scrapper para BO `/Clientes`
- [ ] Implementar cards e gráficos

### Fase 4: Faturação
- [ ] Adicionar breakdown por prestador
- [ ] Adicionar gráfico temporal

### Fase 5: Operacionais
- [ ] Aguardar email Francisco
- [ ] Integrar Collab (se disponível)

### Fase 6: Reclamações
- [ ] Integrar Zendesk (com Mariana)
- [ ] Implementar cards e gráficos

---

## Regras de Negócio

1. **Valores monetários**: Sempre **sem IVA**
2. **Clientes ativos**: Clientes com pelo menos 1 SR nos últimos 6 meses (usando `created_at`)
3. **Prestadores ativos**: Prestadores com pelo menos 1 serviço alocado no período
4. **Taxa de aceitação**: `aceites / (aceites + rejeitados + expirados)`
5. **Average SRs/dia**: `total SRs / dias úteis do período` (ou dias totais?)

---

## Notas de Implementação

- Seguir o mesmo padrão visual da página Analytics existente
- Filtros no topo, tabs abaixo, cards KPI, depois gráficos
- Usar Recharts para gráficos
- Server Actions para fetch de dados
- Cores semânticas: verde (OK), âmbar (warning), vermelho (critical)
