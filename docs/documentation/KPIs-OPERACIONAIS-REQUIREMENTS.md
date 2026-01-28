# KPIs Operacionais - Requisitos e Acompanhamento

> **Página**: `/analytics`
> **Última actualização**: 29 Janeiro 2026
> **Fonte de requisitos**: `data/Dados operacionais_20012026.xlsx` (equipa OPS)

---

## Análise do Ficheiro "Dados operacionais_20012026.xlsx"

O ficheiro da equipa operacional define **7 temas** de dados com diferentes fontes e periodicidades:

| # | Tema | Fonte | Periodicidade | Estado CRM |
|---|------|-------|---------------|------------|
| 1 | Chamadas (Inbound/Outbound) | Collab | Mensal | ❌ Não integrado |
| 2 | Canais escritos (Tickets) | Zendesk | Mensal | ❌ Não integrado |
| 3 | Tarefas | BO | Semanal | 🟡 Parcial (CRM tasks) |
| 4 | Faturação | BO | Semanal | ✅ Integrado (`billing_processes`) |
| 5 | Reclamações (faturas) | BO | Semanal | 🟡 Parcial |
| 6 | Recorrências | BO | Semanal | ✅ Integrado (`recurrences`) |
| 7 | Serviços | BO | Semanal | ✅ Integrado (`service_requests`) |

---

## Estrutura de Tabs

| # | Tab | Estado | Notas |
|---|-----|--------|-------|
| 1 | Overview Geral | ✅ Concluído | Cards + Gráficos implementados |
| 2 | Prestadores (Rede) | ✅ Concluído | 5 KPI cards + 9 gráficos |
| 3 | Clientes | ✅ Concluído | 5 KPI cards + 6 gráficos |
| 4 | Operacionais | ❌ Por fazer | Depende de Collab + BO Tarefas |
| 5 | Reclamações | ❌ Por fazer | Depende de Zendesk |
| 6 | Faturação | 🟡 Parcial | Precisa breakdown reclamações |
| 7 | Recorrências | ✅ Concluído | 5 KPI cards + 6 gráficos |

**Total: 7 tabs** (adicionada tab Recorrências)

---

## Filtros Globais (Barra de Topo)

| Filtro | Estado | Notas |
|--------|--------|-------|
| Intervalo de datas (range picker) | ✅ Existe | `AnalyticsFilters` |
| Presets rápidos (7d, 30d, 90d, etc.) | ✅ Existe | Inclui "Todo o período (desde 2023)" |
| Períodos de alocação (meses) | ✅ Existe | Labels formatados como "Janeiro 2026" |
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

## Tab 2: Prestadores (Rede) / Serviços

### Fonte de Requisitos
> `Dados operacionais_20012026.xlsx` - Tema: Serviços

### Métricas Requeridas pelo Excel

| Métrica | Detalhe | Estado |
|---------|---------|--------|
| Serviços em curso | Total de SRs com status "em curso" | ✅ Implementado (`ServicesByStatusChart`) |
| Nº serviços por concelho | Agrupado por localização | ✅ Implementado (`NetworkMapboxMap` em `/rede`) |
| Nº tipo de serviços | Por categoria/serviço | ✅ Implementado (gráficos Overview) |
| Nº serviços/prestador | Volume por prestador | ✅ Implementado (`VolumeDistributionChart`, `UnifiedRankingCard`) |
| Piloto contacto com motivo | Serviços onde foi ativado piloto | ❌ Falta - verificar campo no BO |
| Visitas adicionais agendadas | `number_additional_visits > 0` | ✅ Implementado (`AdditionalVisitsByProviderChart`) |
| Taxa cancelamento por tipologia | Por tipo de serviço + motivos | 🟡 Parcial - tem total, falta breakdown |
| Reagendamentos (backoffice) | `reschedule_bo = true` | ✅ Implementado (`ReschedulesByProviderChart`) |
| Custos adicionais por prestador/serviço | `net_additional_charges > 0` | ✅ Implementado (KPI card, falta gráfico) |

### Cards KPI ✅ Implementados

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Nº médio serviços por prestador | BO `service_requests` COUNT / unique `assigned_provider_id` | ✅ Implementado | `NetworkSummaryCards` |
| Ratings (Técnico + Serviço) | BO `technician_rating` + `service_rating` | ✅ Implementado | `NetworkSummaryCards` - lado a lado |
| Taxa de cancelamento (indisponibilidade) | BO `cancellation_reason` = "Indisponibilidade de prestadores" / total | ✅ Implementado | `NetworkSummaryCards` |
| Número de reagendamentos | BO `service_requests.reschedule_bo = true` | ✅ Implementado | `NetworkSummaryCards` |
| Serviços com custos adicionais | BO `service_requests.net_additional_charges > 0` | ✅ Implementado | `NetworkSummaryCards` |

