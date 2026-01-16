# Sistema de Preços - Avaliação e Plano Futuro

## Estado Actual

### Tabelas Existentes (Dummy Data)

| Tabela | Registos | Estado |
|--------|----------|--------|
| `services` | 13 | Dummy data (Fibra, IPTV, etc.) |
| `service_categories` | 4 | Dummy data (Instalações Residenciais, etc.) |
| `reference_prices` | 13 | Dummy data |
| `provider_prices` | 0 | **Nunca usado** |
| `provider_price_snapshots` | ? | Snapshots de preços |

### Código Existente

**Ficheiro principal:** `src/lib/pricing/actions.ts`

Funções implementadas:
- `getServiceCategories()` - Obtém categorias de serviços
- `getServicesWithReferencePrices()` - Serviços com preços de referência
- `getProviderPrices(providerId)` - Preços de um prestador
- `getProviderPricingTable(providerId)` - Tabela completa agrupada por categoria
- `setProviderPrice()` - Define preço individual
- `setProviderPricesBatch()` - Define preços em lote
- `createPriceSnapshot()` - Cria snapshot da tabela
- `getPriceSnapshots()` - Lista snapshots
- `generateInitialPriceProposal()` - Gera proposta baseada em referência
- `hasProviderPrices()` - Verifica se tem preços
- `getPricingExportData()` - Dados para exportação
- `calculatePriceDeviations()` - Calcula desvios vs referência

### Problemas Identificados

1. **Dados dummy** - As tabelas `services` e `service_categories` contêm dados fictícios de telecomunicações (Fibra, IPTV) que não correspondem aos serviços reais do FIXO

2. **Tabela duplicada** - Existe `service_taxonomy` com os 84 serviços reais do backoffice, mas o sistema de pricing usa a tabela `services` separada

3. **Nunca usado** - `provider_prices` tem 0 registos, indicando que a funcionalidade nunca foi utilizada em produção

4. **Estrutura diferente**:
   - `services`: usa `category_id` (FK para `service_categories`)
   - `service_taxonomy`: usa `category` como texto directo

---

## Plano Futuro

### Objectivo

Implementar sistema de preços funcional usando a tabela `service_taxonomy` com os serviços reais do backoffice FIXO.

### Fase 1: Migração de Schema

**Opção A - Adaptar tabelas existentes:**
- Eliminar `services` e `service_categories`
- Modificar `reference_prices` e `provider_prices` para referenciar `service_taxonomy`
- Actualizar código em `pricing/actions.ts`

**Opção B - Criar novas tabelas:**
- Criar `taxonomy_reference_prices` (preços de referência por serviço da taxonomy)
- Criar `taxonomy_provider_prices` (preços de prestador por serviço da taxonomy)
- Manter estrutura mais simples sem `service_categories` (usar `category` da taxonomy)

### Fase 2: Estrutura Proposta

```sql
-- Preços de referência por serviço (taxonomy)
CREATE TABLE taxonomy_reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_service_id UUID REFERENCES service_taxonomy(id),
  variant_name TEXT,  -- Ex: "Standard", "Premium"
  variant_description TEXT,
  price_without_vat DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preços de prestador por serviço
CREATE TABLE taxonomy_provider_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  taxonomy_service_id UUID REFERENCES service_taxonomy(id),
  variant_name TEXT,
  price_without_vat DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fase 3: Funcionalidades

1. **Tabela de Preços por Prestador**
   - Ver todos os serviços da taxonomy agrupados por categoria
   - Definir preços para cada serviço
   - Comparar com preços de referência

2. **Gestão de Preços de Referência**
   - Admin define preços base por serviço
   - Suporte a variantes (Standard, Premium, etc.)

3. **Análise de Desvios**
   - Dashboard com desvios vs referência
   - Alertas para preços fora da média

4. **Histórico e Snapshots**
   - Manter histórico de alterações
   - Snapshots para comparação temporal

### Fase 4: Limpeza

Após implementação bem sucedida:
- Eliminar tabelas antigas: `services`, `service_categories`, `reference_prices`
- Renomear novas tabelas se necessário
- Actualizar tipos TypeScript (`database.ts`)

---

## Tabelas a Eliminar (Futuro)

| Tabela | Motivo |
|--------|--------|
| `services` | Dummy data, substituída por `service_taxonomy` |
| `service_categories` | Não necessária, usar `category` da taxonomy |
| `reference_prices` | Migrar para nova estrutura |
| `provider_prices` | Vazia, migrar para nova estrutura |
| `provider_services` | ✅ Já eliminada |

---

## Notas

- A tabela `service_taxonomy` é populada automaticamente pelo sync do backoffice
- Os serviços reais têm categorias como: "Serviços de limpeza", "Instalação e reparação", etc.
- Total actual: 84 serviços na taxonomy

---

*Última actualização: 15 Janeiro 2026*
