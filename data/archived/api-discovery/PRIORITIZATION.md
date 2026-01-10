# Priorização de Endpoints - Backoffice Sync System

**Data:** 09-01-2026
**Total de Endpoints Descobertos:** 34 (7 listagem + 27 detalhe)

---

## 📊 Matriz de Priorização

### ⭐ TIER 1: CRITICAL - MVP Essencial (Implementar Primeiro)

Estes endpoints fornecem os **dados core** que já mapeamos na tabela `service_requests`. São suficientes para ter um sync funcional.

#### 1. **ScreenDataSetGetRequests** 🔴 CRÍTICO
**URL:** `/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests`

**Prioridade:** MÁXIMA - Este é o endpoint PRINCIPAL do sistema

**Dados Fornecidos:**
- ServiceRequestCode (PK para upsert)
- FIDID
- ProviderName
- Service, Category, Cluster
- ServiceRequestStatusName
- ServiceRequestCreatedAt
- ServiceRequestSchedullingDateTime
- ServiceRequestDeliveryDatetime
- Pricing info (CostEstimation, FinalCostEstimation, etc.)
- Client district, town
- Address info
- ~20-25 campos essenciais

**Overlap com `service_requests` table:** ~80% dos campos principais

**Volume de Dados:** 5720 registos totais (no backoffice atual)

**Sync Strategy:**
- Date range filters: `FromSubmissionDate` / `ToSubmissionDate`
- MaxRecords: 10000 por chamada
- Upsert por `ServiceRequestCode`

**Justificação:**
Este endpoint retorna praticamente TODOS os campos que já temos na tabela `service_requests`. Com apenas este endpoint, conseguimos ter um sistema funcional de sync.

---

#### 2. **ScreenDataSetGetCategories** 🟡 METADATA
**URL:** `/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetCategories`

**Prioridade:** ALTA - Lookup table essencial

**Dados Fornecidos:**
- Lista de categorias de serviços (Limpeza, Canalizador, Eletricista, etc.)
- CategoryId → Category name mapping

**Overlap com `service_requests`:** Enriquece o campo `category`

**Volume:** ~10-20 categorias (pequeno, cache em memória)

**Sync Strategy:**
- Chamar UMA VEZ no início do sync
- Cache em memória durante o processo
- Não precisa de date filters

**Justificação:**
O endpoint principal retorna `CategoryId`. Este endpoint permite fazer o mapping para nomes legíveis.

---

#### 3. **ScreenDataSetGetDistricts** 🟡 METADATA
**URL:** `/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetDistricts`

**Prioridade:** ALTA - Lookup table essencial

**Dados Fornecidos:**
- Lista de distritos (Lisboa, Porto, Setúbal, etc.)
- DistrictId → District name mapping

**Overlap com `service_requests`:** Enriquece o campo `client_district`

**Volume:** ~18 distritos (pequeno, cache em memória)

**Sync Strategy:**
- Chamar UMA VEZ no início do sync
- Cache em memória durante o processo

**Justificação:**
Similar às categorias, permite enriquecer dados de localização.

---

#### 4. **ScreenDataSetGetServiceRequestStatus** 🟡 METADATA
**URL:** `/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetServiceRequestStatus`

**Prioridade:** ALTA - Lookup table essencial

**Dados Fornecidos:**
- Lista de status possíveis (Novo pedido, Prestador atribuído, Em execução, etc.)
- StatusId → Status name mapping

**Overlap com `service_requests`:** Enriquece o campo `status`

**Volume:** ~10-15 status (pequeno, cache em memória)

**Sync Strategy:**
- Chamar UMA VEZ no início do sync
- Cache em memória

---

### 🟢 TIER 2: IMPORTANT - Dados Adicionais (Implementar em Fase 2)

Estes endpoints fornecem dados **complementares** que NÃO estão na tabela atual, mas são valiosos para análise e troubleshooting.

#### 5. **ScreenDataSetGetServiceRequestPayments** 💰 PAYMENTS
**URL:** `/screenservices/.../ScreenDataSetGetServiceRequestPayments`

**Prioridade:** MÉDIA-ALTA

**Dados Fornecidos:**
- Histórico completo de pagamentos por Service Request
- Payment transactions, wallet operations
- Card details, refunds, amounts

**Overlap:** Parcial - temos campos de payment na tabela, mas não o histórico completo

**Nova Tabela Necessária:** `service_request_payments` (1-to-many)

**Campos Sugeridos:**
```sql
CREATE TABLE service_request_payments (
  id UUID PRIMARY KEY,
  request_code VARCHAR(20) REFERENCES service_requests(request_code),
  transaction_id VARCHAR(50),
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  created_at TIMESTAMPTZ,
  raw_data JSONB
);
```

