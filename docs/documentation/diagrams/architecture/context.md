# Diagrama de Contexto (C4 Level 1)

Visão de alto nível do sistema CRM Prestadores e suas integrações externas.

---

## Diagrama

```mermaid
flowchart TB
    subgraph users ["👤 Utilizadores"]
        user["Gestor de Prestadores"]
    end

    subgraph crm ["🏢 CRM Prestadores"]
        app["Next.js App<br/>(Vercel)"]
    end

    subgraph external ["🌐 Sistemas Externos"]
        supabase[("Supabase<br/>PostgreSQL + Auth")]
        github["GitHub Actions<br/>Scripts de Sync"]
        mapbox["Mapbox<br/>Mapas"]
        hubspot["HubSpot<br/>CRM Vendas"]
    end

    subgraph legacy ["🏛️ Sistema Legado"]
        backoffice["Backoffice FIXO<br/>Pedidos de Serviço"]
    end

    %% Relações principais
    user -->|"HTTPS"| app
    app <-->|"PostgreSQL"| supabase
    app -->|"API"| mapbox
    app -->|"Dispara workflow"| github

    %% Integrações
    hubspot -->|"Webhook"| app
    github -->|"Puppeteer"| backoffice
    github -->|"Insere dados"| supabase

    %% Estilos
    classDef userStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef appStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dbStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef extStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef legacyStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class user userStyle
    class app appStyle
    class supabase dbStyle
    class github,mapbox,hubspot extStyle
    class backoffice legacyStyle
```

---

## Legenda

| Elemento | Descrição |
|----------|-----------|
| **Gestor de Prestadores** | Utilizador interno que gere candidaturas, onboarding e prestadores activos |
| **Next.js App** | Aplicação web hospedada na Vercel (frontend + server actions) |
| **Supabase** | Base de dados PostgreSQL + sistema de autenticação |
| **GitHub Actions** | Executa scripts de sincronização com Puppeteer |
| **Mapbox** | Serviço de mapas para visualização de cobertura |
| **HubSpot** | CRM de vendas que envia candidaturas via webhook |
| **Backoffice FIXO** | Sistema legado sem API (scraping necessário) |

---

## Fluxos Principais

### 1. Utilização Normal
```
Utilizador → CRM → Supabase
```

### 2. Nova Candidatura (HubSpot)
```
HubSpot → Webhook → CRM → Supabase
```

### 3. Sincronização de Pedidos
```
CRM → GitHub Actions → Backoffice FIXO → Supabase
```

### 4. Visualização de Mapa
```
CRM → Mapbox API → Renderiza mapa
```

---

## Documentos Relacionados

- [01-ARQUITETURA.md](../../01-ARQUITETURA.md) - Arquitectura detalhada
- [04-INTEGRACOES.md](../../04-INTEGRACOES.md) - Detalhes das integrações

---

*Última actualização: Janeiro 2026*