### Gráficos ✅ Implementados

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

### Gráficos ❌ Em Falta

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Taxa cancelamento por tipo de serviço | Barras | BO | ❌ Falta | Novo |
| Cancelamentos por motivo | Barras/Pie | BO `cancellation_reason` | ❌ Falta | Novo |
| Custos adicionais por serviço | Barras | BO | ❌ Falta | Novo |

### Métricas Agendamentos/Reagendamentos

> `Dados operacionais_20012026.xlsx` - Tema: Agendamentos/reagendamentos

| Métrica | Detalhe | Estado |
|---------|---------|--------|
| Serviços com atraso por prestador | Analisar volume com atenção ao nº serviços/mês | ❌ Falta |
| Serviços reagendados por prestador | Com contexto do volume total | ✅ Implementado |
| Serviços cancelados por prestador | Com contexto do volume total | 🟡 Parcial (só indisponibilidade) |

---

## Tab 3: Clientes ✅ CONCLUÍDO

### Fonte de Dados
> Tabela `clients` (54 colunas) - sincronizada semanalmente via GitHub Actions (`sync-clients.yml`)

### Cards KPI ✅ Implementados

| # | Card | Valor Principal | Info Secundária | Estado | Componente |
|---|------|-----------------|-----------------|--------|------------|
| 1 | **Total Clientes** | COUNT total | Ativos (% do total) | ✅ | `ClientsSummaryCards` |
| 2 | **Clientes Ativos** | COUNT com `last_request` nos últimos 6 meses | % do total | ✅ | `ClientsSummaryCards` |
| 3 | **Ticket Médio/Cliente** | `SUM(total_payments) / COUNT(clientes com pagamentos)` | - | ✅ | `ClientsSummaryCards` |
| 4 | **Recorrências Ativas** | SUM(`active_overall_recurrencies`) | Nº clientes com recorrências (%) | ✅ | `ClientsSummaryCards` |
| 5 | **Wallets Ativas** | COUNT `wallet_is_active = true` | Saldo médio | ✅ | `ClientsSummaryCards` |

### Gráficos ✅ Implementados

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Evolução de Registos | Barras + Linha (ComposedChart) | `clients.registration` agrupado por mês | ✅ | `ClientRegistrationTrendChart` |
| Clientes por Status | Donut (PieChart) | `clients.client_status` | ✅ | `ClientStatusChart` |
| Distribuição de Pedidos | Barras horizontais | `clients.total_requests` (buckets: 0, 1, 2-5, 6-10, 11-20, 21+) | ✅ | `ClientRequestDistributionChart` |
| Plataforma de Registo | Donut (PieChart) | `clients.device_platform_customer_registration` | ✅ | `ClientPlatformChart` |
| Top Clientes por Volume | Tabela ranking | `clients` ORDER BY `total_requests` DESC LIMIT 10 | ✅ | `TopClientsTable` |
| Clientes por Cidade | Barras horizontais | `clients.city` GROUP BY, top 15 | ✅ | `ClientsByCityChart` |

### Server Actions

| Função | Retorno | Ficheiro |
|--------|---------|----------|
| `getClientsSummary()` | `ClientsSummary` | `clients-actions.ts` |
| `getClientRegistrationTrend()` | `ClientRegistrationTrendPoint[]` | `clients-actions.ts` |
| `getClientStatusDistribution()` | `ClientStatusItem[]` | `clients-actions.ts` |
| `getClientRequestDistribution()` | `ClientRequestBucket[]` | `clients-actions.ts` |
| `getClientPlatformDistribution()` | `ClientPlatformItem[]` | `clients-actions.ts` |
| `getTopClients(limit)` | `TopClient[]` | `clients-actions.ts` |
| `getClientsByCity(limit)` | `ClientCityItem[]` | `clients-actions.ts` |

### Notas
- Filtros de data aplicam-se usando o campo `registration` (data de registo)
- Default "Mês atual" aplica-se automaticamente ao abrir a página
- Cards KPI incluem comparação com período anterior e trends
- O gráfico de Evolução de Registos usa granularidade dinâmica (dia/semana/mês)
- Clientes ativos = `last_request` nos últimos 6 meses

