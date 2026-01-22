# Fluxo do Catálogo de Serviços

## Visão Geral

O Catálogo de Serviços é a fonte central de preços de referência para angariação de prestadores. Os dados são originalmente importados do Excel "PreçosAngariação_Tabela Resumo.xlsx" e podem ser geridos manualmente ou via import/export.

**Localização:** Configurações > Tab 5: Catálogo de Serviços

**Ficheiros principais:**
- `src/components/service-catalog/prices-table.tsx`
- `src/components/service-catalog/materials-table.tsx`
- `src/components/service-catalog/catalog-stats.tsx`
- `src/lib/service-catalog/actions.ts`
- `src/app/api/service-catalog/import/route.ts`

---

## 1. Arquitectura de Dados

```mermaid
erDiagram
    service_prices {
        uuid id PK
        text service_name "Ex: Canalizador"
        text cluster "Casa, Empresas, Luxo..."
        text service_group "Grupo interno"
        text unit_description "Por hora, T0-T2..."
        text typology "Tipologia específica"
        decimal vat_rate "0, 6 ou 23"
        date launch_date "Data de lançamento"
        decimal price_base "Valor s/ IVA"
        decimal price_new_visit "Novas visitas"
        decimal price_extra_night "Noites seguintes"
        decimal price_hour_no_materials "Por hora s/ mat."
        decimal price_hour_with_materials "Por hora c/ mat."
        decimal price_cleaning "Só limpeza"
        decimal price_cleaning_treatments "Limpeza + trat."
        decimal price_cleaning_imper "Limpeza + imper."
        decimal price_cleaning_imper_treatments "Limp + imper + trat"
        boolean is_active "Soft delete flag"
        timestamptz created_at
        timestamptz updated_at
    }

    material_catalog {
        uuid id PK
        text material_name UK "Ex: Emboque de sanita"
        text category "Default: Canalizador"
        decimal price_without_vat
        decimal vat_rate "Default: 23"
        boolean is_active "Soft delete flag"
        timestamptz created_at
        timestamptz updated_at
    }
```

### Clusters Disponíveis

| Cluster | Cor (UI) | Descrição |
|---------|----------|-----------|
| Casa | Azul | Serviços domésticos gerais |
| Saúde e bem estar | Verde | Serviços de saúde/bem-estar |
| Empresas | Roxo | Serviços B2B |
| Luxo | Âmbar | Serviços premium |
| Pete | Rosa | Serviços para animais |

### Constraint de Unicidade

```sql
-- Índice único funcional (permite NULL em typology)
CREATE UNIQUE INDEX angariacao_reference_prices_unique_idx
  ON angariacao_reference_prices(
    service_name,
    unit_description,
    COALESCE(typology, '')
  );
```

---

## 2. Fluxo de Gestão Principal

```mermaid
flowchart TD
    subgraph user["👤 Utilizador (Admin)"]
        U[Acede Configurações]
    end

    subgraph page["📄 Página Catálogo"]
        U --> TAB[Tab 5: Catálogo de Serviços]
        TAB --> STATS[Dashboard de Estatísticas]
        TAB --> PRICES[Tabela de Preços]
        TAB --> MATERIALS[Tabela de Materiais]
    end

    subgraph stats["📊 Estatísticas"]
        STATS --> S1[Total Preços Activos]
        STATS --> S2[Total Materiais]
        STATS --> S3[Contagem por Cluster]
        STATS --> S4[Última Actualização]
    end

    subgraph filters["🔍 Filtros"]
        PRICES --> F1[Pesquisa Texto]
        PRICES --> F2[Filtro Cluster]
        PRICES --> F3[Filtro Grupo Serviço]
        PRICES --> F4[Paginação 100/200/500/1000]
    end

    subgraph actions["⚡ Acções"]
        PRICES --> A1[Edição Inline]
        PRICES --> A2[Adicionar Serviço]
        PRICES --> A3[Eliminar Serviço]
        TAB --> A4[Exportar XLSX]
        TAB --> A5[Importar XLSX]
    end

    subgraph db["💾 Database"]
        DB1[(service_prices)]
        DB2[(material_catalog)]
    end

    A1 --> DB1
    A2 --> DB1
    A3 -->|soft delete| DB1
    A4 -->|read| DB1
    A5 -->|replace all| DB1
    A5 -->|replace all| DB2
    MATERIALS -->|read| DB2
```

