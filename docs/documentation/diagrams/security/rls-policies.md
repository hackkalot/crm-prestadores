# Row Level Security (RLS) Policies

Este documento detalha como o Row Level Security do PostgreSQL protege os dados no CRM Prestadores.

> **Documentação completa:** [07-SEGURANCA.md](../../07-SEGURANCA.md#row-level-security-rls)

---

## O Que é RLS?

Row Level Security (RLS) é um mecanismo de segurança **a nível de base de dados** que controla quem pode ver e modificar cada linha de uma tabela. As políticas são avaliadas pelo PostgreSQL, não pela aplicação.

```mermaid
flowchart TB
    subgraph app ["Aplicação (Next.js)"]
        req["Request do utilizador"]
        action["Server Action"]
    end

    subgraph supabase ["Supabase"]
        api["API REST/PostgREST"]
        jwt["Verifica JWT"]
    end

    subgraph postgres ["PostgreSQL"]
        rls["RLS Policies"]
        data[("Dados")]
    end

    req --> action
    action --> api
    api --> jwt
    jwt -->|"auth.uid()"| rls
    rls -->|"USING clause"| data

    classDef appStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef supabaseStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef postgresStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class req,action appStyle
    class api,jwt supabaseStyle
    class rls,data postgresStyle
```

---

## Benefícios do RLS

| Benefício | Descrição |
|-----------|-----------|
| **Defense in Depth** | Mesmo que a aplicação tenha um bug, a BD bloqueia acessos indevidos |
| **Impossível de Bypass** | Políticas são avaliadas pelo PostgreSQL, não pelo código |
| **Auditável** | Políticas são SQL declarativo, fáceis de revisar |
| **Granular** | Diferentes regras para SELECT, INSERT, UPDATE, DELETE |

---

## Clientes Supabase e RLS

```mermaid
flowchart LR
    subgraph clients ["Clientes Supabase"]
        server["createClient()<br/>(Server)"]
        browser["createClient()<br/>(Browser)"]
        admin["createAdminClient()<br/>(Admin)"]
    end

    subgraph keys ["Keys Usadas"]
        anon["Anon Key"]
        service["Service Role Key"]
    end

    subgraph rls ["RLS"]
        active["RLS Activo"]
        bypass["RLS Bypass"]
    end

    server -->|"Anon + Cookies"| anon
    browser -->|"Anon"| anon
    admin -->|"Service Role"| service

    anon --> active
    service --> bypass

    classDef clientStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef keyStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef rlsActiveStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef rlsBypassStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class server,browser,admin clientStyle
    class anon,service keyStyle
    class active rlsActiveStyle
    class bypass rlsBypassStyle
```

| Cliente | Key | RLS | Quando Usar |
|---------|-----|-----|-------------|
| `createClient()` (server) | Anon + Cookies | **Activo** | Operações normais de utilizadores |
| `createClient()` (browser) | Anon | **Activo** | Real-time, operações no cliente |
| `createAdminClient()` | Service Role | **Bypass** | Operações admin, sync, migrations |

---

## Arquitectura de Políticas por Tabela

```mermaid
flowchart TB
    subgraph core ["Tabelas Core"]
        providers["providers<br/>Prestadores"]
        candidates["candidaturas<br/>Candidaturas"]
        cards["onboarding_cards<br/>Cards Kanban"]
        tasks["onboarding_tasks<br/>Tarefas"]
    end

    subgraph sync ["Tabelas de Sync"]
        service_req["service_requests<br/>Pedidos"]
        allocations["allocation_history<br/>Alocações"]
        sync_logs["sync_logs<br/>Logs de Sync"]
    end

    subgraph config ["Tabelas de Config"]
        settings["settings<br/>Configurações"]
        task_defs["task_definitions<br/>Def. Tarefas"]
        stage_defs["stage_definitions<br/>Def. Etapas"]
    end

    subgraph perms ["Tabelas de Permissões"]
        roles["roles"]
        pages["pages"]
        role_perms["role_permissions"]
    end

    subgraph users_t ["Tabelas de Users"]
        users["users<br/>Utilizadores"]
        history["history_log<br/>Auditoria"]
    end

    core --> policy_auth["authenticated<br/>SELECT/INSERT/UPDATE"]
    sync --> policy_auth
    config --> policy_admin["admin only<br/>UPDATE/DELETE"]
    perms --> policy_mixed["approved users<br/>SELECT only"]
    users_t --> policy_self["self + admins"]

    classDef tableStyle fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    classDef policyAuth fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef policyAdmin fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef policyMixed fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class providers,candidates,cards,tasks,service_req,allocations,sync_logs,settings,task_defs,stage_defs,roles,pages,role_perms,users,history tableStyle
    class policy_auth policyAuth
    class policy_admin policyAdmin
    class policy_mixed,policy_self policyMixed
```

---

## Políticas Detalhadas

### 1. Tabela `providers` (Prestadores)

```mermaid
flowchart LR
    subgraph ops ["Operações"]
        sel["SELECT"]
        ins["INSERT"]
        upd["UPDATE"]
        del["DELETE"]
    end

    subgraph who ["Quem Pode"]
        auth["authenticated"]
        admin["service_role only"]
    end

    sel --> auth
    ins --> auth
    upd --> auth
    del --> admin

    classDef opStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef authStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef adminStyle fill:#ffebee,stroke:#c62828,stroke-width:1px

    class sel,ins,upd,del opStyle
    class auth authStyle
    class admin adminStyle
```

```sql
-- Leitura: qualquer utilizador autenticado
CREATE POLICY "providers_select" ON providers
  FOR SELECT TO authenticated
  USING (true);

-- Inserção: qualquer utilizador autenticado
CREATE POLICY "providers_insert" ON providers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Actualização: qualquer utilizador autenticado
CREATE POLICY "providers_update" ON providers
  FOR UPDATE TO authenticated
  USING (true);

-- Eliminação: apenas via service_role (admin)
-- Não existe policy para DELETE com authenticated
```

### 2. Tabela `users` (Utilizadores)

```mermaid
flowchart LR
    subgraph ops ["Operações"]
        sel["SELECT"]
        upd["UPDATE"]
    end

    subgraph rules ["Regras"]
        sel_rule["Todos os aprovados<br/>podem ver lista"]
        upd_rule["Apenas próprio perfil<br/>ou admin"]
    end

    sel --> sel_rule
    upd --> upd_rule

    classDef opStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef ruleStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class sel,upd opStyle
    class sel_rule,upd_rule ruleStyle
```

```sql
-- Leitura: utilizadores aprovados podem ver outros
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.approval_status = 'approved'
    )
  );

-- Actualização: apenas o próprio perfil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### 3. Tabelas de Permissões (`roles`, `pages`, `role_permissions`)

```mermaid
flowchart TB
    subgraph tables ["Tabelas"]
        roles["roles"]
        pages["pages"]
        perms["role_permissions"]
    end

    subgraph read ["Leitura (SELECT)"]
        approved["Utilizadores aprovados"]
    end

    subgraph write ["Escrita (INSERT/UPDATE/DELETE)"]
        admin["Apenas service_role<br/>(operações admin)"]
    end

    tables --> read
    tables --> write

    classDef tableStyle fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    classDef readStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef writeStyle fill:#ffebee,stroke:#c62828,stroke-width:1px

    class roles,pages,perms tableStyle
    class approved readStyle
    class admin writeStyle
```

```sql
-- Roles: leitura para utilizadores aprovados
CREATE POLICY "roles_select" ON roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND approval_status = 'approved'
    )
  );