**Sync Strategy:**
- Chamar para CADA ServiceRequestCode (nested loop)
- Ou chamar em batch se API suportar

**Justificação:**
Permite análise financeira detalhada, tracking de refunds, troubleshoot payment issues.

---

#### 6. **DataActionFetchPriceBreakdown** 💰 PRICING
**URL:** `/screenservices/.../DataActionFetchPriceBreakdown`

**Prioridade:** MÉDIA

**Dados Fornecidos:**
- Breakdown detalhado de preços (custo base, taxa, desconto, total)
- Permite perceber de onde vêm os valores finais

**Overlap:** Complementa os campos de pricing existentes

**Sync Strategy:**
- Guardar em JSONB no campo `pricing_breakdown` (adicionar à tabela)
- Ou criar tabela separada se precisar de queries

**Justificação:**
Útil para auditing de preços e troubleshooting de discrepâncias.

---

#### 7. **DataActionFetchNotes** 📝 NOTES
**URL:** `/screenservices/.../DataActionFetchNotes`

**Prioridade:** MÉDIA

**Dados Fornecidos:**
- Notas de negócio associadas ao Service Request
- Texto livre, timestamps, authors

**Overlap:** Zero - não temos notas na tabela atual

**Nova Tabela Necessária:** `service_request_notes` (1-to-many)

**Campos Sugeridos:**
```sql
CREATE TABLE service_request_notes (
  id UUID PRIMARY KEY,
  request_code VARCHAR(20) REFERENCES service_requests(request_code),
  note_text TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ
);
```

**Sync Strategy:**
- Chamar para cada ServiceRequestCode
- Parse o campo `Notes_List` (pode ser string separada por delimitadores)

**Justificação:**
Notas de backoffice são essenciais para contexto e troubleshooting.

---

#### 8. **ScreenDataSetGetTasks** / **ScreenDataSetGetTasksByServiceRequestId** ✅ TASKS
**URL:** `/screenservices/.../ScreenDataSetGetTasks`

**Prioridade:** MÉDIA

**Dados Fornecidos:**
- Lista de tarefas associadas ao Service Request
- Status, assigned to, deadlines

**Overlap:** Zero - não temos tarefas na tabela atual

**Nova Tabela:** `service_request_tasks` (1-to-many)

**Justificação:**
Permite tracking de workflow interno do backoffice.

---

### 🟣 TIER 3: NICE-TO-HAVE - Dados Especializados (Fase 3+)

Endpoints que fornecem dados **muito específicos** ou de casos edge. Úteis para casos avançados mas não bloqueiam o MVP.

#### 9. **ScreenDataSetGetServiceRequestClient** 👤 CLIENT
**Prioridade:** BAIXA-MÉDIA

**Dados:** Detalhes completos do cliente (User + UserExtension)

**Problema:** Dados sensíveis (GDPR), podem já estar noutro sistema

**Decisão:** Avaliar necessidade vs compliance

---

#### 10. **ScreenDataSetGetServiceRequestProvider** 👷 PROVIDER
**Prioridade:** BAIXA-MÉDIA

**Dados:** Detalhes completos do prestador

**Problema:** Provavelmente já tens na tabela `providers`

**Decisão:** Apenas se precisares de enriquecer dados de providers

---

#### 11. **ScreenDataSetGetDocuments** / **ScreenDataSetGetServiceRequestPhotosByServiceRequestId** 📄 FILES
**Prioridade:** BAIXA

**Dados:** Documentos e fotos anexadas

**Problema:**
- Ficheiros binários (não faz sentido fazer sync bulk)
- URLs podem expirar
- Storage complexo

**Decisão:**
- Guardar APENAS metadata (URL, filename, timestamp)
- Não fazer download de ficheiros no sync

---

#### 12. **ScreenDataSetGetAdditionalVisitsByServiceRequestId** / **DataActionGetAdditionalVisits** 🔄 VISITS
**Prioridade:** BAIXA

**Dados:** Visitas adicionais agendadas

**Overlap:** Temos `number_additional_visits` na tabela

**Decisão:** Apenas se precisares de detalhe de cada visita

---

#### 13. **ScreenDataSetGetAuditFixoBackofficesByObjectRecordId** 🔍 AUDIT
**Prioridade:** BAIXA

**Dados:** Audit trail completo de mudanças

**Volume:** MUITO GRANDE (cada mudança gera entrada)

**Decisão:**
- Não incluir no sync regular
- Criar endpoint separado `/api/audit/:requestCode` on-demand

---

#### 14. **DataActionGetSchedullingDates** / **ActionServiceSchedule_RecalculateNextHoursInterval_BO** 📅 SCHEDULING
**Prioridade:** BAIXA

**Dados:** Cálculos de agendamento, disponibilidade

**Decisão:** Provavelmente não relevante para data warehouse (são cálculos, não dados históricos)