---

## Tab 4: Operacionais

### Fonte de Requisitos
> `Dados operacionais_20012026.xlsx` - Temas: Chamadas, Tarefas

### 4.1 Chamadas (Collab)

| Métrica | Detalhe | Fonte | Periodicidade | Estado |
|---------|---------|-------|---------------|--------|
| **Inbound Clientes** | Volume por hora, matriz seg-dom por intervalo horário, tempo médio de espera | Collab - "Detalhe de Chamadas" | Mensal | ❌ Não integrado |
| **Inbound Prestadores** | Volume por hora, matriz seg-dom por intervalo horário, tempo médio de espera | Collab - "Detalhe de Chamadas Prestadores" | Mensal | ❌ Não integrado |
| **Outbound por operador** | Chamadas realizadas/atendidas/abandonadas por colaborador | Collab - "Agent Summary Report" | Mensal | ❌ Não integrado |

### 4.2 Tarefas (BO)

| Métrica | Detalhe | Fonte | Periodicidade | Estado |
|---------|---------|-------|---------------|--------|
| Nº tarefas por tipologia | Agrupado por tipo de tarefa | BO - "TaskList" | Semanal | ❌ Precisa scrapper |
| Tempo médio tratamento por tipologia | Por tipo de tarefa | BO - "TaskList" | Semanal | ❌ Precisa scrapper |
| Tarefas criadas vs concluídas/colaborador | Por utilizador OPS | BO - "TaskList" | Semanal | ❌ Precisa scrapper |

### Gráficos Propostos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Chamadas inbound por hora (heatmap) | Heatmap seg-dom | Collab | ❌ Falta | Novo - precisa dados |
| Chamadas outbound por operador | Barras horizontais | Collab | ❌ Falta | Novo - precisa dados |
| Tarefas por tipologia | Barras/Pie | BO TaskList | ❌ Falta | Novo - precisa scrapper |
| Tarefas criadas vs concluídas | Barras agrupadas | BO TaskList | ❌ Falta | Novo - precisa scrapper |

**Dependências**:
- Integração/Export Collab (chamadas)
- Scrapper BO TaskList (tarefas backoffice)

---

## Tab 5: Reclamações / Tickets

### Fonte de Requisitos
> `Dados operacionais_20012026.xlsx` - Tema: Canais escritos (Zendesk)

### Métricas Requeridas

| Métrica | Detalhe | Fonte | Periodicidade | Estado |
|---------|---------|-------|---------------|--------|
| **Tipo de ticket** | Por tipo de serviço e data criação | Zendesk - "Tipo_de_ticket_por_Criação" | Mensal | ❌ Não integrado |
| **Tickets por canal** | Email, chat, telefone, etc. | Zendesk - "#_tickets_por_canal" | Mensal | ❌ Não integrado |
| **Tickets por serviço** | Por tipo de serviço FIXO | Zendesk - "#_de_tickets_por_tipo_de_serviço" | Mensal | ❌ Não integrado |

### Cards KPI Propostos

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Total tickets no período | Zendesk | ❌ Falta | Novo |
| Tickets por tipo de serviço | Zendesk | ❌ Falta | Novo |
| Tickets por canal | Zendesk | ❌ Falta | Novo |
| Ranking prestadores + tickets | Zendesk | ❌ Falta | Novo |

### Gráficos Propostos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Tickets por tipo de serviço | Barras/Pie | Zendesk | ❌ Falta | Novo |
| Tickets por canal | Pie chart | Zendesk | ❌ Falta | Novo |
| Evolução tickets mensal | Linha | Zendesk | ❌ Falta | Novo |

**Dependência**: Integração com Zendesk API ou imports CSV

---

## Tab 6: Faturação

### Fonte de Requisitos
> `Dados operacionais_20012026.xlsx` - Temas: Faturação, Reclamações (faturas)

### Métricas Requeridas

| Métrica | Detalhe | Fonte | Periodicidade | Estado |
|---------|---------|-------|---------------|--------|
| **Estados de faturação** | Visão do prestador com diferentes estados | BO - "ProviderBillingProcesses" | Semanal | ✅ Integrado |
| **Faturas com reclamação** | Volume por prestador | BO - "ProviderBillingProcesses" | Semanal | 🟡 Parcial |

### Cards KPI

