# Análise dos Endpoints da API OutSystems Backoffice

**Data da Discovery:** 09-01-2026
**Total de API Calls Capturadas:** 18
**Ficheiro Fonte:** `01_list_page_apis.json`

---

## 📋 Resumo Executivo

Foram identificados **9 endpoints de dados essenciais** para o sistema de sync do backoffice. Estes endpoints dividem-se em:

1. **Endpoint Principal** (Service Requests)
2. **Endpoints de Metadados** (Categories, Districts, Status)
3. **Endpoints de Alertas** (Payment warnings, Provider warnings)

---

## 🎯 Endpoints Essenciais para Sync

### 1. **ScreenDataSetGetRequests** ⭐ PRINCIPAL
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests`

**Descrição:** Endpoint principal que retorna a lista de Service Requests

**Método:** POST

**API Version:** `nz47xpJE1xZle9LEOhqb2Q`

**Payload Estrutura:**
```json
{
  "versionInfo": {
    "moduleVersion": "Bt6C82gdDc1aqSyWDB5hBQ",
    "apiVersion": "nz47xpJE1xZle9LEOhqb2Q"
  },
  "viewName": "MainFlow.ServiceRequests",
  "screenData": {
    "variables": {
      "SearchKeyword": "",
      "StartIndex": 0,
      "MaxRecords": 10,  // ⚠️ Aumentar para 10000 no sync
      "TableSort": "ServiceRequestCreatedAt DESC",
      "CategoryId": "0",
      "InputFromSubmissionDate": "09-11-2025",  // dd-mm-yyyy
      "InputToSubmissionDate": "",
      "FromSubmissionDate": "2025-11-09T00:00:00.000Z",  // ISO format
      "ToSubmissionDate": "1900-01-01T00:00:00",
      "SelectedRequestStatusText": "",
      "SelectedStatus": {
        "List": [],
        "EmptyListItem": { "Value": "", "Text": "" }
      },
      "IsScheduledDeliveryDateNotDefined": false,
      "HasExportPermissions": true,
      "SelectedDistrictId": "",
      "OnGoingNewVisit": ""
    }
  },
  "inputParameters": {}  // ⚠️ Adicionar { StartIndex: 0, MaxRecords: 10000 }
}
```

**Response Structure:**
```json
{
  "data": {
    "List": {
      "List": [
        {
          "ServiceRequestCode": "SR116935",
          "FIDID": "64/26/000948",
          "ProviderName": "...",
          "Service": "...",
          "ServiceRequestStatusName": "...",
          "ServiceRequestCreatedAt": "2026-01-09T18:16:28Z",
          // ... ~15-20 campos
        }
      ]
    },
    "Count": 80
  },
  "versionInfo": { ... }
}
```

**Prioridade:** 🔴 CRÍTICO - Este é o endpoint PRINCIPAL do sync

---

### 2. **ScreenDataSetGetCategories**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetCategories`

**Descrição:** Retorna lista de categorias de serviços (Limpeza, Canalizador, etc.)

**API Version:** `JGL5R1ZVOEtL7XpHchI39w`

**Prioridade:** 🟡 METADATA - Para enriquecer dados de categorias

---

### 3. **ScreenDataSetGetDistricts**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetDistricts`

**Descrição:** Retorna lista de distritos (Lisboa, Porto, etc.)

**API Version:** `SAfr6bbrlurrDwOTBr6jXQ`

**Prioridade:** 🟡 METADATA - Para enriquecer dados de localização

---

### 4. **ScreenDataSetGetServiceRequestStatus**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetServiceRequestStatus`

**Descrição:** Retorna lista de status possíveis (Novo pedido, Prestador atribuído, etc.)

**API Version:** `eLZsS4_+Fp3D+FTfWsR9bw`

**Prioridade:** 🟡 METADATA - Para enriquecer dados de status

---

### 5. **DataActionAlmostPaymentExpired**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/WARN/WARN_ServiceRequest_WarningRequestLists/DataActionAlmostPaymentExpired`

**Descrição:** Retorna pedidos com pagamento prestes a expirar (alertas)