---

#### 15. **ScreenDataSetGetServiceRequestRefundsByServiceRequest** 💸 REFUNDS
**Prioridade:** BAIXA-MÉDIA

**Dados:** Histórico de reembolsos

**Overlap:** Temos `refund_amount` e `refund_reason` na tabela

**Decisão:**
- Se apenas 1 refund por SR → campos existentes suficientes
- Se múltiplos refunds → criar tabela separada

---

#### 16. **DataActionCheckIfHasMBWAYPendingPayments** 📱 MBWAY
**Prioridade:** MUITO BAIXA

**Dados:** Check binário de pagamentos MBWAY pendentes

**Decisão:** Não guardar, é um estado transitório

---

#### 17. **DataActionFetchCancellationReasons** / **DataActionFetchServiceRequestStatusCreationDateTime** 🚫 CANCELLATION
**Prioridade:** BAIXA

**Dados:** Razões de cancelamento, timestamps de criação de status

**Overlap:** Parcial com campos existentes

**Decisão:** Avaliar se campos `cancellation_reason` e `cancellation_comment` são suficientes

---

#### 18. **DataActionFetchQuestionnaire** 📋 QUESTIONNAIRE
**Prioridade:** MUITO BAIXA

**Dados:** Questionários associados (provavelmente customer feedback)

**Decisão:** Avaliar relevância para analytics

---

### ⚠️ TIER 4: SKIP - Não Necessários

#### **DataActionAlmostPaymentExpired** / **DataActionAlmostExpiredWithoutProvider** 🚨 ALERTS
**Prioridade:** NÃO IMPLEMENTAR

**Razão:**
- São ALERTAS, não dados históricos
- Calculados em tempo real pelo backoffice
- Não faz sentido guardar snapshots

**Alternativa:**
- Calcular do nosso lado baseado nos dados de `service_requests`
- Criar queries: `WHERE payment_due_date < NOW() + INTERVAL '2 days'`

---

#### **ScreenDataSetGetFilterOnGoingNewVisit** 🔍 FILTERS
**Prioridade:** NÃO IMPLEMENTAR

**Razão:**
- É um helper para filtros de UI
- Não contém dados históricos

---

#### **DataActionGetFileUploadSettings** ⚙️ SETTINGS
**Prioridade:** NÃO IMPLEMENTAR

**Razão:**
- Configurações de sistema, não dados de negócio

---

## 🎯 Roadmap de Implementação Recomendado

### **Fase 1: MVP (Sync Básico)** - Estimativa: 1-2 dias
**Objetivo:** Sistema de sync funcional com dados essenciais

**Endpoints a implementar:**
1. ✅ ScreenDataSetGetRequests (PRINCIPAL)
2. ✅ ScreenDataSetGetCategories (METADATA)
3. ✅ ScreenDataSetGetDistricts (METADATA)
4. ✅ ScreenDataSetGetServiceRequestStatus (METADATA)

**Schema de Database:**
- Tabela `service_requests` (já existe) ✅
- Campos adicionais se necessário

**Funcionalidades:**
- Date range picker UI
- Botão "Sincronizar"
- Progress indicator
- Upsert logic por ServiceRequestCode
- Cache de lookup tables

**Output:**
- Sistema funcional de sync
- Dados suficientes para 80% dos casos de uso

---

### **Fase 2: Enriquecimento de Dados** - Estimativa: 2-3 dias
**Objetivo:** Adicionar dados complementares valiosos

**Endpoints a implementar:**
5. ✅ ScreenDataSetGetServiceRequestPayments
6. ✅ DataActionFetchPriceBreakdown
7. ✅ DataActionFetchNotes
8. ✅ ScreenDataSetGetTasks

**Novas Tabelas:**
- `service_request_payments` (1-to-many)
- `service_request_notes` (1-to-many)
- `service_request_tasks` (1-to-many)

**Alterações à tabela existente:**
- Adicionar campo `pricing_breakdown JSONB`

**Funcionalidades:**
- Nested sync (para cada SR, buscar payments/notes/tasks)
- Batch processing com rate limiting
- Error handling robusto

---

### **Fase 3: Dados Avançados** - Estimativa: 1-2 dias
**Objetivo:** Casos de uso específicos

**Endpoints a implementar:**
9. ⚠️ ScreenDataSetGetDocuments (apenas metadata)
10. ⚠️ ScreenDataSetGetAdditionalVisits (se necessário)
11. ⚠️ ScreenDataSetGetServiceRequestRefunds (se múltiplos)

**Decisões baseadas em:**
- Feedback de users
- Análise de frequência de uso
- Compliance requirements (GDPR para client data)

---

### **Fase 4: Otimizações** - Estimativa: 1-2 dias
**Objetivo:** Performance e UX

