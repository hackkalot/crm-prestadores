# Diagrama de Componentes (C4 Level 3)

Visão dos componentes internos da aplicação Next.js e suas interacções.

---

## Diagrama Geral

```mermaid
flowchart TB
    subgraph browser ["🌐 Browser"]
        ui["UI Components<br/>(React Client)"]
    end

    subgraph nextjs ["⚡ Next.js App"]
        subgraph routes ["📄 App Router"]
            candidaturas_page["/(dashboard)/candidaturas"]
            onboarding_page["/(dashboard)/onboarding"]
            prestadores_page["/(dashboard)/prestadores"]
            provider_page["/(dashboard)/providers/[id]"]
            pedidos_page["/(dashboard)/pedidos"]
            rede_page["/(dashboard)/rede"]
            config_page["/(dashboard)/configuracoes"]
        end

        subgraph actions ["⚙️ Server Actions"]
            candidaturas_actions["lib/candidaturas/actions"]
            onboarding_actions["lib/onboarding/actions"]
            prestadores_actions["lib/prestadores/actions"]
            providers_actions["lib/providers/actions"]
            pricing_actions["lib/pricing/actions"]
            service_actions["lib/service-requests/actions"]
            sync_actions["lib/sync/actions"]
        end

        subgraph components ["🧩 Components"]
            ui_components["components/ui/*<br/>(shadcn/ui)"]
            domain_components["components/[domain]/*<br/>(Feature-specific)"]
            layout_components["components/layout/*<br/>(Header, Sidebar)"]
        end

        subgraph middleware_layer ["🔒 Middleware"]
            auth_middleware["middleware.ts<br/>(Auth Check)"]
        end

        subgraph api ["🔌 API Routes"]
            webhooks["api/webhooks/hubspot"]
            sync_api["api/sync/*"]
            alerts_api["api/alerts/generate"]
        end
    end

    subgraph supabase ["🗄️ Supabase"]
        subgraph clients ["Clients"]
            server_client["Server Client<br/>(cookies, RLS)"]
            admin_client["Admin Client<br/>(bypass RLS)"]
            browser_client["Browser Client<br/>(anon key)"]
        end
        db[("PostgreSQL")]
    end

    %% Browser to App
    ui -->|"Request"| auth_middleware
    auth_middleware -->|"Authorized"| routes

    %% Pages to Actions
    candidaturas_page --> candidaturas_actions
    onboarding_page --> onboarding_actions
    prestadores_page --> prestadores_actions
    provider_page --> providers_actions
    provider_page --> pricing_actions
    pedidos_page --> service_actions
    config_page --> sync_actions

    %% Actions to DB
    candidaturas_actions --> server_client
    onboarding_actions --> admin_client
    prestadores_actions --> server_client
    providers_actions --> admin_client
    pricing_actions --> admin_client
    service_actions --> server_client
    sync_actions --> admin_client

    server_client --> db
    admin_client --> db

    %% UI to Browser Client
    ui -.->|"Real-time"| browser_client
    browser_client -.-> db

    %% Components
    routes --> components
    components --> ui

    %% Styles
    classDef pageStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef actionStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef componentStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef clientStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef apiStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class candidaturas_page,onboarding_page,prestadores_page,provider_page,pedidos_page,rede_page,config_page pageStyle
    class candidaturas_actions,onboarding_actions,prestadores_actions,providers_actions,pricing_actions,service_actions,sync_actions actionStyle
    class ui_components,domain_components,layout_components componentStyle
    class server_client,admin_client,browser_client clientStyle
    class webhooks,sync_api,alerts_api apiStyle
```

---

## Componentes por Domínio

### Pages (App Router)

```mermaid
flowchart LR
    subgraph dashboard ["/(dashboard)"]
        candidaturas["candidaturas/page.tsx<br/>Lista de candidaturas"]
        onboarding["onboarding/page.tsx<br/>Kanban board"]
        prestadores["prestadores/page.tsx<br/>Lista de prestadores"]
        provider["providers/[id]/page.tsx<br/>Detalhe prestador"]
        pedidos["pedidos/page.tsx<br/>Pedidos de serviço"]
        rede["rede/page.tsx<br/>Mapa de cobertura"]
        kpis["kpis/page.tsx<br/>Dashboard métricas"]
        agenda["agenda/page.tsx<br/>Calendário tarefas"]
        config["configuracoes/page.tsx<br/>Definições"]
    end

    classDef pageStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    class candidaturas,onboarding,prestadores,provider,pedidos,rede,kpis,agenda,config pageStyle
```