---

## 3. Fluxo de Edição Inline

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant T as Tabela (UI)
    participant AC as Autocomplete
    participant SA as Server Action
    participant DB as Database

    U->>T: Clica numa célula
    T->>T: Activa modo edição

    alt Campo de texto (service_name, unit_description)
        U->>AC: Digita >= 2 caracteres
        AC->>SA: getServiceNameSuggestions()
        SA->>DB: SELECT DISTINCT service_name ILIKE '%search%'
        DB-->>SA: Sugestões
        SA-->>AC: Lista de sugestões
        AC-->>T: Mostra dropdown
        U->>T: Selecciona ou confirma
    else Campo numérico
        U->>T: Digita valor
    end

    U->>T: Sai da célula (blur)
    T->>SA: updateCatalogPrice(id, data)
    SA->>DB: UPDATE service_prices SET ... WHERE id = ?

    alt Sucesso
        DB-->>SA: OK
        SA->>SA: revalidatePath('/configuracoes')
        SA-->>T: { success: true }
        T-->>U: Célula actualizada (verde)
    else Erro de unicidade
        DB-->>SA: Error 23505
        SA-->>T: { success: false, error: "Já existe..." }
        T-->>U: Toast de erro
    end
```

---

## 4. Fluxo de Importação Excel

```mermaid
flowchart TD
    subgraph upload["📤 Upload"]
        U[Utilizador] -->|Selecciona ficheiro| FILE[.xlsx]
        FILE --> VALIDATE{Validar estrutura}
    end

    subgraph validation["✅ Validação"]
        VALIDATE -->|Falta sheet DB| ERR1[❌ Erro: Sheet DB não encontrada]
        VALIDATE -->|OK| CONFIRM[Modal de Confirmação]
        CONFIRM -->|Cancelar| CANCEL[Operação cancelada]
        CONFIRM -->|Confirmar| PROCESS[Processar]
    end

    subgraph process["⚙️ Processamento"]
        PROCESS --> PARSE_PRICES[Parse Sheet 'DB']
        PROCESS --> PARSE_MAT[Parse Sheet 'Materiais_Canalizador']

        PARSE_PRICES --> CLEAN_P[Limpar strings]
        CLEAN_P --> VAT_P[Parse VAT rate]
        VAT_P --> DATE_P[Parse datas]
        DATE_P --> PRICES_REC[Array de registos]

        PARSE_MAT --> CLEAN_M[Limpar strings]
        CLEAN_M --> MAT_REC[Array de materiais]
    end

    subgraph database["💾 Database"]
        PRICES_REC --> DEL_P[DELETE FROM service_prices]
        MAT_REC --> DEL_M[DELETE FROM material_catalog]

        DEL_P --> INS_P[INSERT em batches de 100]
        DEL_M --> INS_M[INSERT materiais]

        INS_P --> RESULT
        INS_M --> RESULT[Resultado]
    end

    subgraph result["📊 Resultado"]
        RESULT --> SUCCESS[✅ X preços, Y materiais importados]
        SUCCESS --> REVALIDATE[revalidatePath]
    end
```

### Formato do Excel Esperado

**Sheet "DB" (Preços):**

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| Serviços | texto | ✅ | Nome do serviço |
| Cluster | texto | ✅ | Casa, Empresas, etc. |
| Qtd./Unid. | texto | ✅ | Por hora, T0-T2, etc. |
| Grupo (Sheet onde está) | texto | ❌ | Grupo interno |
| Tipologia | texto | ❌ | Especificidade |
| Taxa de IVA | número | ❌ | Default: 23 |
| Data de lançamento do serviço | data | ❌ | |
| Valor s/ IVA | número | ❌ | Preço base |
| Valor s/ IVA - Novas visitas | número | ❌ | |
| Valor s/ IVA - Noites seguintes | número | ❌ | |
| Valor s/IVA - por hora sem materiais | número | ❌ | |
| Valor s/IVA - por hora com materiais | número | ❌ | |
| Valor s/IVA - Limpeza | número | ❌ | |
| Valor s/IVA - Limpeza + Tratamentos | número | ❌ | |
| Valor s/IVA - Limpeza + Imper. | número | ❌ | |
| Valor s/IVA - Limpeza + imper. + Tratamentos | número | ❌ | |

**Sheet "Materiais_Canalizador" (Materiais):**

| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| Material | texto | ✅ |
| Valores s/ IVA | número | ✅ |
| Taxa de IVA | número | ❌ (default: 23) |

---

## 5. Fluxo de Exportação

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant UI as Interface
    participant SA as Server Action
    participant DB as Database
    participant XLSX as xlsx library

    U->>UI: Clica "Exportar"
    UI->>SA: getCatalogPricesForExport(filters)
    SA->>DB: SELECT * WHERE is_active = true AND filters...
    DB-->>SA: Array de preços
    SA-->>UI: CatalogPrice[]

    UI->>XLSX: Cria workbook
    XLSX->>XLSX: Adiciona sheet "Preços"
    XLSX->>XLSX: Formata colunas
    XLSX-->>UI: Blob do ficheiro

    UI->>U: Download "catalogo-servicos-YYYY-MM-DD.xlsx"
```