**API Version:** `j9UxJ8oXUS5qBlbTiZVAnQ`

**Prioridade:** 🟢 OPCIONAL - Para sistema de alertas

---

### 6. **DataActionAlmostExpiredWithoutProvider**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/WARN/WARN_ServiceRequest_WarningRequestLists/DataActionAlmostExpiredWithoutProvider`

**Descrição:** Retorna pedidos prestes a expirar sem provider atribuído (alertas)

**API Version:** `ia1NBnt0ldZ9QnM94wcjcA`

**Prioridade:** 🟢 OPCIONAL - Para sistema de alertas

---

### 7. **ScreenDataSetGetFilterOnGoingNewVisit**
**URL:** `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetFilterOnGoingNewVisit`

**Descrição:** Filtro para visitas em curso / novas visitas

**API Version:** `zbpmKkk4PckTtuRSNR_3sQ`

**Prioridade:** 🟢 OPCIONAL - Para filtros adicionais

---

## 🔍 Endpoints de Autenticação/Sistema (Não para Sync)

Estes endpoints foram capturados mas **NÃO** são necessários para o sync de dados:

- **moduleservices/moduleversioninfo** - Retorna versionToken (já temos via login)
- **moduleservices/moduleinfo** - Retorna manifest de assets (CSS, fonts, etc.)
- **ActionDoLogin** - Login do utilizador (já fazemos via Puppeteer)
- **ActionFeature_GetList** - Features do ambiente (não relevante)
- **DataActionGetSitePropertyURLDomain** - URL domain config
- **DataActionGetUserNameFromServer** - User info do server
- **ScreenDataSetGetUserAndDocumentData** - User data

---

## 📊 Estrutura Comum dos Payloads

Todos os endpoints de dados seguem o mesmo padrão:

```typescript
interface APIPayload {
  versionInfo: {
    moduleVersion: string  // "Bt6C82gdDc1aqSyWDB5hBQ" (fixo)
    apiVersion: string     // Específico de cada endpoint
  }
  viewName: string         // "MainFlow.ServiceRequests" (fixo)
  screenData: {
    variables: Record<string, any>  // Variáveis específicas
  }
  inputParameters?: {
    StartIndex?: number
    MaxRecords?: number
  }
}
```

---

## 🎯 Estratégia de Sync Recomendada

### **Fase 1: Sync Principal (MVP)**
Implementar apenas o endpoint principal:

1. **ScreenDataSetGetRequests** com:
   - `MaxRecords: 10000`
   - Date filters (FromSubmissionDate, ToSubmissionDate)
   - Upsert por `ServiceRequestCode`

### **Fase 2: Enriquecimento de Metadata**
Adicionar endpoints de metadata para lookup tables:

2. **ScreenDataSetGetCategories** - Cache em memória
3. **ScreenDataSetGetDistricts** - Cache em memória
4. **ScreenDataSetGetServiceRequestStatus** - Cache em memória

### **Fase 3: Alertas e Filtros (Opcional)**
5. **DataActionAlmostPaymentExpired**
6. **DataActionAlmostExpiredWithoutProvider**

---

## ⚠️ Pontos Críticos Identificados

### 1. **MaxRecords Limitation**
- Payload atual usa `MaxRecords: 10` (UI pagination)
- Para sync bulk, **DEVE usar `MaxRecords: 10000`**
- Adicionar também em `inputParameters` para garantir

### 2. **Date Format Duality**
O payload aceita datas em **DOIS formatos simultaneamente**:
- `InputFromSubmissionDate: "09-11-2025"` (dd-mm-yyyy, formato visual)
- `FromSubmissionDate: "2025-11-09T00:00:00.000Z"` (ISO 8601, formato real)

**Ambos devem ser enviados!**

### 3. **API Version Tokens**
Cada endpoint tem seu próprio `apiVersion`:
- GetRequests: `nz47xpJE1xZle9LEOhqb2Q`
- GetCategories: `JGL5R1ZVOEtL7XpHchI39w`
- GetDistricts: `SAfr6bbrlurrDwOTBr6jXQ`

