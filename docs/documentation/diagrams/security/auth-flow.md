# Fluxo de Autenticação

Este diagrama detalha o sistema de autenticação e autorização do CRM, incluindo o processo de aprovação de utilizadores por administradores.

> **Documentação completa:** [07-SEGURANCA.md](../../07-SEGURANCA.md)

---

## Visão Geral

```mermaid
flowchart TB
    subgraph public ["🌐 Área Pública"]
        login["Página Login<br/>/login"]
        register["Página Registo<br/>/registar"]
    end

    subgraph auth ["🔐 Supabase Auth"]
        auth_check["Verificar<br/>Credenciais"]
        session["Criar Sessão<br/>(JWT + Cookies)"]
    end

    subgraph middleware ["🛡️ Middleware"]
        mw["middleware.ts"]
        check_session["Verificar Sessão"]
        check_approval["Verificar Aprovação"]
    end

    subgraph protected ["🔒 Área Protegida"]
        dashboard["Dashboard<br/>/(dashboard)/*"]
    end

    subgraph admin_area ["👑 Área Admin"]
        users_page["Gestão de Sistema<br/>/admin/gestao-sistema"]
        approve["Aprovar/Rejeitar"]
    end

    login --> auth_check
    register --> auth_check
    auth_check -->|"✅ Válido"| session
    auth_check -->|"❌ Inválido"| login

    session --> mw
    mw --> check_session
    check_session -->|"❌ Sem sessão"| login
    check_session -->|"✅ Com sessão"| check_approval
    check_approval -->|"❌ Pendente/Rejeitado"| pending["Página Pendente"]
    check_approval -->|"✅ Aprovado"| dashboard

    dashboard -.->|"Admin only"| admin_area
    approve --> users_page

    classDef publicStyle fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px
    classDef authStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef middlewareStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef protectedStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef adminStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

    class login,register publicStyle
    class auth_check,session authStyle
    class mw,check_session,check_approval middlewareStyle
    class dashboard protectedStyle
    class users_page,approve adminStyle
```

---

## Fluxo de Registo e Aprovação

```mermaid
flowchart TB
    subgraph user_flow ["👤 Fluxo do Utilizador"]
        u1["1. Acede a /registar"]
        u2["2. Preenche formulário<br/>(nome, email, password)"]
        u3["3. Submete registo"]
        u4["4. Conta criada<br/>status: PENDING"]
        u5["5. Vê mensagem:<br/>'Aguarda aprovação'"]
        u6["6. Tenta fazer login"]
        u7["7. Acesso bloqueado<br/>até aprovação"]
    end

    subgraph admin_flow ["👑 Fluxo do Admin"]
        a1["1. Recebe notificação<br/>(ou vê na lista)"]
        a2["2. Acede a<br/>/admin/utilizadores"]
        a3["3. Revê pedido"]
        a4{"4. Decisão"}
        a5["✅ Aprovar"]
        a6["❌ Rejeitar"]
    end

    subgraph result ["📋 Resultado"]
        r1["Utilizador APROVADO<br/>Pode aceder ao CRM"]
        r2["Utilizador REJEITADO<br/>Acesso bloqueado"]
    end

    u1 --> u2 --> u3 --> u4 --> u5
    u5 --> u6 --> u7

    u4 -.->|"notifica"| a1
    a1 --> a2 --> a3 --> a4
    a4 --> a5 --> r1
    a4 --> a6 --> r2

    r1 -.->|"próximo login"| dashboard["✅ Acesso ao Dashboard"]

    classDef userStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef adminStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef approvedStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef rejectedStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class u1,u2,u3,u4,u5,u6,u7 userStyle
    class a1,a2,a3,a4,a5,a6 adminStyle
    class r1,dashboard approvedStyle
    class r2 rejectedStyle
```

---

## Estados do Utilizador

```mermaid
stateDiagram-v2
    [*] --> pending: Registo submetido

    pending --> approved: Admin aprova
    pending --> rejected: Admin rejeita

    approved --> approved: Acesso normal
    rejected --> [*]: Fim (sem recuperação)

    note right of pending
        Utilizador não consegue
        aceder ao dashboard
    end note

    note right of approved
        Acesso total conforme
        o seu role
    end note

    note right of rejected
        Conta bloqueada
        permanentemente
    end note
```

---

## Sistema de Permissões Dinâmico

O sistema usa permissões dinâmicas geridas em base de dados através de três tabelas: `roles`, `pages` e `role_permissions`.