---

## 6. Server Actions

| Action | Descrição | Retorno |
|--------|-----------|---------|
| `getCatalogStats()` | Estatísticas gerais | `CatalogStats` |
| `getCatalogPrices(params)` | Preços com paginação/filtros | `{ data, total }` |
| `getCatalogMaterials()` | Lista de materiais activos | `CatalogMaterial[]` |
| `getCatalogClusters()` | Clusters únicos | `string[]` |
| `getCatalogServiceGroups(cluster?)` | Grupos de serviço | `string[]` |
| `createCatalogPrice(data)` | Criar novo preço | `{ success, id?, error? }` |
| `updateCatalogPrice(id, data)` | Actualizar preço | `{ success, error? }` |
| `deleteCatalogPrice(id)` | Soft delete | `{ success, error? }` |
| `getServiceNameSuggestions(search)` | Autocomplete | `string[]` |
| `getUnitDescriptionSuggestions(search)` | Autocomplete | `string[]` |
| `getCatalogPricesForExport(filters)` | Todos os preços para export | `CatalogPrice[]` |

---

## 7. Componentes UI

```
src/components/service-catalog/
├── catalog-stats.tsx      # Cards de estatísticas
├── prices-table.tsx       # Tabela principal de preços
├── materials-table.tsx    # Tabela de materiais
├── price-row.tsx          # Linha editável da tabela
├── add-price-dialog.tsx   # Modal para adicionar preço
└── import-dialog.tsx      # Modal de import com confirmação
```

### Características da Tabela

- **Scroll horizontal**: Para acomodar as 9 colunas de preços
- **Colunas redimensionáveis**: Drag nas bordas das colunas
- **Edição inline**: Click para editar, blur para guardar
- **Autocomplete**: Para campos de texto com dados existentes
- **Paginação**: 100, 200, 500 ou 1000 items por página
- **Filtros persistentes**: Mantidos durante navegação na página

---

## 8. RLS (Row Level Security)

```sql
-- Leitura: todos os utilizadores autenticados
CREATE POLICY "Allow read for authenticated"
  ON service_prices FOR SELECT
  TO authenticated USING (true);

-- Escrita: apenas service_role (admin operations)
CREATE POLICY "Allow all for service_role"
  ON service_prices FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
```

**Nota:** As operações de escrita usam `createAdminClient()` que bypassa RLS com a service role key.

---

## 9. Relacionamento com Propostas

O catálogo alimenta o sistema de propostas comerciais para prestadores:

```mermaid
flowchart LR
    subgraph catalogo["Catálogo (Configurações)"]
        SP[(service_prices)]
        MC[(material_catalog)]
    end

    subgraph prestador["Prestador > Tab Preços"]
        SEL[Selecção de Serviços]
        CUSTOM[Preços Customizados]
    end

    subgraph proposta["Geração de Proposta"]
        CALC[Cálculo Final]
        PDF[PDF Download]
    end

    SP -->|Preços base| SEL
    MC -->|Materiais| SEL
    SEL --> CUSTOM
    CUSTOM --> CALC
    CALC --> PDF
```

Ver também: [Fluxo de Preços e Catálogo de Serviços](../../02-FLUXOS-NEGOCIO.md#fluxo-de-preços-e-catálogo-de-serviços)
