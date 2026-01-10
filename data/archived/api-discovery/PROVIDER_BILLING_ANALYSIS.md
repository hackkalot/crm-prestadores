# Análise: Provider Billing APIs

**Data da Descoberta:** 09-01-2026
**Página:** https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ProviderBillingProcesses

---

## 🎯 Descoberta

Foram capturadas **3 APIs novas** específicas de faturação de prestadores, mais as 7 APIs já conhecidas de Service Requests (reutilizadas nesta página).

---

## 📊 APIs de Provider Billing (Novas)

### 1. ScreenDataSetGetProviderBillingProcessesByFilter
**URL:** `/screenservices/FXBO_Invoice_CW/ProviderBillingProcesses/ProviderBillingProcessList/ScreenDataSetGetProviderBillingProcessesByFilter`
**API Version:** (needs extraction)

**Descrição:** Lista processos de faturação de prestadores com filtros avançados

**Filtros Disponíveis:**
```json
{
  "ProviderBillingStatusId": 2,
  "SearchKeyword": "",
  "TableSort": "ProviderBillingStatus.OrderBusiness, ProviderBilling.CreatedAt DESC",
  "FromSubmittedDocDate": "1900-01-01",
  "ToSubmittedDocDate": "1900-01-01",
  "Filter_ServiceCost": ""
}
```

**Campos Retornados:**

#### ProviderBillingProcess
- `ServiceRequestId` - ID do pedido associado
- `ServiceCost` - Custo do serviço (ex: "140.00")
- `ServiceCostBaseAmount` - Montante base
- `IsAutomaticCost` - Se custo foi calculado automaticamente
- `ShowServiceCost` - Se deve mostrar custo
- `HasNewInvoiceVersion` - Se tem nova versão de fatura
- `HasComplaint` - Se tem reclamação ativa
- `EverHadComplaint` - Se já teve reclamação
- `CreatedBy`, `CreatedAt`, `UpdatedBy`, `UpdatedAt`
- `IsArchived` - Se está arquivado

#### ProviderBilling
- `Id` - ID da fatura
- `ProviderBillingProcessId` - ID do processo
- `BillingStatus` - Status da faturação (2 = ?)
- `BillingRetentionId` - ID de retenção
- `BillingType` - Tipo de faturação
- `RelatedProviderBilling` - Fatura relacionada
- `SAPId` - ID no SAP (integração ERP)
- `BillingNumber` - Número da fatura
- `BillingDate` - Data da fatura
- `BillingBaseAmount` - Montante base da fatura
- `BillingTotalAmount` - Montante total da fatura
- `BillingRetentionBaseAmount` - Montante base de retenção
- `BillingRetentionTotalAmount` - Montante total de retenção
- `ServiceCost` - Custo do serviço na fatura
- `DecisionBy` - Quem decidiu (aprovar/rejeitar)
- `DecisionDate` - Data da decisão
- `PaymentDate` - Data de pagamento
- `RejectionCustomMessage` - Mensagem customizada de rejeição
- `IsDataStored` - Se dados estão armazenados
- `IsSentToSAP` - Se foi enviado para SAP
- `IsLatestVersion` - Se é a última versão
- `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`

#### ProviderBillingStatus
- `Id` - ID do status
- `Name` - Nome do status
- `Description` - Descrição
- `IsActive` - Se está ativo
- `OrderBusiness` - Ordem de exibição/processamento

---

### 2. ScreenDataSetGetProviderBillingStatus
**URL:** `/screenservices/FXBO_Invoice_CW/ProviderBillingProcesses/ProviderBillingProcessList/ScreenDataSetGetProviderBillingStatus`

**Descrição:** Lookup table de status de faturação

**Retorna:** Lista de status possíveis para filtros
- Novo
- Pendente aprovação
- Aprovado
- Rejeitado
- Pago
- Etc.

---

### 3. ScreenDataSetGetBillingProcessHasServiceCost
**URL:** `/screenservices/FXBO_Invoice_CW/ProviderBillingProcesses/ProviderBillingProcessList/ScreenDataSetGetBillingProcessHasServiceCost`

**Descrição:** Filtro para processos com/sem custo de serviço

**Retorna:** Opções de filtro:
- Com custo de serviço
- Sem custo de serviço
- Todos

---

## 🔗 Relação com Service Requests

As APIs de Provider Billing estão **diretamente ligadas** aos Service Requests através do campo `ServiceRequestId`.

**Fluxo:**
1. Service Request é criado (via API de Service Requests)
2. Prestador é atribuído
3. Serviço é realizado
4. **Provider Billing Process** é criado para faturação
5. Provider Billing (fatura) é gerada
6. Fatura passa por aprovação
7. Integração com SAP (`SAPId`, `IsSentToSAP`)
8. Pagamento é processado

