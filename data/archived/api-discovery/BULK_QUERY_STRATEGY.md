# Análise de Estratégia: Bulk Queries vs Individual Calls

**Data da Análise:** 09-01-2026
**Objetivo:** Determinar se os endpoints de detalhe suportam bulk queries (múltiplos Service Request IDs)

---

## 🔍 Descoberta Crítica

Após análise dos 27 endpoints de detalhe capturados em `02_detail_page_apis.json`, **CONFIRMAMOS**:

### ❌ Os Endpoints NÃO Suportam Bulk Queries Nativas

**Evidência:**
- Todos os endpoints de detalhe filtram por **CONTEXTO DE PÁGINA** (screenData.variables)
- O `ServiceRequestId` é passado como **variável de contexto da página**, não como parâmetro de query
- Estrutura típica:

```json
{
  "screenData": {
    "variables": {
      "ServiceRequestId": "0",
      "SRCode": "SR11693609",  // Identificador do pedido atual
      "_serviceRequestIdInDataFetchStatus": 1
    }
  },
  "inputParameters": {}  // Vazio na maioria dos casos!
}
```

**Conclusão:** A API OutSystems está desenhada para **renderização de página de detalhe**, não para bulk data export.

---

## 🎯 Estratégias Possíveis

### Opção A: Individual API Calls com Promise.all() ⚠️ VIÁVEL MAS LENTO

**Como funciona:**
```typescript
const serviceRequests = [/* 81 SRs */]

// Para cada tipo de dado (payments, notes, tasks, etc.)
const allPayments = await Promise.all(
  serviceRequests.map(sr => fetchPaymentsForSR(sr.code))
)
```

**Performance Estimada:**
- 81 Service Requests × 10 endpoints de interesse = **810 API calls**
- Com Promise.all (paralelo): ~5-10 chamadas simultâneas
- Tempo estimado: 810 calls ÷ 5 parallel = 162 batches × 1s = **~3 minutos**

**Prós:**
- Funciona com a API atual
- Paralelização reduz tempo
- Não requer alterações na API

**Contras:**
- 810 API calls por sync
- Risco de rate limiting
- Load no servidor OutSystems

### Opção B: Sync Incremental (Apenas SRs Atualizados) ✅ RECOMENDADA

**Como funciona:**
```typescript
// 1. Buscar apenas SRs novos ou atualizados desde último sync
const updatedSRs = await fetchRequests({
  fromDate: lastSyncDate,
  toDate: today
})

// 2. Fazer detail calls apenas para os ~5-10 SRs novos/atualizados
const details = await Promise.all(
  updatedSRs.map(sr => fetchAllDetailsForSR(sr))
)
```

**Performance Estimada:**
- Sync diário: ~10 SRs novos × 10 endpoints = **100 API calls**
- Tempo: ~1 minuto
- Sync inicial (backfill): Mesma performance que Opção A

**Prós:**
- ✅ Reduz calls em 90% após sync inicial
- ✅ Mantém dados atualizados
- ✅ Load reduzido no servidor
- ✅ Funciona com API atual

**Contras:**
- Primeiro sync continua lento (810 calls)
- Requer tracking de `last_sync_date`

### Opção C: Só Fetch Detail "On-Demand" 🎯 HÍBRIDO

**Como funciona:**
```typescript
// 1. Sync apenas dados principais (MVP atual - 4 endpoints)
await syncMainData()  // 4 API calls, 81 SRs com 21 campos

// 2. Na UI, quando user abre detalhe de um SR:
async function openProviderDetail(srCode) {
  // Verificar se já temos detail data
  const cached = await getDetailFromSupabase(srCode)

  if (!cached || isStale(cached)) {
    // Fetch detail apenas deste SR (lazy load)
    await fetchAndCacheDetailForSR(srCode)
  }

  // Mostrar detalhe
  showDetail(srCode)
}
```

**Performance:**
- Sync agendado: **4 API calls** (mesmo que MVP atual!)
- User interaction: 1 SR × 10 endpoints = **10 API calls** (só quando necessário)
- 90% dos SRs nunca precisam de detail fetch

**Prós:**
- ✅ Sync extremamente rápido (4.36s)
- ✅ Zero overhead para SRs não visualizados
- ✅ Detail data sempre fresh quando acedido
- ✅ User não nota diferença (cache + lazy load)

**Contras:**
- Ligeiro delay na primeira abertura de detalhe (1-2s)
- Requer lógica de cache na UI

---

## 📊 Comparação de Estratégias

| Métrica | Opção A (Bulk) | Opção B (Incremental) | Opção C (Lazy) |
|---------|----------------|----------------------|----------------|
| **Sync inicial** | 810 calls, 3 min | 810 calls, 3 min | 4 calls, 4s |
| **Sync diário** | 810 calls, 3 min | 100 calls, 1 min | 4 calls, 4s |
| **Total calls/mês** | 24,300 | 3,000 | 120 + on-demand |
| **Freshness** | Até 24h stale | Até 24h stale | Real-time |
| **Complexidade** | Baixa | Média | Média-Alta |

---

## 🚀 Recomendação Final: Opção C (Lazy Load)

### Estratégia Híbrida Otimizada

**Fase 1 - Sync Scheduled (Cron):**
```typescript
// Mantém MVP atual - apenas 4 endpoints principais
await syncMainData()  // 81 SRs, 21 campos cada, 4.36s
```

**Fase 2 - Detail On-Demand (UI):**
```typescript
// Quando user clica num SR para ver detalhe
const detail = await getOrFetchDetail(srCode)

async function getOrFetchDetail(srCode) {
  // 1. Tentar cache da Supabase
  let detail = await supabase
    .from('service_request_details')
    .select('*')
    .eq('sr_code', srCode)
    .single()

  // 2. Se não existe ou está stale (>7 dias), fetch da API
  if (!detail || isStale(detail.fetched_at)) {
    detail = await fetchDetailFromOutSystems(srCode)
    await upsertDetailInSupabase(detail)
  }

  return detail
}
```