-- Pages: leitura para utilizadores aprovados
CREATE POLICY "pages_select" ON pages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND approval_status = 'approved'
    )
  );

-- Role Permissions: leitura para utilizadores aprovados
CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND approval_status = 'approved'
    )
  );

-- Escrita: apenas via createAdminClient() (service_role)
```

### 4. Tabelas de Sync (`service_requests`, `sync_logs`)

```sql
-- Service Requests: leitura para autenticados
CREATE POLICY "service_requests_select" ON service_requests
  FOR SELECT TO authenticated
  USING (true);

-- Escrita via service_role (GitHub Actions sync)
CREATE POLICY "service_requests_all" ON service_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Sync Logs: leitura para autenticados
CREATE POLICY "sync_logs_select" ON sync_logs
  FOR SELECT TO authenticated
  USING (true);

-- Inserção de logs por autenticados
CREATE POLICY "sync_logs_insert" ON sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

### 5. Tabela `history_log` (Auditoria)

```sql
-- Apenas inserção (append-only audit log)
CREATE POLICY "history_log_insert" ON history_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Leitura para autenticados
CREATE POLICY "history_log_select" ON history_log
  FOR SELECT TO authenticated
  USING (true);

-- Sem UPDATE/DELETE - logs são imutáveis
```