```mermaid
flowchart TB
    subgraph tables ["🗄️ Tabelas de Permissões"]
        roles["roles<br/>admin, manager, user, rm"]
        pages["pages<br/>candidaturas, onboarding..."]
        perms["role_permissions<br/>can_access: true/false"]
    end

    subgraph flow ["🔄 Fluxo de Verificação"]
        user_req["Utilizador acede<br/>a /prioridades"]
        get_role["Obter role do<br/>utilizador"]
        check_perm["Consultar<br/>role_permissions"]
        decision{"can_access?"}
        allow["✅ Permite<br/>acesso"]
        deny["❌ Redireciona<br/>/sem-permissao"]
    end

    roles --> perms
    pages --> perms

    user_req --> get_role
    get_role --> check_perm
    check_perm --> decision
    decision -->|"true"| allow
    decision -->|"false"| deny

    classDef tableStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef flowStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef allowStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef denyStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class roles,pages,perms tableStyle
    class user_req,get_role,check_perm,decision flowStyle
    class allow allowStyle
    class deny denyStyle
```

---

## Roles e Permissões por Página

```mermaid
flowchart TB
    subgraph roles ["👥 Roles do Sistema"]
        admin["👑 Admin"]
        manager["📊 Manager"]
        rm["👔 Relationship Manager"]
        user["👤 User"]
    end

    subgraph pages_onb ["📋 Onboarding"]
        p_cand["Candidaturas"]
        p_onb["Onboarding"]
        p_kpis["KPIs"]
        p_agenda["Agenda"]
    end

    subgraph pages_rede ["🌐 Rede"]
        p_prest["Prestadores"]
        p_rede["Mapa Rede"]
        p_ped["Pedidos"]
    end

    subgraph pages_admin ["🔒 Admin"]
        p_prio["Prioridades"]
        p_users["Gestão de Sistema"]
    end

    admin --> p_cand & p_onb & p_kpis & p_agenda
    admin --> p_prest & p_rede & p_ped
    admin --> p_prio & p_users

    manager --> p_cand & p_onb & p_kpis & p_agenda
    manager --> p_prest & p_rede & p_ped
    manager --> p_prio

    rm --> p_cand & p_onb & p_kpis & p_agenda
    rm --> p_prest & p_rede & p_ped

    user --> p_cand & p_onb & p_kpis & p_agenda
    user --> p_prest & p_rede & p_ped

    classDef adminStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef managerStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef rmStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef userStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef pageStyle fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    classDef adminPageStyle fill:#ffebee,stroke:#c62828,stroke-width:1px

    class admin adminStyle
    class manager managerStyle
    class rm rmStyle
    class user userStyle
    class p_cand,p_onb,p_kpis,p_agenda,p_prest,p_rede,p_ped pageStyle
    class p_prio,p_users adminPageStyle
```

---

## Gestão de Permissões (UI Admin)

```mermaid
flowchart LR
    subgraph admin_page ["🔧 /admin/gestao-sistema"]
        tab1["Tab: Utilizadores<br/>Aprovar/Rejeitar"]
        tab2["Tab: Roles<br/>CRUD de roles"]
        tab3["Tab: Acessos<br/>Matriz permissões"]
    end

    subgraph actions ["⚙️ Server Actions"]
        a1["approveUser()"]
        a2["createRole()<br/>updateRole()<br/>deleteRole()"]
        a3["updatePermission()<br/>bulkUpdatePermissions()"]
    end

    subgraph db ["🗄️ Base de Dados"]
        t1["users"]
        t2["roles"]
        t3["role_permissions"]
    end

    tab1 --> a1 --> t1
    tab2 --> a2 --> t2
    tab3 --> a3 --> t3

    classDef tabStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef actionStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef dbStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class tab1,tab2,tab3 tabStyle
    class a1,a2,a3 actionStyle
    class t1,t2,t3 dbStyle
```

---

