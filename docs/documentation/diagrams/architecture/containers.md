# Diagrama de Containers (C4 Level 2)

Visão dos containers (aplicações, bases de dados, serviços) que compõem o sistema.

---

## Diagrama

```mermaid
flowchart TB
    subgraph users ["👤 Utilizadores"]
        user["Gestor de Prestadores"]
    end

    subgraph vercel ["☁️ Vercel"]
        subgraph nextjs ["Next.js 16 App"]
            pages["Pages<br/>(Server Components)"]
            actions["Server Actions<br/>(Mutações)"]
            api["API Routes<br/>(Webhooks)"]
            middleware["Middleware<br/>(Auth Check)"]
        end
    end

    subgraph supabase ["🗄️ Supabase"]
        db[("PostgreSQL<br/>Base de Dados")]
        auth["Auth Service<br/>(JWT + Sessions)"]
        rls["RLS Policies<br/>(Row Level Security)"]
    end

    subgraph github ["⚙️ GitHub"]
        actions_runner["Actions Runner<br/>(Ubuntu)"]
        puppeteer["Puppeteer<br/>(Chrome Headless)"]
    end

    subgraph external ["🌐 Externos"]
        mapbox["Mapbox GL<br/>(Tiles + API)"]
        hubspot["HubSpot<br/>(Webhooks)"]
        backoffice["Backoffice FIXO<br/>(Legacy)"]
    end

    %% User flow
    user -->|"HTTPS"| middleware
    middleware -->|"Verifica sessão"| auth
    middleware -->|"Permite"| pages
    pages -->|"Lê dados"| actions
    actions -->|"Query"| db

    %% Auth flow
    auth -->|"Valida JWT"| rls
    rls -->|"Filtra rows"| db

    %% Webhooks
    hubspot -->|"POST /api/webhooks"| api
    api -->|"Insere"| db

    %% Sync flow
    actions -->|"repository_dispatch"| actions_runner
    actions_runner -->|"Executa"| puppeteer
    puppeteer -->|"Scraping"| backoffice
    puppeteer -->|"Insere dados"| db

    %% Maps
    pages -->|"Carrega tiles"| mapbox

    %% Styles
    classDef userStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef vercelStyle fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef supabaseStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef githubStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef extStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class user userStyle
    class pages,actions,api,middleware vercelStyle
    class db,auth,rls supabaseStyle
    class actions_runner,puppeteer githubStyle
    class mapbox,hubspot,backoffice extStyle
```

---

## Containers do Sistema

### Vercel (Frontend + Backend)

| Container | Tecnologia | Responsabilidade |
|-----------|------------|------------------|
| **Pages** | React Server Components | Renderização de UI, fetch de dados |
| **Server Actions** | Next.js Actions | Mutações (create, update, delete) |
| **API Routes** | Next.js Route Handlers | Webhooks externos (HubSpot) |
| **Middleware** | Next.js Middleware | Verificação de autenticação em todas as rotas |

### Supabase (Dados + Auth)

| Container | Tecnologia | Responsabilidade |
|-----------|------------|------------------|
| **PostgreSQL** | PostgreSQL 15 | Armazenamento de dados |
| **Auth Service** | Supabase Auth | Gestão de sessões, JWT |
| **RLS Policies** | PostgreSQL RLS | Controlo de acesso por row |

### GitHub (Sincronização)

| Container | Tecnologia | Responsabilidade |
|-----------|------------|------------------|
| **Actions Runner** | Ubuntu Latest | Ambiente de execução |
| **Puppeteer** | Chrome Headless | Scraping do backoffice |

---

## Fluxos Principais

### 1. Acesso Normal
```
User → Middleware → Auth → Pages → Actions → DB
```

### 2. Webhook HubSpot
```
HubSpot → API Route → DB
```

### 3. Sincronização
```
Actions → GitHub → Puppeteer → Backoffice → DB
```

---

## Comunicação Entre Containers

| De | Para | Protocolo | Porta |
|----|------|-----------|-------|
| Browser | Vercel | HTTPS | 443 |
| Next.js | Supabase | PostgreSQL | 5432 |
| Next.js | Mapbox | HTTPS | 443 |
| GitHub Actions | Supabase | PostgreSQL | 5432 |
| HubSpot | Next.js | HTTPS | 443 |

---

## Documentos Relacionados

- [context.md](./context.md) - Diagrama de Contexto (C4 Level 1)
- [01-ARQUITETURA.md](../../01-ARQUITETURA.md) - Arquitectura detalhada
- [04-INTEGRACOES.md](../../04-INTEGRACOES.md) - Detalhes das integrações

---

*Última actualização: Janeiro 2026*