### Server Actions

```mermaid
flowchart LR
    subgraph actions ["lib/*/actions.ts"]
        ca["candidaturas<br/>• getCandidaturas<br/>• createCandidatura<br/>• mergeCandidaturas"]
        oa["onboarding<br/>• getCards<br/>• moveCard<br/>• updateTask"]
        pa["prestadores<br/>• getPrestadores<br/>• updateStatus"]
        pra["providers<br/>• getProvider<br/>• updateProvider<br/>• getNotes"]
        pri["pricing<br/>• getPrices<br/>• updatePrices<br/>• getReferencePrices"]
        sr["service-requests<br/>• getServiceRequests<br/>• getStats"]
        sy["sync<br/>• triggerSync<br/>• getSyncLogs"]
    end

    classDef actionStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    class ca,oa,pa,pra,pri,sr,sy actionStyle
```

### Provider Detail Tabs

```mermaid
flowchart TB
    subgraph provider_detail ["providers/[id]"]
        page["page.tsx<br/>(Server Component)"]

        subgraph tabs ["Tabs"]
            perfil["perfil-tab.tsx<br/>Dados gerais"]
            precos["precos-tab.tsx<br/>Tabela de preços"]
            cobertura["cobertura-tab.tsx<br/>Mapa concelhos"]
            historico["historico-tab.tsx<br/>Timeline"]
            documentos["documentos-tab.tsx<br/>Ficheiros"]
            notas["notas-tab.tsx<br/>Comentários"]
            pedidos_tab["pedidos-tab.tsx<br/>Service requests"]
            submissoes["submissoes-tab.tsx<br/>Form submissions"]
        end
    end

    page --> tabs

    classDef tabStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    class perfil,precos,cobertura,historico,documentos,notas,pedidos_tab,submissoes tabStyle
```

---

## Fluxo de Dados Detalhado

### Leitura (GET)

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as Middleware
    participant P as Page (Server)
    participant A as Server Action
    participant S as Supabase Client
    participant DB as PostgreSQL

    B->>M: Request /prestadores
    M->>M: Check auth cookie
    M->>P: Forward (authorized)
    P->>A: getPrestadores(filters)
    A->>S: createClient()
    S->>DB: SELECT with RLS
    DB-->>S: Filtered rows
    S-->>A: Data
    A-->>P: Typed response
    P-->>B: HTML (streamed)
```

### Escrita (POST/PUT)

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Form (Client)
    participant A as Server Action
    participant S as Admin Client
    participant DB as PostgreSQL

    B->>F: Submit form
    F->>A: formAction(formData)
    A->>A: Validate with Zod
    A->>S: createAdminClient()
    S->>DB: INSERT/UPDATE
    DB-->>S: Result
    S-->>A: Success/Error
    A->>A: revalidatePath()
    A-->>F: Response
    F-->>B: Updated UI
```

---

## Clientes Supabase

| Cliente | Ficheiro | Uso | RLS |
|---------|----------|-----|-----|
| **Server** | `lib/supabase/server.ts` | Server Components, Actions | ✅ Respeitado |
| **Admin** | `lib/supabase/admin.ts` | Operações privilegiadas | ❌ Bypass |
| **Browser** | `lib/supabase/client.ts` | Client Components | ✅ Respeitado |

### Quando usar cada um

```mermaid
flowchart TD
    start["Preciso aceder à DB"] --> q1{"É no servidor?"}

    q1 -->|Não| browser["Browser Client<br/>(real-time, auth UI)"]
    q1 -->|Sim| q2{"Precisa bypass RLS?"}

    q2 -->|Não| server["Server Client<br/>(leituras normais)"]
    q2 -->|Sim| admin["Admin Client<br/>(contagens, creates)"]

    classDef clientStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    class browser,server,admin clientStyle
```

---

## Documentos Relacionados

- [containers.md](./containers.md) - Diagrama de Containers (C4 Level 2)
- [context.md](./context.md) - Diagrama de Contexto (C4 Level 1)
- [01-ARQUITETURA.md](../../01-ARQUITETURA.md) - Arquitectura detalhada
- [05-COMPONENTES.md](../../05-COMPONENTES.md) - Padrões UI

---

*Última actualização: Janeiro 2026*