| Card | Fonte | Estado | Componente |
|------|-------|--------|------------|
| Estado da Faturação (por status) | BO `billing_processes` | ✅ Existe | `PaymentStatusChart` |
| Faturas pendentes por prestador | BO `billing_processes` | ❌ Falta | Novo |
| Faturas com reclamações por prestador | BO `billing_processes` | ❌ Falta | Novo |
| Faturas por receber (diferentes estados) | BO `billing_processes` | 🟡 Parcial | Tem estados mas não breakdown |

### Gráficos

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Faturação por período | Barras horizontais | BO `billing_processes` | ❌ Falta | Novo |
| Evolução faturação (mensal/trimestral) | Linha | BO `billing_processes` | ❌ Falta | Novo |
| Faturas com reclamação por prestador | Barras horizontais | BO `billing_processes` | ❌ Falta | Novo |

---

## Tab 7: Recorrências ✅ CONCLUÍDO

### Fonte de Dados
> Tabela `recurrences` (18 colunas) - sincronizada semanalmente via GitHub Actions (`sync-recurrences.yml`)
> Scrapper: `export-recurrences-data.ts` → Excel do BO "ServiceRequestRecurrencies"
> Data field para filtros: `submission_date` (formato DD-MM-YYYY HH:mm no Excel)

### Métricas Requeridas

| Métrica | Detalhe | Fonte | Periodicidade | Estado |
|---------|---------|-------|---------------|--------|
| **Recorrências ativas vs inativas** | Total e filtro por estado (`Ativa`/`Inativa`) | BO - "Recurrence" | Semanal | ✅ Implementado |
| **Recorrências por concelho** | Agrupado por `address_district` | BO - "Recurrence" | Semanal | ✅ Implementado |
| **Recorrências por tipo de serviço** | Agrupado por `service` | BO - "Recurrence" | Semanal | ✅ Implementado |
| **Recorrências por periodicidade** | Agrupado por `recurrence_type` | BO - "Recurrence" | Semanal | ✅ Implementado |

### Métricas Futuras (fase 2)

| Métrica | Detalhe | Fonte |
|---------|---------|-------|
| Prestadores alocados por recorrência | Qual prestador faz cada recorrência | BO |
| Dia da semana e hora | Quando ocorre cada recorrência | BO |

### Cards KPI ✅ Implementados

| # | Card | Valor Principal | Info Secundária | Estado | Componente |
|---|------|-----------------|-----------------|--------|------------|
| 1 | **Total Recorrências** | COUNT total no período | Trend vs período anterior | ✅ | `RecurrencesSummaryCards` |
| 2 | **Recorrências Ativas** | COUNT com `recurrence_status = 'Ativa'` | % do total + trend | ✅ | `RecurrencesSummaryCards` |
| 3 | **Taxa de Inativação** | % inativas / total | Trend invertido (subida = negativo) | ✅ | `RecurrencesSummaryCards` |
| 4 | **Serviços Distintos** | COUNT DISTINCT `service` | Top serviço + trend | ✅ | `RecurrencesSummaryCards` |
| 5 | **Concelhos** | COUNT DISTINCT `address_district` | Top concelho + trend | ✅ | `RecurrencesSummaryCards` |

### Gráficos ✅ Implementados

| Gráfico | Tipo | Fonte | Estado | Componente |
|---------|------|-------|--------|------------|
| Evolução de Recorrências | Barras + Área (ComposedChart) | `recurrences.submission_date` agrupado por dia/semana/mês | ✅ | `RecurrenceTrendChart` |
| Status de Recorrências | Donut (PieChart) | `recurrences.recurrence_status` (Ativa/Inativa) | ✅ | `RecurrenceStatusChart` |
| Tipo de Recorrência | Donut (PieChart) | `recurrences.recurrence_type` (periodicidade) | ✅ | `RecurrenceTypeChart` |
| Top Serviços | Barras horizontais | `recurrences.service` top 10 | ✅ | `RecurrencesByServiceChart` |
| Motivos de Inativação | Barras horizontais (vermelho) | `recurrences.inactivation_reason` top 10 | ✅ | `InactivationReasonsChart` |
| Top Concelhos | Barras horizontais (roxo) | `recurrences.address_district` top 15 | ✅ | `RecurrencesByDistrictChart` |

### Server Actions