---

## 💡 Casos de Uso

### 1. Acompanhamento de Faturação
Listar todas as faturas pendentes de aprovação:
```json
{
  "ProviderBillingStatusId": 2,  // ID de "Pendente Aprovação"
  "StartIndex": 0,
  "MaxRecords": 1000
}
```

### 2. Relatório Financeiro
Buscar faturas pagas num período:
```json
{
  "FromSubmittedDocDate": "2026-01-01",
  "ToSubmittedDocDate": "2026-01-31",
  "ProviderBillingStatusId": 5  // ID de "Pago"
}
```

### 3. Auditoria de Custos
Filtrar processos com reclamações:
```json
{
  "SearchKeyword": "",
  "Filter_ServiceCost": "with_cost"
}
```
(E depois filtrar `HasComplaint: true` ou `EverHadComplaint: true`)

### 4. Integração com Contabilidade
Buscar faturas enviadas para SAP:
```typescript
const billings = await fetchProviderBillings();
const sentToSAP = billings.filter(b => b.IsSentToSAP === true);
```

---

## 🎯 Prioridade de Integração

### TIER 1 - Essencial
- ✅ **ScreenDataSetGetProviderBillingProcessesByFilter** - Dados principais de faturação

### TIER 2 - Lookup Tables
- **ScreenDataSetGetProviderBillingStatus** - Status para filtros
- **ScreenDataSetGetBillingProcessHasServiceCost** - Filtro de custo

---

## 🔄 Comparação: Service Requests vs Provider Billing

| Aspecto | Service Requests | Provider Billing |
|---------|-----------------|------------------|
| **Foco** | Operacional (pedidos) | Financeiro (faturas) |
| **Volume** | ~5,700 registos | Menor (só requests com prestador atribuído) |
| **Atualização** | Tempo real (novas requests diárias) | Após conclusão de serviço |
| **Campos Únicos** | Cliente, Agendamento, Tasks | SAP, Valores, Aprovação, Pagamento |
| **Relação** | 1 Service Request → 0-N Provider Billings | N Provider Billings → 1 Service Request |

---

## 📦 Estrutura de Dados Completa

```typescript
interface ProviderBillingProcess {
  // Dados do Processo
  ServiceRequestId: string
  ServiceCost: string
  ServiceCostBaseAmount: string
  IsAutomaticCost: boolean
  ShowServiceCost: boolean
  HasNewInvoiceVersion: boolean
  HasComplaint: boolean
  EverHadComplaint: boolean

  // Audit
  CreatedBy: number
  CreatedAt: string
  UpdatedBy: number
  UpdatedAt: string
  IsArchived: boolean
}

interface ProviderBilling {
  // Identificação
  Id: string
  ProviderBillingProcessId: string
  RelatedProviderBilling: string
  BillingNumber: string

  // Status e Tipo
  BillingStatus: number
  BillingType: string
  BillingRetentionId: number

  // Integração SAP
  SAPId: string
  IsSentToSAP: boolean

  // Valores Financeiros
  BillingBaseAmount: string
  BillingTotalAmount: string
  BillingRetentionBaseAmount: string
  BillingRetentionTotalAmount: string
  ServiceCost: string

  // Datas
  BillingDate: string
  DecisionDate: string
  PaymentDate: string

  // Aprovação/Rejeição
  DecisionBy: number
  RejectionCustomMessage: string

  // Controlo de Versão
  IsLatestVersion: boolean
  IsDataStored: boolean

  // Audit
  CreatedAt: string
  CreatedBy: number
  UpdatedAt: string
  UpdatedBy: number
}

interface ProviderBillingStatus {
  Id: number
  Name: string
  Description: string
  IsActive: boolean
  OrderBusiness: number
}
```

---

## 🚀 Próximos Passos

1. ✅ APIs descobertas e documentadas
2. 🔜 Extrair API versions dos payloads
3. 🔜 Testar chamada individual com autenticação
4. 🔜 Integrar no sync MVP (opcional - pode ser Fase 2)
5. 🔜 Criar schema Supabase para `provider_billings` (se relevante)

---

## 📊 Total de APIs Descobertas

- **Service Requests (List):** 7 APIs
- **Service Requests (Detail):** 27 APIs
- **Provider Billing:** 3 APIs novas
- **TOTAL:** **37 APIs de dados**

---

## 📁 Ficheiros Relacionados

- Discovery Output: `/data/api-discovery/03_provider_billing_apis.json`
- Discovery Script: `/scripts/discover-provider-billing-apis.ts`
- Service Requests APIs: `/data/api-discovery/01_list_page_apis.json`
- Detail APIs: `/data/api-discovery/02_detail_page_apis.json`