---

## Fluxo de Verificação RLS

```mermaid
sequenceDiagram
    participant U as Utilizador
    participant App as Server Action
    participant API as Supabase API
    participant RLS as RLS Engine
    participant DB as PostgreSQL

    U->>App: Pede lista de prestadores
    App->>API: supabase.from('providers').select('*')

    Note over API: Extrai JWT dos cookies

    API->>RLS: Query + auth.uid()
    RLS->>RLS: Avalia USING clause

    alt Policy permite
        RLS->>DB: Executa query
        DB-->>RLS: Rows filtradas
        RLS-->>API: Resultado
        API-->>App: { data: [...] }
        App-->>U: Lista de prestadores
    else Policy nega
        RLS-->>API: 0 rows / error
        API-->>App: { data: [], error: null }
        App-->>U: Lista vazia
    end
```

---

## Matriz Resumo de Políticas

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `providers` | authenticated | authenticated | authenticated | service_role |
| `candidaturas` | authenticated | authenticated | authenticated | service_role |
| `onboarding_cards` | authenticated | authenticated | authenticated | service_role |
| `onboarding_tasks` | authenticated | authenticated | authenticated | service_role |
| `users` | approved users | auth.users | self only | - |
| `roles` | approved users | service_role | service_role | service_role |
| `pages` | approved users | service_role | service_role | service_role |
| `role_permissions` | approved users | service_role | service_role | service_role |
| `service_requests` | authenticated | service_role | service_role | service_role |
| `sync_logs` | authenticated | authenticated | service_role | - |
| `history_log` | authenticated | authenticated | - | - |
| `settings` | authenticated | service_role | service_role | - |

---

## Funções Auxiliares RLS

O sistema usa funções PostgreSQL para lógica de permissões reutilizável:

```sql
-- Verifica se utilizador pode aceder a uma página
CREATE OR REPLACE FUNCTION can_user_access_page(user_id UUID, page_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN users u ON u.role_id = rp.role_id
    JOIN pages p ON p.id = rp.page_id
    WHERE u.id = user_id
    AND p.key = page_key
    AND rp.can_access = true
    AND u.approval_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtém páginas acessíveis pelo utilizador
CREATE OR REPLACE FUNCTION get_user_accessible_pages(user_id UUID)
RETURNS TABLE(page_key TEXT, page_name TEXT, page_path TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.key, p.name, p.path
  FROM pages p
  JOIN role_permissions rp ON rp.page_id = p.id
  JOIN users u ON u.role_id = rp.role_id
  WHERE u.id = user_id
  AND rp.can_access = true
  AND p.is_active = true
  ORDER BY p.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Debugging de RLS

Para verificar se RLS está activo numa tabela:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Para listar políticas de uma tabela:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'providers';
```

---

## Documentos Relacionados

- [07-SEGURANCA.md](../../07-SEGURANCA.md) - Segurança geral do sistema
- [03-BASE-DADOS.md](../../03-BASE-DADOS.md) - Schema da base de dados
- [auth-flow.md](./auth-flow.md) - Fluxo de autenticação

---

*Última actualização: Janeiro 2026*