| Função | Retorno | Ficheiro |
|--------|---------|----------|
| `getRecurrencesSummary(filters)` | `RecurrencesSummary` | `recurrences-actions.ts` |
| `getRecurrenceTrend(filters)` | `RecurrenceTrendPoint[]` | `recurrences-actions.ts` |
| `getRecurrenceStatusDistribution(filters)` | `RecurrenceStatusItem[]` | `recurrences-actions.ts` |
| `getRecurrencesByService(limit, filters)` | `RecurrenceServiceItem[]` | `recurrences-actions.ts` |
| `getRecurrenceTypeDistribution(filters)` | `RecurrenceTypeItem[]` | `recurrences-actions.ts` |
| `getInactivationReasons(limit, filters)` | `InactivationReasonItem[]` | `recurrences-actions.ts` |
| `getRecurrencesByDistrict(limit, filters)` | `RecurrenceDistrictItem[]` | `recurrences-actions.ts` |

### Notas
- Filtros de data aplicam-se usando `submission_date`
- Default "Mês atual" aplica-se automaticamente ao abrir a página
- Cards KPI incluem comparação com período anterior e trends
- Gráfico de evolução usa granularidade dinâmica (dia ≤31d, semana ≤90d, mês >90d)
- Status aceites: `Ativa`/`Active` (case-insensitive)
- Scrapper navega primeiro para `/Login`, autentica, e depois vai para `/ServiceRequestRecurrencies`
- Datas no Excel vêm como texto `DD-MM-YYYY HH:mm` (não serial numbers)

---

## Fontes de Dados

### Integradas ✅

| Fonte | Tabela/Export | Periodicidade | Scrapper/Integração |
|-------|---------------|---------------|---------------------|
| CRM | `providers` | Tempo real | Nativo |
| CRM | `onboarding_tasks` | Tempo real | Nativo |
| BO | `service_requests` | Semanal (seg 06:00) | GitHub Actions |
| BO | `allocation_history` | Semanal (seg 07:30) | GitHub Actions |
| BO | `billing_processes` | Semanal (seg 06:30) | GitHub Actions |
| BO | `backoffice_providers` | Semanal (seg 07:00) | GitHub Actions |
| BO | `clients` | Semanal | GitHub Actions |
| BO | `recurrences` | Semanal (seg 08:30) | GitHub Actions |

### Não Integradas ❌

| Fonte | Export BO | Periodicidade | Prioridade | Notas |
|-------|-----------|---------------|------------|-------|
| BO | TaskList | Semanal | 🟡 Média | Tarefas do backoffice (não CRM) |
| Zendesk | Tickets | Mensal | 🔴 Alta | Reclamações/tickets |
| Collab | Chamadas | Mensal | 🟢 Baixa | Pode usar imports manuais |

### Reports Externos (imports manuais possíveis)

| Report | Fonte | Ficheiro Exemplo |
|--------|-------|------------------|
| Detalhe de Chamadas | Collab | "Detalhe de Chamadas" (sheet Clientes + Prestadores) |
| Agent Summary Report | Collab | "Agent Summary Report" |
| Tipo de ticket | Zendesk | "Tipo_de_ticket_por_Criação..." |
| Tickets por canal | Zendesk | "#_tickets_por_canal..." |
| Tickets por serviço | Zendesk | "#_de_tickets_por_tipo_de_serviço..." |

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
| `RecurrencesSummaryCards` | Recorrências | ✅ 5 KPI cards com trends |
| `RecurrenceTrendChart` | Recorrências | ✅ ComposedChart barras + área |
| `RecurrenceStatusChart` | Recorrências | ✅ Donut Ativa/Inativa |
| `RecurrenceTypeChart` | Recorrências | ✅ Donut periodicidade |
| `RecurrencesByServiceChart` | Recorrências | ✅ Barras horizontais top serviços |
| `InactivationReasonsChart` | Recorrências | ✅ Barras horizontais motivos |
| `RecurrencesByDistrictChart` | Recorrências | ✅ Barras horizontais top concelhos |

---

## Plano de Implementação

### Fase 1: Overview Geral ✅ CONCLUÍDO
- [x] Cards KPI (6 cards)
- [x] Gráficos (serviços por estado, ticket trend)

### Fase 2: Prestadores (Rede) ✅ CONCLUÍDO
- [x] 5 KPI cards (`NetworkSummaryCards`)
- [x] 9 gráficos implementados
- [ ] Gráfico: Taxa cancelamento por tipo de serviço
- [ ] Gráfico: Cancelamentos por motivo
- [ ] Gráfico: Custos adicionais por serviço

### Fase 3: Clientes ✅ CONCLUÍDO
- [x] Criar scrapper BO `/Clientes` (GitHub Actions)
- [x] Criar tabela `clients` no Supabase (54 colunas)
- [x] Implementar 5 KPI cards (`ClientsSummaryCards`)
- [x] Implementar 6 gráficos (registos, status, pedidos, plataforma, top clientes, cidades)