## Sequence: Login Completo

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Utilizador
    participant B as 🌐 Browser
    participant M as 🛡️ Middleware
    participant S as 🔐 Supabase Auth
    participant DB as 🗄️ Database

    U->>B: Acede a /login
    B->>M: GET /login
    M->>M: Rota pública (permite)
    M-->>B: Página de login

    U->>B: Submete credenciais
    B->>S: signInWithPassword(email, pass)
    S->>S: Valida credenciais

    alt Credenciais inválidas
        S-->>B: { error: "Invalid credentials" }
        B-->>U: "Email ou password incorrectos"
    else Credenciais válidas
        S->>S: Gera JWT
        S-->>B: { session, user }
        B->>B: Guarda cookies

        B->>M: GET /dashboard
        M->>S: Verifica sessão (cookies)
        S-->>M: { user }

        M->>DB: SELECT approval_status FROM users
        DB-->>M: { status: "pending" | "approved" | "rejected" }

        alt Status = pending
            M-->>B: Redirect /aguarda-aprovacao
            B-->>U: "A sua conta aguarda aprovação"
        else Status = rejected
            M-->>B: Redirect /acesso-negado
            B-->>U: "O seu acesso foi rejeitado"
        else Status = approved
            M-->>B: Permite acesso (middleware OK)
            B->>API: GET /prioridades
            API->>API: requirePageAccess('prioridades')
            API->>DB: SELECT can_access FROM role_permissions
            DB-->>API: { can_access: true/false }

            alt can_access = false
                API-->>B: Redirect /sem-permissao
                B-->>U: "Não tem permissão para esta página"
            else can_access = true
                API-->>B: Renderiza página
                B-->>U: Página carregada ✅
            end
        end
    end
```

---

## Sequence: Aprovação pelo Admin

```mermaid
sequenceDiagram
    autonumber
    participant A as 👑 Admin
    participant B as 🌐 Browser
    participant API as ⚙️ Server Action
    participant DB as 🗄️ Database

    A->>B: Acede a /admin/utilizadores
    B->>API: getUsers({ status: "pending" })
    API->>DB: SELECT * FROM users WHERE approval_status = 'pending'
    DB-->>API: Lista de utilizadores pendentes
    API-->>B: users[]
    B-->>A: Tabela com utilizadores

    A->>B: Clica "Aprovar" no utilizador X
    B->>API: approveUser(userId)

    API->>API: Verificar se caller é admin
    API->>DB: UPDATE users SET approval_status = 'approved'
    API->>DB: INSERT history_log (user_approved)
    DB-->>API: Success

    API-->>B: { success: true }
    B-->>A: "Utilizador aprovado ✅"

    Note over A,DB: Próximo login do utilizador X terá acesso total
```

---

## Camadas de Segurança

```mermaid
flowchart TB
    subgraph layer1 ["1️⃣ Network Layer"]
        https["HTTPS Obrigatório"]
        tls["TLS 1.3"]
        ddos["Proteção DDoS<br/>(Cloudflare)"]
    end

    subgraph layer2 ["2️⃣ Application Layer"]
        middleware["Middleware<br/>(verifica sessão)"]
        csrf["CSRF Protection<br/>(Next.js built-in)"]
    end

    subgraph layer3 ["3️⃣ Auth Layer"]
        jwt["JWT Validation"]
        approval["Verificação Aprovação"]
        role["Verificação Role"]
        guard["Page Guard<br/>(role_permissions)"]
    end

    subgraph layer4 ["4️⃣ Database Layer"]
        rls["Row Level Security"]
        encrypt["Encriptação AES-256"]
    end

    layer1 --> layer2
    layer2 --> layer3
    layer3 --> layer4
    layer4 --> data[("🗄️ Dados")]

    classDef l1Style fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef l2Style fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef l3Style fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef l4Style fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class https,tls,ddos l1Style
    class middleware,csrf l2Style
    class jwt,approval,role,guard l3Style
    class rls,encrypt l4Style
```

---

## Tabela: Estados de Aprovação

| Estado | Pode fazer login? | Acede ao dashboard? | Quem pode mudar? |
|--------|-------------------|---------------------|------------------|
| `pending` | ✅ Sim | ❌ Não (redireccionado) | Admin |
| `approved` | ✅ Sim | ✅ Sim | Admin |
| `rejected` | ✅ Sim | ❌ Não (bloqueado) | - |

---

## Código Relacionado

| Ficheiro | Função |
|----------|--------|
| `lib/supabase/middleware.ts` | Verificação de sessão (JWT) |
| `lib/permissions/guard.ts` | Verificação de permissões por página |
| `lib/permissions/actions.ts` | CRUD de roles e permissões |
| `app/(auth)/login/page.tsx` | Página de login |
| `app/(auth)/registar/page.tsx` | Página de registo |
| `app/admin/gestao-sistema/page.tsx` | Gestão de utilizadores, roles e permissões |

---

## Documentos Relacionados

- [07-SEGURANCA.md](../../07-SEGURANCA.md) - **Segurança completa do sistema**
- [02-FLUXOS-NEGOCIO.md](../../02-FLUXOS-NEGOCIO.md#fluxo-de-utilizadores-e-autenticação) - Fluxo de utilizadores
- [components.md](../architecture/components.md) - Arquitectura de componentes

---

*Última actualização: Janeiro 2026*