**Vantagens desta Abordagem:**
1. ✅ Sync agendado continua **ultrarrápido** (4.36s)
2. ✅ Apenas faz detail calls quando **realmente necessário**
3. ✅ Dados sempre **atualizados** quando acedidos
4. ✅ **90% dos SRs nunca precisam** de detail fetch (típico: só 10% são visualizados)
5. ✅ User experience **não degrada** (cache + background refresh)

---

## 🔧 Endpoints de Detalhe Identificados (Para Lazy Load)

Prioridade por frequência de uso estimada:

### TIER 1 - Fetch Sempre (Alta Prioridade)
1. **ScreenDataSetGetServiceRequestPayments** - Histórico de pagamentos
2. **DataActionFetchNotes** - Notas de negócio
3. **ScreenDataSetGetTasks** - Tarefas do pedido
4. **DataActionFetchPriceBreakdown** - Breakdown de preços

### TIER 2 - Fetch Se Necessário (Média Prioridade)
5. **ScreenDataSetGetServiceRequestClient** - Dados completos do cliente
6. **ScreenDataSetGetServiceRequestProvider** - Dados completos do prestador
7. **ScreenDataSetGetAdditionalVisitsByServiceRequestId** - Visitas adicionais
8. **DataActionGetAdditionalCharges** - Encargos adicionais

### TIER 3 - Fetch Raramente (Baixa Prioridade)
9. **ScreenDataSetGetDocuments** - Documentos anexados
10. **ScreenDataSetGetServiceRequestPhotosByServiceRequestId** - Fotos

---

## 📝 Estrutura de Payload para Detail Calls

**Exemplo: Fetch payments para SR116935**

```typescript
const payload = {
  versionInfo: {
    moduleVersion: "Bt6C82gdDc1aqSyWDB5hBQ",
    apiVersion: "vJd+X_B+EMkPLyEY8d68XA"  // Específico para payments
  },
  viewName: "MainFlow.ServiceRequestDetail",
  screenData: {
    variables: {
      ServiceRequestId: "0",  // Sempre "0" no contexto de página
      SRCode: "SR116935",     // CHAVE: Este é o filtro real!
      _serviceRequestIdInDataFetchStatus: 1,
      _sRCodeInDataFetchStatus: 1
    }
  },
  inputParameters: {}
}
```

**IMPORTANTE:** O filtro é feito via `SRCode` (ex: "SR116935"), **NÃO** via `ServiceRequestId`.

---

## 🎯 Próximos Passos

### Implementação Recomendada

1. ✅ **Manter MVP sync** (4 endpoints, 4.36s) - JÁ FUNCIONA
2. 🔜 **Criar `fetchDetailForSR(srCode)` helper** - Fetch 1 SR, todos os endpoints de detalhe
3. 🔜 **Criar tabela `service_request_details` na Supabase** - Cache de detail data
4. 🔜 **Adicionar lazy load na UI** - Quando user abre detalhe de SR
5. 🔜 **Adicionar background refresh** - Se detail data >7 dias, refresh async

### Estrutura do Helper

```typescript
// /scripts/fetch-sr-detail.ts
async function fetchDetailForSR(srCode: string, auth: AuthData) {
  const detailEndpoints = [
    { name: 'payments', apiVersion: 'vJd+X_B+EMkPLyEY8d68XA', url: '...' },
    { name: 'notes', apiVersion: 'pudlwd5Uh1vtjt8RLdo0UA', url: '...' },
    { name: 'tasks', apiVersion: 'FpBW_xO1WQs784QJUPt3qQ', url: '...' },
    // ... resto dos endpoints
  ]

  const results = await Promise.all(
    detailEndpoints.map(async endpoint => {
      const data = await fetchEndpoint(endpoint, auth, srCode)
      return { [endpoint.name]: data }
    })
  )

  return Object.assign({}, ...results, { srCode, fetchedAt: new Date() })
}
```

---

## 📊 Estimativa de Savings

**Cenário:** 1000 Service Requests no sistema, 100 novos/mês, 10% visualizados

| Abordagem | Calls/Mês | Tempo/Sync | Load no Server |
|-----------|-----------|------------|----------------|
| **Bulk (todos os SRs, sempre)** | 30,000 | 3 min | Alto 🔴 |
| **Incremental (só atualizados)** | 3,000 | 1 min | Médio 🟡 |
| **Lazy (só MVP + on-demand)** | 120 + 1,000 = 1,120 | 5s | Baixo 🟢 |

**Redução:** **96% menos API calls** com lazy load!

---

## ⚠️ Avisos Importantes

1. **Rate Limiting**: Se fizer bulk calls (Opção A), DEVE implementar rate limiting (max 5 calls/segundo)
2. **CSRF Token**: Token expira - fazer re-auth se 401/403
3. **API Versions**: Tokens `apiVersion` podem mudar - monitorizar erros
4. **MaxRecords**: Alguns endpoints têm paginação (ex: Documents usa MaxRecords: 1000)

---

## ✅ Conclusão

**A tua ideia inicial de bulk queries não é suportada nativamente pela API OutSystems.**

**MAS** - A estratégia **Lazy Load (Opção C)** é MELHOR que bulk queries porque:
- Sync agendado continua ultrarrápido (4.36s)
- Apenas faz detail calls quando necessário (90% savings)
- Dados sempre frescos quando acedidos
- User experience não degrada

**Próximo passo:** Implementar `fetchDetailForSR()` helper e lazy load na UI de detalhe do prestador.