### Fase 4: Faturação 🟡 PARCIAL
- [x] Estados de faturação (`PaymentStatusChart`)
- [ ] Breakdown reclamações por prestador
- [ ] Gráfico temporal faturação

### Fase 5: Operacionais ❌ POR FAZER
- [ ] Decidir: integração Collab vs imports manuais
- [ ] Criar scrapper BO TaskList (tarefas backoffice)
- [ ] Implementar heatmap chamadas
- [ ] Implementar tarefas por utilizador

### Fase 6: Reclamações/Tickets ❌ POR FAZER
- [ ] Decidir: integração Zendesk API vs imports manuais
- [ ] Implementar cards e gráficos

### Fase 7: Recorrências ✅ CONCLUÍDO
- [x] Criar scrapper BO Recurrence (`export-recurrences-data.ts`)
- [x] Criar tabela `recurrences` no Supabase (18 colunas)
- [x] GitHub Actions workflow (`sync-recurrences.yml`, segundas 08:30)
- [x] Implementar 5 KPI cards (`RecurrencesSummaryCards`)
- [x] Implementar 6 gráficos (evolução, status, tipo, serviços, inativação, concelhos)
- [x] Corrigir parsing de datas DD-MM-YYYY HH:mm (Excel exporta texto, não serial numbers)
- [x] Corrigir login do scrapper (navegar para `/Login` antes da página alvo)

---

## Regras de Negócio

1. **Valores monetários**: Sempre **sem IVA**
2. **Clientes ativos**: Clientes com pelo menos 1 SR nos últimos 6 meses (usando `created_at`)
3. **Prestadores ativos**: Prestadores com pelo menos 1 serviço alocado no período
4. **Taxa de aceitação**: `aceites / (aceites + rejeitados + expirados)`
5. **Average SRs/dia**: `total SRs / dias úteis do período` (ou dias totais?)

---

## Resumo de Gaps (Excel vs Implementado)

### O que FALTA para cobrir o Excel

| Tema Excel | O que Falta | Prioridade | Dependência |
|------------|-------------|------------|-------------|
| **Chamadas** | Tudo (heatmap, outbound por operador) | 🟢 Baixa | Collab exports |
| **Canais escritos** | Tudo (tickets por tipo/canal/serviço) | 🔴 Alta | Zendesk |
| **Tarefas** | Tarefas BO (não CRM) por tipologia/colaborador | 🟡 Média | Scrapper TaskList |
| **Faturação** | Reclamações por prestador | 🟡 Média | Já tem dados |
| **Recorrências** | ~~Tudo (nova tab)~~ | ✅ Concluído | Scrapper + tab implementados |
| **Serviços** | Cancel. por tipo, custos adicionais por serviço | 🟢 Baixa | Já tem dados |
| **Agendamentos** | Serviços com atraso por prestador | 🟡 Média | Já tem dados |

### O que JÁ ESTÁ IMPLEMENTADO

| Tema Excel | Cobertura |
|------------|-----------|
| Serviços em curso | ✅ `ServicesByStatusChart` |
| Serviços por concelho | ✅ `/rede` mapa |
| Serviços por tipo | ✅ Gráficos Overview |
| Serviços/prestador | ✅ `VolumeDistributionChart`, `UnifiedRankingCard` |
| Visitas adicionais | ✅ `AdditionalVisitsByProviderChart` |
| Reagendamentos | ✅ `ReschedulesByProviderChart`, KPI card |
| Custos adicionais | ✅ KPI card (total) |
| Estados faturação | ✅ `PaymentStatusChart` |

---

## Notas de Implementação

- Seguir o mesmo padrão visual da página Analytics existente
- Filtros no topo, tabs abaixo, cards KPI, depois gráficos
- Usar Recharts para gráficos
- Server Actions para fetch de dados
- Cores semânticas: verde (OK), âmbar (warning), vermelho (critical)

---

## Próximos Passos Recomendados

1. **Tab Recorrências** - Implementar nova tab com dados da tabela `recurrences` (scrapper já existe)
2. **Gráficos Tab 2 (Rede)** - Adicionar os 3 gráficos em falta (cancel. por tipo, por motivo, custos adicionais)
3. **Tab Tarefas/Operacionais** - Implementar gráficos com dados da tabela `tasks` (scrapper já existe)
4. **Zendesk** - Decidir integração API vs imports CSV manuais