**Melhorias:**
- Parallel fetching de endpoints independentes
- Background jobs para syncs grandes
- Incremental sync (apenas novos/alterados)
- Audit endpoint on-demand

---

## 📈 Análise de Impacto vs Esforço

| Endpoint | Dados Novos | Esforço | Impacto | Prioridade |
|----------|-------------|---------|---------|------------|
| GetRequests | +++++ | Baixo | Máximo | ⭐⭐⭐⭐⭐ |
| GetCategories | ++ | Muito Baixo | Alto | ⭐⭐⭐⭐ |
| GetDistricts | ++ | Muito Baixo | Alto | ⭐⭐⭐⭐ |
| GetStatus | ++ | Muito Baixo | Alto | ⭐⭐⭐⭐ |
| GetPayments | ++++ | Médio | Médio-Alto | ⭐⭐⭐ |
| FetchPriceBreakdown | +++ | Baixo | Médio | ⭐⭐⭐ |
| FetchNotes | ++++ | Baixo | Médio | ⭐⭐⭐ |
| GetTasks | +++ | Baixo | Médio | ⭐⭐⭐ |
| GetClient | ++++ | Médio | Baixo (GDPR) | ⭐⭐ |
| GetProvider | +++ | Médio | Baixo (duplicado) | ⭐⭐ |
| GetDocuments | ++ | Alto | Baixo | ⭐ |
| GetAudit | +++++ | Alto | Baixo | ⭐ |

---

## 🚀 Próximo Passo Imediato

**DECISÃO RECOMENDADA:** Implementar apenas **Fase 1 (MVP)** primeiro.

**Razão:**
- 4 endpoints cobrem ~80% dos dados
- Esforço mínimo (1-2 dias)
- Validação rápida do conceito
- Permite testar toda a pipeline (UI → API → Database)

**Após Fase 1 funcionar:**
- Avaliar feedback
- Decidir se Fase 2 é necessária
- Priorizar baseado em casos de uso reais

---

## 📝 Notas Técnicas Importantes

### Cálculo de Volume de Chamadas API

**Fase 1 (MVP):**
- 1 chamada: GetRequests (MaxRecords: 10000) → 5720 registos
- 1 chamada: GetCategories → ~20 registos
- 1 chamada: GetDistricts → ~18 registos
- 1 chamada: GetStatus → ~15 registos

**Total: 4 chamadas API** 🎉

---

**Fase 2 (com nested data):**
- 1 chamada: GetRequests → 5720 registos
- 3 chamadas: Metadata
- 5720 chamadas: GetPayments (1 por SR) ⚠️
- 5720 chamadas: FetchNotes (1 por SR) ⚠️
- 5720 chamadas: GetTasks (1 por SR) ⚠️

**Total: ~17,164 chamadas API** 😱

**Conclusão:** Fase 2 requer:
- Rate limiting robusto
- Background job (não sync síncrono)
- Batch processing
- Estimativa: 30-60 minutos para sync completo

---

### Campos da Tabela `service_requests` vs Endpoint Principal

**Campos já cobertos pelo GetRequests:**
- ✅ request_code (ServiceRequestCode)
- ✅ fid_id (FIDID)
- ✅ user_id, client_town, client_district
- ✅ cluster_id, cluster, category_id, category, service_id, service
- ✅ scheduled_to (ServiceRequestSchedullingDateTime)
- ✅ created_at (ServiceRequestCreatedAt)
- ✅ service_address_line_1, service_address_line_2, zip_code, city
- ✅ cost_estimation, promocode, promocode_discount, final_cost_estimation
- ✅ assigned_provider_id, assigned_provider_name
- ✅ status (ServiceRequestStatusName)

**Campos que PODEM estar no endpoint (precisa validação):**
- ⚠️ payment_status, payment_method, paid_amount
- ⚠️ provider_cost, technician_name, technician_rating
- ⚠️ service_rating, service_rating_comment

**Campos que NÃO estão no endpoint principal:**
- ❌ refund_amount, refund_reason (precisa endpoint de Payments/Refunds)
- ❌ notes (precisa endpoint de Notes)
- ❌ tasks_count (precisa endpoint de Tasks, ou calcular do Count_Tasks)

---

## ✅ Conclusão

**Recomendação Final:**

1. **Implementar Fase 1 AGORA** (4 endpoints, MVP)
2. **Testar end-to-end** com sync de 1 dia de dados
3. **Validar dados** na database
4. **Decidir sobre Fase 2** baseado em:
   - Feedback de users
   - Necessidade real de payments/notes/tasks
   - Capacidade de processar 17k+ API calls

**Se Fase 1 cobrir as necessidades → STOP, don't over-engineer!**

**Se precisar de mais dados → Fase 2, mas com background jobs.**
