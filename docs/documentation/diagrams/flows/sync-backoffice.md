# Sincronização com Backoffice FIXO

Este diagrama detalha o sistema de sincronização de dados entre o CRM e o backoffice FIXO via GitHub Actions.

> **Documentação completa:** [04-INTEGRACOES.md](../../04-INTEGRACOES.md#backoffice-fixo-scrappers)

---

## Arquitectura Geral

```mermaid
flowchart TB
    subgraph crm ["☁️ CRM (Vercel)"]
        button["🔘 Botão Sync"]
        api["API Route<br/>/api/sync/*"]
        logs_page["📊 Página Logs<br/>/configuracoes/sync-logs"]
    end

    subgraph github ["⚙️ GitHub Actions"]
        dispatch["repository_dispatch"]
        cron["⏰ Cron Schedule<br/>(Segundas 07:00 PT)"]
        runner["🏃 Ubuntu Runner"]
        puppeteer["🎭 Puppeteer<br/>(Chrome Headless)"]
    end

    subgraph backoffice ["🏢 Backoffice FIXO"]
        login["Login Page"]
        export["Export Excel"]
        data["📊 Dados<br/>(Pedidos, Prestadores, etc.)"]
    end

    subgraph supabase ["🗄️ Supabase"]
        db[("PostgreSQL")]
        sync_logs["sync_logs<br/>billing_sync_logs<br/>provider_sync_logs<br/>allocation_sync_logs"]
    end

    %% Triggers
    button -->|"POST"| api
    api -->|"repository_dispatch"| dispatch
    cron -->|"scheduled"| runner
    dispatch --> runner

    %% Scraping flow
    runner --> puppeteer
    puppeteer -->|"1. Login"| login
    puppeteer -->|"2. Navigate"| export
    puppeteer -->|"3. Download"| data

    %% Data flow
    puppeteer -->|"4. Parse Excel"| db
    puppeteer -->|"5. Update status"| sync_logs

    %% Monitoring
    logs_page -->|"polling 5s"| sync_logs

    classDef crmStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef githubStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef backofficeStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef supabaseStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class button,api,logs_page crmStyle
    class dispatch,cron,runner,puppeteer githubStyle
    class login,export,data backofficeStyle
    class db,sync_logs supabaseStyle
```

---

## 4 Scrappers Disponíveis

```mermaid
flowchart LR
    subgraph schedule ["⏰ Segundas-feiras (PT)"]
        direction TB
        s1["06:00 UTC<br/>Pedidos de Serviço"]
        s2["06:30 UTC<br/>Faturação"]
        s3["07:00 UTC<br/>Prestadores"]
        s4["07:30 UTC<br/>Histórico Alocação"]
    end

    subgraph workflows ["📁 Workflows"]
        w1["sync-backoffice.yml"]
        w2["sync-billing.yml"]
        w3["sync-providers.yml"]
        w4["sync-allocation-history.yml"]
    end

    subgraph tables ["🗄️ Tabelas"]
        t1["service_requests"]
        t2["billing_processes"]
        t3["providers"]
        t4["allocation_history"]
    end

    s1 --> w1 --> t1
    s2 --> w2 --> t2
    s3 --> w3 --> t3
    s4 --> w4 --> t4

    classDef scheduleStyle fill:#fff8e1,stroke:#f9a825,stroke-width:1px
    classDef workflowStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef tableStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class s1,s2,s3,s4 scheduleStyle
    class w1,w2,w3,w4 workflowStyle
    class t1,t2,t3,t4 tableStyle
```

---

## Formas de Execução

```mermaid
flowchart TB
    subgraph triggers ["🎯 3 Formas de Trigger"]
        manual["👆 Manual<br/>(GitHub UI)"]
        crm_button["🖱️ Via CRM<br/>(Botão Sync)"]
        scheduled["⏰ Automático<br/>(Cron Semanal)"]
    end

    subgraph github ["GitHub Actions"]
        workflow_dispatch["workflow_dispatch"]
        repository_dispatch["repository_dispatch"]
        cron_trigger["schedule (cron)"]
        runner["🏃 Runner"]
    end

    manual --> workflow_dispatch
    crm_button --> repository_dispatch
    scheduled --> cron_trigger

    workflow_dispatch --> runner
    repository_dispatch --> runner
    cron_trigger --> runner

    classDef manualStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef crmStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef scheduledStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class manual manualStyle
    class crm_button crmStyle
    class scheduled scheduledStyle
```

---

## Fluxo Detalhado: Sync Manual via CRM

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Utilizador
    participant CRM as ☁️ CRM (Vercel)
    participant API as API Route
    participant GH as ⚙️ GitHub API
    participant GA as 🏃 GitHub Actions
    participant BO as 🏢 Backoffice
    participant DB as 🗄️ Supabase

    U->>CRM: Clica "Sincronizar"
    CRM->>API: POST /api/sync/github-actions

    Note over API: Criar log com status "pending"
    API->>DB: INSERT sync_logs (triggered_by: user_id)
    DB-->>API: sync_log_id

    Note over API: Disparar workflow
    API->>GH: POST /repos/{repo}/dispatches
    Note right of GH: event_type: "sync-backoffice"<br/>client_payload: { sync_log_id }
    GH-->>API: 204 No Content

    API-->>CRM: { success: true, sync_log_id }
    CRM-->>U: "Sincronização iniciada"

    Note over GA: Workflow triggered
    GA->>DB: UPDATE sync_logs SET status = "in_progress"

    GA->>BO: Login (Puppeteer)
    BO-->>GA: Session

    GA->>BO: Navigate to Export
    GA->>BO: Click "Exportar Dados"
    BO-->>GA: Excel file

    Note over GA: Parse Excel rows
    loop Para cada registo
        GA->>DB: UPSERT service_requests
    end

    GA->>DB: UPDATE sync_logs SET status = "completed"
    Note right of DB: records_processed: X<br/>records_inserted: Y<br/>records_updated: Z

    Note over CRM: Polling a cada 5s
    CRM->>DB: SELECT * FROM sync_logs
    DB-->>CRM: status: "completed"
    CRM-->>U: ✅ Sync concluído
```

---

## Fluxo Detalhado: Sync Automático (Scheduled)

```mermaid
sequenceDiagram
    autonumber
    participant CRON as ⏰ Cron (06:00 UTC)
    participant GA as 🏃 GitHub Actions
    participant BO as 🏢 Backoffice
    participant DB as 🗄️ Supabase

    Note over CRON: Segunda-feira 06:00 UTC
    CRON->>GA: Trigger workflow

    GA->>DB: INSERT sync_logs
    Note right of DB: triggered_by: null<br/>triggered_by_system: "github-actions-scheduled"

    GA->>BO: Login (Puppeteer)
    BO-->>GA: Session

    GA->>BO: Navigate + Export
    BO-->>GA: Excel (últimos 90 dias)

    loop Para cada registo
        GA->>DB: UPSERT data
    end

    GA->>DB: UPDATE sync_logs SET status = "completed"
```

---

## Puppeteer Scraping Flow

```mermaid
flowchart TB
    subgraph scraper ["🎭 Puppeteer Script"]
        start["Iniciar Browser<br/>(Chrome Headless)"]
        login["Login no Backoffice"]
        navigate["Navegar para página"]
        filter["Aplicar filtros<br/>(datas, estados)"]
        export["Clicar 'Exportar'"]
        wait["Aguardar download<br/>(timeout 2min)"]
        parse["Parse Excel<br/>(xlsx)"]
        upsert["Upsert Supabase"]
        close["Fechar Browser"]
    end

    start --> login
    login --> navigate
    navigate --> filter
    filter --> export
    export --> wait
    wait --> parse
    parse --> upsert
    upsert --> close

    subgraph errors ["⚠️ Tratamento de Erros"]
        screenshot["📸 Screenshot"]
        log_error["📝 Log erro"]
        retry["🔄 Retry (3x)"]
    end

    login -.->|"falha"| screenshot
    export -.->|"timeout"| screenshot
    screenshot --> log_error
    log_error --> retry

    classDef stepStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef errorStyle fill:#ffebee,stroke:#c62828,stroke-width:1px

    class start,login,navigate,filter,export,wait,parse,upsert,close stepStyle
    class screenshot,log_error,retry errorStyle
```

---

## Sistema de Logs

```mermaid
flowchart TB
    subgraph logs ["📊 Tabelas de Logs"]
        sync["sync_logs<br/>(Pedidos)"]
        billing["billing_sync_logs<br/>(Faturação)"]
        provider["provider_sync_logs<br/>(Prestadores)"]
        allocation["allocation_sync_logs<br/>(Alocação)"]
    end

    subgraph status ["📋 Estados"]
        pending["⏳ pending"]
        progress["🔄 in_progress"]
        completed["✅ completed"]
        error["❌ error"]
    end

    subgraph metrics ["📈 Métricas"]
        records["records_processed"]
        inserted["records_inserted"]
        updated["records_updated"]
        duration["duration_seconds"]
        triggered["triggered_by / triggered_by_system"]
    end

    pending --> progress
    progress --> completed
    progress --> error

    logs --> status
    logs --> metrics

    classDef logStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px
    classDef statusStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef metricStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class sync,billing,provider,allocation logStyle
    class pending,progress,completed,error statusStyle
    class records,inserted,updated,duration,triggered metricStyle
```

---

## Monitorização no CRM

```mermaid
flowchart LR
    subgraph page ["📊 /configuracoes/sync-logs"]
        list["Lista de Syncs"]
        filter["Filtros<br/>(tipo, status, data)"]
        detail["Detalhes<br/>(métricas, erros)"]
    end

    subgraph polling ["🔄 Polling"]
        check["Verificar status"]
        interval["Cada 5 segundos"]
    end

    subgraph actions ["⚡ Acções"]
        trigger["Disparar sync"]
        view["Ver no GitHub"]
    end

    list --> filter
    list --> detail
    list --> polling

    check --> interval
    interval -->|"se in_progress"| check

    list --> actions

    classDef pageStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef pollingStyle fill:#fff8e1,stroke:#f9a825,stroke-width:1px
    classDef actionStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class list,filter,detail pageStyle
    class check,interval pollingStyle
    class trigger,view actionStyle
```

---

## Configuração de Secrets

```mermaid
flowchart TB
    subgraph github_secrets ["🔐 GitHub Repository Secrets"]
        gs1["BACKOFFICE_USERNAME"]
        gs2["BACKOFFICE_PASSWORD"]
        gs3["SUPABASE_URL"]
        gs4["SUPABASE_SERVICE_ROLE_KEY"]
    end

    subgraph vercel_env ["🔐 Vercel Environment Variables"]
        ve1["GITHUB_ACTIONS_TOKEN<br/>(Fine-grained PAT)"]
        ve2["GITHUB_REPO<br/>(org/repo-name)"]
    end

    subgraph usage ["📍 Onde são usados"]
        ga["GitHub Actions<br/>(Scrappers)"]
        crm["CRM<br/>(Trigger via API)"]
    end

    github_secrets --> ga
    vercel_env --> crm

    classDef secretStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef usageStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px

    class gs1,gs2,gs3,gs4,ve1,ve2 secretStyle
    class ga,crm usageStyle
```

> 📖 **O que são Secrets?** Para uma explicação detalhada sobre o que são secrets, porque são importantes e boas práticas de segurança, consulta [07-SEGURANCA.md](../../07-SEGURANCA.md#gestão-de-secrets-e-credenciais).

---

## Resumo: Tabela de Scrappers

| Scrapper | Workflow | Horário UTC | Período | Tabela Dados | Tabela Logs |
|----------|----------|------------------|---------|--------------|-------------|
| **Pedidos** | `sync-backoffice.yml` | Seg 06:00 | 90 dias | `service_requests` | `sync_logs` |
| **Faturação** | `sync-billing.yml` | Seg 06:30 | Todos | `billing_processes` | `billing_sync_logs` |
| **Prestadores** | `sync-providers.yml` | Seg 07:00 | Todos | `providers` | `provider_sync_logs` |
| **Alocação** | `sync-allocation-history.yml` | Seg 07:30 | Mês | `allocation_history` | `allocation_sync_logs` |

---

## Código Relacionado

| Ficheiro | Descrição |
|----------|-----------|
| `.github/workflows/sync-*.yml` | Workflow definitions |
| `scripts/sync-*-github.ts` | Standalone Puppeteer scripts |
| `src/app/api/sync/*/route.ts` | API routes para trigger |
| `src/lib/sync/actions.ts` | Server actions |
| `src/app/(dashboard)/configuracoes/sync-logs/page.tsx` | Página de logs |

---

## Documentos Relacionados

- [04-INTEGRACOES.md](../../04-INTEGRACOES.md#backoffice-fixo-scrappers) - **Configuração completa e troubleshooting**
- [containers.md](../architecture/containers.md) - Arquitectura de containers
- [02-FLUXOS-NEGOCIO.md](../../02-FLUXOS-NEGOCIO.md#sincronização-de-dados) - Visão de negócio

---

*Última actualização: Janeiro 2026*
