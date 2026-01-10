# Análise de Métodos HTTP da API OutSystems Backoffice

**Data da Análise:** 09-01-2026
**Objetivo:** Identificar quais métodos HTTP (GET, POST, PUT, DELETE) estão disponíveis na API

---

## 🔍 Descoberta: Apenas POST Endpoints

### Métodos HTTP Capturados

**List Page (7 endpoints):**
- ✅ POST: 7 endpoints
- ❌ GET: 0 endpoints
- ❌ PUT: 0 endpoints
- ❌ DELETE: 0 endpoints

**Detail Page (27 endpoints):**
- ✅ POST: 27 endpoints
- ❌ GET: 0 endpoints
- ❌ PUT: 0 endpoints
- ❌ DELETE: 0 endpoints

**Total: 34 endpoints, TODOS usando POST**

---

## 🎯 Conclusão: API Não-RESTful

### Arquitetura Identificada: OutSystems Screen Services

A API do backoffice OutSystems **NÃO segue padrões REST tradicionais**. Em vez disso, usa uma arquitetura proprietária chamada **"Screen Services"**.

### Características da Arquitetura Screen Services:

1. **Apenas POST requests**
   - Todos os endpoints usam POST, incluindo operações de leitura
   - Não existem endpoints GET, PUT, ou DELETE

2. **Orientada a Contexto de Página**
   - Cada endpoint representa dados para renderizar uma "screen" (página)
   - Payloads incluem `viewName` e `screenData.variables` para simular contexto do browser

3. **Payload Estruturado**
   ```json
   {
     "versionInfo": { "moduleVersion": "...", "apiVersion": "..." },
     "viewName": "MainFlow.ServiceRequests",
     "screenData": { "variables": {...} },
     "inputParameters": {...}
   }
   ```

4. **Sem URLs RESTful**
   - ❌ Não usa: `GET /api/service-requests/SR116935`
   - ✅ Usa: `POST /screenservices/.../ScreenDataSetGetRequests` com `SRCode` no payload

---

## 🚫 Endpoints GET NÃO Disponíveis

**O que NÃO podemos fazer:**

```bash
# Não existe endpoint GET para buscar 1 service request
❌ GET /api/service-requests/SR116935

# Não existe endpoint GET para listar service requests
❌ GET /api/service-requests?from=2026-01-01&to=2026-01-09

# Não existe endpoint GET para buscar pagamentos
❌ GET /api/service-requests/SR116935/payments

# Não existe endpoint GET para buscar notas
❌ GET /api/service-requests/SR116935/notes
```

**O que temos que fazer:**

```bash
# TUDO via POST com payloads complexos
✅ POST /screenservices/.../ScreenDataSetGetRequests
   Body: { versionInfo, viewName, screenData: { variables: {...} } }

✅ POST /screenservices/.../ScreenDataSetGetServiceRequestPayments
   Body: { versionInfo, viewName, screenData: { variables: { SRCode: "SR116935" } } }
```

---

## 🔧 Explorando Endpoints Não Documentados

### Tentativa 1: Endpoints REST Tradicionais

Podemos tentar chamar endpoints REST tradicionais para verificar se existem APIs "escondidas":

```bash
# Teste 1: Buscar service request por ID (REST style)
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/rest/ServiceRequest/SR116935

# Teste 2: API endpoint simples
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/api/service-requests/SR116935

# Teste 3: REST API v1
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/rest/v1/service-requests
```

**Expectativa:** Provavelmente todos retornarão 404 (endpoint não encontrado).

### Tentativa 2: Module Services

Os únicos endpoints GET que apareceram na discovery inicial eram de **module metadata**:

```bash
# Estes SÃO endpoints GET, mas não contêm dados de negócio
GET /FixoBackoffice/moduleservices/moduleversioninfo
GET /FixoBackoffice/moduleservices/moduleinfo
```