**IMPORTANTE:** Estes tokens podem expirar! Se API retornar erro, precisamos de re-discovery.

### 4. **Module Version**
O `moduleVersion: "Bt6C82gdDc1aqSyWDB5hBQ"` é global e vem do endpoint:
```
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/moduleservices/moduleversioninfo
```

---

## 🚀 Próximos Passos

1. ✅ **Discovery Completa** - Executada com sucesso
2. ⏳ **Análise de Detail Page** - Precisa de re-run (0 API calls capturadas)
3. 🔜 **Implementar Multi-Endpoint Scraper**
4. 🔜 **Criar Server Action com Upsert Logic**
5. 🔜 **Criar API Endpoint `/api/sync/backoffice`**
6. 🔜 **Criar UI `SyncBackofficeDialog`**

---

## 📁 Ficheiros Relacionados

- **Discovery Output:** `/data/api-discovery/01_list_page_apis.json` (348KB)
- **Sample Data:** `/data/scrapper-outputs/pedidos_09-01-2026_09-01-2026.json`
- **Working Scraper:** `/scripts/export-backoffice-api.ts`
- **Database Schema:** `/supabase/migrations/20260109_create_service_requests.sql`

---

## 🔍 Detail Page Discovery - COMPLETO ✅

**Status:** 27 API calls capturadas (de 34 total)

**Solução:** Navegação direta para URL `ServiceRequestDetail?SRCode=SR116936` em vez de click na tabela

### Endpoints da Página de Detalhe

#### 1. Dados Core do Service Request
- **ScreenDataSetGetServiceRequestById** - Detalhe completo do pedido
- **ScreenDataSetGetRequest** - Request resumido
- **ScreenDataSetRequest** - Dados adicionais do request
- **ScreenDataSetGetRequestAdressDistrict** - Distrito do endereço

#### 2. Dados de Cliente e Prestador
- **ScreenDataSetGetServiceRequestClient** - Dados completos do cliente
- **ScreenDataSetGetServiceRequestProvider** - Dados completos do prestador

#### 3. Pagamentos e Finanças
- **ScreenDataSetGetServiceRequestPayments** - Histórico de pagamentos
- **DataActionFetchPriceBreakdown** - Breakdown detalhado de preços
- **DataActionGetServiceRequestAdditionalCharges** - Encargos adicionais
- **ScreenDataSetGetServiceRequestRefundsByServiceRequest** - Reembolsos
- **DataActionCheckIfHasMBWAYPendingPayments** - Verificar pagamentos MBWAY pendentes

#### 4. Tarefas
- **ScreenDataSetGetTasks** - Lista de tarefas
- **ScreenDataSetGetTasksByServiceRequestId** - Tarefas por SR

#### 5. Notas e Comunicação
- **DataActionFetchNotes** - Notas de negócio
- **ScreenDataSetGetNotes** - Notas estruturadas

#### 6. Documentos e Fotos
- **ScreenDataSetGetDocuments** - Documentos anexados (chamado 2x)
- **ScreenDataSetGetServiceRequestPhotosByServiceRequestId** - Fotos do serviço
- **DataActionGetFileUploadSettings** - Configurações de upload

#### 7. Visitas e Agendamento
- **ScreenDataSetGetAdditionalVisitsByServiceRequestId** - Visitas adicionais
- **DataActionGetAdditionalVisits** - Dados de visitas
- **DataActionGetSchedullingDates** - Datas de agendamento
- **ActionServiceSchedule_RecalculateNextHoursInterval_BO** - Recalcular intervalos de agendamento

#### 8. Metadados e Auditoria
- **ScreenDataSetGetAuditFixoBackofficesByObjectRecordId** - Audit trail completo
- **DataActionFetchServiceRequestStatusCreationDateTime** - Timestamp de criação de status
- **DataActionFetchCancellationReasons** - Razões de cancelamento
- **DataActionFetchQuestionnaire** - Questionário associado

**Total de dados disponíveis:** 7 endpoints na listagem + 27 na página de detalhe = **34 endpoints de dados**
