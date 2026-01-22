# Fluxo do Catálogo de Serviços

## Gestão de Preços e Materiais

Este diagrama ilustra as interacções principais na gestão do catálogo de serviços, incluindo visualização, edição, e processos de importação/exportação.

```mermaid
graph TD
    A[Gestor / Admin] -->|Acede| C[Configurações > Catálogo]
    
    C -->|Visualiza| D[Dashboard Stats]
    C -->|Consulta| E[Tabela de Preços]
    
    subgraph "Visualização"
        E -->|Filtros| E1[Cluster/Grupo]
        E -->|Pesquisa| E2[Texto Livre]
        E -->|Paginação| E3[100/1000 items]
        E -->|Colunas| E4[Redimensionáveis]
    end
    
    subgraph "Gestão Manual"
        E -->|Edição| F[Inline Edit]
        F -->|Autocomplete| F1[Sugestões DB]
        E -->|Novo| G[Adicionar Serviço]
        G -->|Validação| G1[Unicidade]
        E -->|Apagar| H[Soft Delete]
    end
    
    subgraph "Import / Export"
        C -->|Action| I[Exportar XLSX]
        I -->|Download| J[Ficheiro com Filtros]
        
        C -->|Action| K[Importar XLSX]
        K -->|Upload| L[Validação Ficheiro]
        L -->|Sheets: DB, Materiais| M[Confirmar Substituição]
        M -->|Delete All + Insert| N[Atualizar DB]
    end
    
    subgraph "Database"
        DB1[(service_prices)]
        DB2[(material_catalog)]
    end
    
    F --> DB1
    G --> DB1
    H --> DB1
    N --> DB1 & DB2
    E -->|Read| DB1
```