Estes retornam:
- `moduleversioninfo`: Token de versão do módulo
- `moduleinfo`: Manifest de assets (CSS, JS, fonts)

**Não úteis para sync de dados.**

---

## 📊 Comparação: REST vs OutSystems Screen Services

| Aspecto | REST API Tradicional | OutSystems Screen Services |
|---------|---------------------|---------------------------|
| **Métodos HTTP** | GET, POST, PUT, DELETE | Apenas POST |
| **URLs** | `/api/resources/{id}` | `/screenservices/Module/Flow/Screen/Action` |
| **Leitura** | GET `/api/sr/123` | POST com `screenData.variables.SRCode` |
| **Escrita** | POST/PUT `/api/sr` | POST com action específica |
| **Filtros** | Query params `?from=...&to=...` | Payload `screenData.variables` |
| **Bulk queries** | Suporta `/api/sr?ids=1,2,3` | **NÃO suporta** (1 SR por call) |

---

## ⚠️ Implicações para Sync

### 1. Não Podemos Usar Ferramentas REST Standard

**Ferramentas que NÃO funcionam:**
- ❌ Postman collections REST
- ❌ Swagger/OpenAPI docs
- ❌ curl simples com GET
- ❌ REST client libraries (axios com GET)

**O que precisamos:**
- ✅ Custom POST requests com payloads complexos
- ✅ Session cookies + CSRF tokens
- ✅ Puppeteer para autenticação

### 2. Impossível Fazer Bulk Queries

Como vimos na análise anterior, a arquitetura Screen Services **não suporta bulk queries** porque:
- Cada endpoint espera contexto de **1 página específica**
- Payloads têm `SRCode` individual (ex: "SR116935"), não arrays

### 3. Estratégia Lazy Load é Ainda Mais Justificada

Com apenas POST endpoints orientados a "página", a estratégia lazy load é **a única viável**:
- Sync scheduled: 4 POST calls (lista principal + lookup tables)
- Detail on-demand: 10 POST calls **por SR** quando user abre detalhe

---

## 🎯 Próximos Passos: Teste Exploratório

Para confirmar 100% que não existem endpoints GET:

### Teste 1: Tentar GET nos Endpoints POST Existentes

```bash
# Tentar GET no endpoint de service requests
curl -X GET \
  'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests' \
  -H 'Cookie: ...' \
  -H 'x-csrftoken: ...'
```

**Expectativa:** 405 Method Not Allowed ou 404

### Teste 2: Procurar REST API Documentation

```bash
# Verificar se existe documentação Swagger
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/swagger.json
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/api-docs

# Verificar REST API routes
GET https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/rest/
```

### Teste 3: Network Tab Durante Mutations

Quando fazemos uma operação de **escrita** no backoffice (ex: adicionar nota), verificar se:
- Usa PUT/PATCH para updates
- Usa DELETE para remoções
- Ou continua usando POST para tudo

---

## ✅ Conclusão

**A API do backoffice OutSystems:**

1. ✅ É **100% POST-based** (34 de 34 endpoints)
2. ❌ **NÃO tem endpoints GET** para dados de negócio
3. ❌ **NÃO segue padrões REST**
4. ✅ Usa arquitetura proprietária **"Screen Services"**
5. ❌ **NÃO suporta bulk queries**

**Impacto para o projeto:**
- Manter estratégia **Lazy Load** (única viável)
- MVP sync já está otimizado (4 POST calls, 4.36s)
- Detail data via POST on-demand quando user clica no SR
- Impossível criar queries "RESTful" simples

---

## 📝 Referências

- **Discovery Output:** `/data/api-discovery/01_list_page_apis.json`
- **Detail Discovery:** `/data/api-discovery/02_detail_page_apis.json`
- **Bulk Query Strategy:** `/data/api-discovery/BULK_QUERY_STRATEGY.md`
- **OutSystems Screen Services:** Arquitetura proprietária para UI-driven APIs
