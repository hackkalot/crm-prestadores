# Análise de Cobertura de Serviços

## Como Funciona

### Fluxo de Dados

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  service_requests   │     │   service_taxonomy   │     │     providers       │
│  (pedidos)          │────>│   (catálogo)         │<────│   (prestadores)     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                            │
         │                           │                            │
         │                   ┌───────▼───────┐                    │
         │                   │service_mapping│                    │
         │                   │  (tradução)   │                    │
         │                   └───────────────┘                    │
         │                                                        │
         └────────────────────────┬───────────────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │   FUNÇÃO RPC  │
                          │ get_provider_ │
                          │ coverage_by_  │
                          │   service     │
                          └───────────────┘
```

### Tabelas Envolvidas

| Tabela | Descrição | Campos Chave |
|--------|-----------|--------------|
| `service_requests` | Pedidos de clientes | `category`, `service`, `client_district`, `client_town` |
| `service_taxonomy` | Catálogo de serviços (do backoffice) | `id`, `category`, `service` |
| `service_mapping` | Tradução taxonomy → provider | `taxonomy_service_id`, `provider_service_name`, `verified` |
| `providers` | Prestadores | `services[]`, `counties[]`, `status` |

### Lógica da Função SQL

```sql
-- 1. Começa pelos pedidos de serviço
FROM service_taxonomy st
INNER JOIN service_requests sr
  ON sr.category = st.category
  AND sr.service = st.service

-- 2. Tenta encontrar mapeamento verificado
LEFT JOIN service_mapping sm
  ON sm.taxonomy_service_id = st.id
  AND sm.verified = true

-- 3. Junta prestadores que:
LEFT JOIN providers p ON
  -- a) Estão ativos
  p.status = 'ativo'
  -- b) Cobrem o concelho do pedido
  AND sr.client_town = ANY(p.counties)
  -- c) Oferecem o serviço (via mapeamento OU match direto)
  AND (
    -- Opção 1: Match via service_mapping
    (sm.provider_service_name IS NOT NULL
     AND p.services @> ARRAY[sm.provider_service_name])
    OR
    -- Opção 2: Match direto (fallback quando não há mapeamento)
    (sm.provider_service_name IS NULL
     AND p.services @> ARRAY[st.service])
  )
```

## Exemplo Prático

### Cenário: "Eletricista por Orçamento" no Seixal

**1. Pedido de Serviço (service_requests)**
```
category: "Instalação e reparação"
service: "Eletricista por Orçamento"
client_district: "Setúbal"
client_town: "Seixal"
```

**2. Taxonomy (service_taxonomy)**
```
id: bc91281a-66c4-4da1-8575-b963339d0e25
category: "Instalação e reparação"
service: "Eletricista por Orçamento"
```

**3. Mapeamento (service_mapping)**
```
NÃO EXISTE mapeamento para este serviço!
```

**4. Prestadores (providers)**
```
Hugo Costa (Servtec):
  - services: ["Fixação à parede", "Eletricista por Orçamento", ...]
  - counties: ["Almada", "Seixal", "Lisboa", ...]
  - status: "ativo"

Carlos Manuel:
  - services: ["Eletricista por Orçamento", ...]
  - counties: ["Almada", "Seixal", "Sesimbra", ...]
  - status: "ativo"
```

**5. Resultado**
```
Como NÃO EXISTE mapeamento:
  → Usa fallback: match direto com st.service = "Eletricista por Orçamento"
  → Encontra 4 prestadores que têm esse serviço E cobrem Seixal
```

## Filtros de Localização

### Hierarquia Geográfica

```
Portugal
└── Distrito (ex: Setúbal, Lisboa)
    └── Concelho/Município (ex: Seixal, Almada, Lisboa)
```

### Na Tabela `providers`

- `districts[]` - Lista de distritos que o prestador cobre
- `counties[]` - Lista de concelhos/municípios que o prestador cobre

### Na Tabela `service_requests`

- `client_district` - Distrito do cliente
- `client_town` - Concelho/município do cliente

### Match de Localização

A função usa `client_town = ANY(p.counties)` para verificar se o prestador cobre o concelho do pedido.

```
Pedido: client_town = "Seixal"
Prestador: counties = ["Almada", "Seixal", "Lisboa"]
Match: ✓ ("Seixal" está em counties)
```

## Período de Análise

A função aceita um parâmetro `period_months` para filtrar pedidos recentes:

```sql
AND sr.created_at >= (CURRENT_DATE - make_interval(months => period_months))
```

| Período | Descrição |
|---------|-----------|
| 1 mês | Default - último mês |
| 2 meses | Configurável nas settings |
| 3 meses | Para análise mais ampla |

## Configurações (coverage_settings)

| Setting | Descrição | Default |
|---------|-----------|---------|
| `coverage_requests_per_provider` | Pedidos ideais por prestador | 20 |
| `coverage_capacity_good_min` | % mínimo para "Boa" cobertura | 100% |
| `coverage_capacity_low_min` | % mínimo para "Baixa" cobertura | 60% |
| `coverage_analysis_period_months` | Meses a analisar | 2 |

## Cálculo de Capacidade

```
Capacidade = (provider_count × requests_per_provider) / request_count × 100

Exemplo:
  - 4 prestadores
  - 20 pedidos/prestador (config)
  - 10 pedidos no período

  Capacidade = (4 × 20) / 10 × 100 = 800%
```

### Status de Cobertura

| Status | Condição |
|--------|----------|
| 🟢 Boa | capacidade >= 100% |
| 🟡 Baixa | 60% <= capacidade < 100% |
| 🔴 Má | capacidade < 60% |

## Problema Resolvido

**Antes:** Se não existisse `service_mapping`, a função retornava 0 prestadores.

**Depois:** A função tenta primeiro o mapeamento, e se não existir, faz match direto com o nome do serviço.

```sql
-- Fallback quando não há mapeamento
(sm.provider_service_name IS NULL AND p.services @> ARRAY[st.service])
```
