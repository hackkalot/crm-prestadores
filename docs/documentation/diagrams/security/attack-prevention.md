# Prevenção de Ataques

Este documento ilustra como os diferentes tipos de ataques são bloqueados pelo sistema de segurança do CRM Prestadores.

> **Documentação completa:** [07-SEGURANCA.md](../../07-SEGURANCA.md)

---

## Visão Geral das Camadas de Defesa

```mermaid
flowchart TB
    subgraph internet ["Internet"]
        attacker["Atacante"]
    end

    subgraph layer1 ["1. Network Layer"]
        https["HTTPS/TLS 1.3"]
        ddos["DDoS Protection<br/>(Cloudflare)"]
    end

    subgraph layer2 ["2. Application Layer"]
        middleware["Middleware<br/>(sessão)"]
        csrf["CSRF Protection"]
        headers["Security Headers"]
    end

    subgraph layer3 ["3. Auth Layer"]
        jwt["JWT Validation"]
        approval["User Approval"]
        guard["Page Guard<br/>(RLS)"]
    end

    subgraph layer4 ["4. Database Layer"]
        rls["Row Level Security"]
        params["Parameterized<br/>Queries"]
        encrypt["AES-256<br/>Encryption"]
    end

    subgraph data ["Dados Protegidos"]
        db[("PostgreSQL")]
    end

    attacker --> layer1
    layer1 --> layer2
    layer2 --> layer3
    layer3 --> layer4
    layer4 --> db

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef l1Style fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef l2Style fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef l3Style fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef l4Style fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef dataStyle fill:#e0f7fa,stroke:#00838f,stroke-width:2px

    class attacker attackStyle
    class https,ddos l1Style
    class middleware,csrf,headers l2Style
    class jwt,approval,guard l3Style
    class rls,params,encrypt l4Style
    class db dataStyle
```

---

## 1. SQL Injection

### O Ataque

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        input["Input malicioso:<br/>' OR 1=1 --"]
    end

    subgraph vulnerable ["Sistema Vulnerável (NÃO SOMOS)"]
        concat["Concatenação:<br/>SELECT * WHERE name = '' OR 1=1 --'"]
        leak["Exposição de todos os dados"]
    end

    input -.->|"se vulnerável"| concat
    concat -.-> leak

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef vulnStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class input attackStyle
    class concat,leak vulnStyle
```

### A Protecção

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        input["Input: ' OR 1=1 --"]
    end

    subgraph protection ["Sistema CRM (Protegido)"]
        sdk["Supabase SDK"]
        param["Query parametrizada:<br/>SELECT * WHERE name = $1"]
        safe["Input tratado como string literal"]
        result["0 resultados (nome não existe)"]
    end

    input --> sdk
    sdk --> param
    param --> safe
    safe --> result

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef protectStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class input attackStyle
    class sdk,param,safe,result protectStyle
```

```typescript
// O SDK NUNCA concatena strings
const userInput = "' OR 1=1 --"

// O que o Supabase gera internamente:
// SELECT * FROM providers WHERE name = $1
// $1 = "' OR 1=1 --" (como STRING, não como SQL)
const { data } = await supabase
  .from('providers')
  .eq('name', userInput)  // Parametrizado automaticamente
```

---

## 2. Cross-Site Scripting (XSS)

### O Ataque

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        script["Input:<br/>&lt;script&gt;alert('hack')&lt;/script&gt;"]
    end

    subgraph vulnerable ["Sistema Vulnerável (NÃO SOMOS)"]
        render["Renderiza HTML directamente"]
        exec["Script executa no browser da vítima"]
    end

    script -.->|"se vulnerável"| render
    render -.-> exec

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef vulnStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class script attackStyle
    class render,exec vulnStyle
```

### A Protecção

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        script["Input: &lt;script&gt;...&lt;/script&gt;"]
    end

    subgraph protection ["Sistema CRM (Protegido)"]
        react["React Escaping"]
        zod["Zod Validation"]
        escape["Output sanitizado:<br/>&amp;lt;script&amp;gt;..."]
        safe["Aparece como texto, não executa"]
    end

    script --> react
    script --> zod
    react --> escape
    zod --> escape
    escape --> safe

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef protectStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class script attackStyle
    class react,zod,escape,safe protectStyle
```

**Protecções activas:**

| Protecção | Como Funciona |
|-----------|---------------|
| **React Escaping** | Sanitiza automaticamente `{}` em JSX |
| **Sem dangerouslySetInnerHTML** | Não renderizamos HTML não sanitizado |
| **Zod Validation** | Inputs validados antes de guardar |
| **JWT Expiration** | Tokens expiram em ~1 hora |

---

## 3. Cross-Site Request Forgery (CSRF)

### O Ataque

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        malicious["Site malicioso envia<br/>request para CRM"]
    end

    subgraph vulnerable ["Sistema Vulnerável (NÃO SOMOS)"]
        accept["Aceita request"]
        action["Executa acção<br/>em nome da vítima"]
    end

    malicious -.->|"se vulnerável"| accept
    accept -.-> action

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef vulnStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class malicious attackStyle
    class accept,action vulnStyle
```

### A Protecção

```mermaid
flowchart LR
    subgraph attack ["Tentativa de Ataque"]
        malicious["Site malicioso"]
    end

    subgraph protection ["Sistema CRM (Protegido)"]
        samesite["Cookie SameSite=Lax"]
        origin["Verifica Origin header"]
        block["Request bloqueado"]
    end

    malicious --> samesite
    samesite --> origin
    origin --> block

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef protectStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class malicious attackStyle
    class samesite,origin,block protectStyle
```

**Protecções activas:**

- **SameSite=Lax cookies**: Cookies não são enviados em requests cross-site
- **Next.js CSRF built-in**: Server Actions verificam origem
- **JWT em cookies**: Não vulnerável a CSRF via headers

---

## 4. Acesso Não Autorizado via API

### O Ataque

```mermaid
flowchart TB
    subgraph attack ["Tentativas de Ataque"]
        direct["Tentativa 1:<br/>Acesso directo ao PostgreSQL"]
        api["Tentativa 2:<br/>API com anon key"]
        devtools["Tentativa 3:<br/>DevTools para roubar keys"]
    end

    subgraph blocks ["Bloqueios"]
        no_port["Porta 5432 não exposta"]
        rls["RLS bloqueia sem JWT"]
        server_only["Service key só no servidor"]
    end

    subgraph result ["Resultado"]
        fail["Acesso negado"]
    end

    direct --> no_port --> fail
    api --> rls --> fail
    devtools --> server_only --> fail

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef blockStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef failStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class direct,api,devtools attackStyle
    class no_port,rls,server_only blockStyle
    class fail failStyle
```

### Cenário Detalhado

```mermaid
sequenceDiagram
    participant A as Atacante
    participant B as Browser/Postman
    participant API as Supabase API
    participant RLS as RLS Engine

    Note over A: Encontra SUPABASE_URL e ANON_KEY no browser

    A->>B: Copia keys públicas
    B->>API: SELECT * FROM providers<br/>(com anon key, sem JWT)

    API->>RLS: Query sem auth.uid()

    Note over RLS: Policy: USING (auth.uid() IS NOT NULL)

    RLS-->>API: Bloqueado - sem sessão
    API-->>B: { data: [], error: null }
    B-->>A: 0 resultados

    Note over A: Tenta usar SERVICE_ROLE_KEY

    A->>B: Procura service key no browser
    B-->>A: Não encontrada (só existe no servidor)

    Note over A: Ataque falhou completamente
```

---

## 5. Brute Force em Login

### O Ataque e Protecção

```mermaid
flowchart TB
    subgraph attack ["Tentativa de Ataque"]
        brute["Milhares de tentativas<br/>de password"]
    end

    subgraph protection ["Protecções"]
        rate["Rate Limiting<br/>(Supabase Auth)"]
        lockout["Account Lockout<br/>após falhas"]
        strong["Password Policy<br/>(min 8 chars)"]
    end

    subgraph result ["Resultado"]
        blocked["Conta bloqueada<br/>temporariamente"]
    end

    attack --> rate
    rate --> lockout
    lockout --> strong
    strong --> blocked

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef protectStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef blockStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class brute attackStyle
    class rate,lockout,strong protectStyle
    class blocked blockStyle
```

**Protecções Supabase Auth:**

| Protecção | Configuração |
|-----------|--------------|
| Rate limiting | 5 tentativas por minuto |
| Lockout | 15 min após 5 falhas |
| Password policy | Min 8 caracteres |

---

## 6. DDoS (Distributed Denial of Service)

### A Protecção

```mermaid
flowchart LR
    subgraph attack ["Ataque DDoS"]
        bots["Milhões de requests"]
    end

    subgraph cloudflare ["Cloudflare (via Vercel)"]
        waf["Web Application Firewall"]
        rate["Rate Limiting"]
        geo["Geo-blocking (opcional)"]
    end

    subgraph vercel ["Vercel Edge"]
        edge["Edge Network Global"]
        cache["Caching Agressivo"]
    end

    subgraph app ["Aplicação"]
        healthy["CRM funcionando normalmente"]
    end

    attack --> cloudflare
    cloudflare --> vercel
    vercel --> healthy

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef cfStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef vercelStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef appStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class bots attackStyle
    class waf,rate,geo cfStyle
    class edge,cache vercelStyle
    class healthy appStyle
```

---

## 7. Man-in-the-Middle (MITM)

### A Protecção

```mermaid
flowchart LR
    subgraph user ["Utilizador"]
        browser["Browser"]
    end

    subgraph tls ["TLS 1.3"]
        encrypt["Dados encriptados<br/>em trânsito"]
        cert["Certificado SSL<br/>(Let's Encrypt)"]
    end

    subgraph hsts ["HSTS"]
        force["Force HTTPS<br/>(Vercel enforced)"]
    end

    subgraph server ["Servidor"]
        app["CRM"]
    end

    browser --> encrypt
    encrypt --> cert
    cert --> force
    force --> app

    classDef userStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef tlsStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef hstsStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef serverStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class browser userStyle
    class encrypt,cert tlsStyle
    class force hstsStyle
    class app serverStyle
```

**Protecções:**

- **TLS 1.3**: Encriptação state-of-the-art
- **HSTS**: Browser força HTTPS
- **Vercel**: Certificados auto-renovados

---

## Resumo: Matriz de Ataques vs Protecções

```mermaid
flowchart TB
    subgraph attacks ["Ataques Conhecidos"]
        sqli["SQL Injection"]
        xss["XSS"]
        csrf["CSRF"]
        unauth["Acesso não autorizado"]
        brute["Brute Force"]
        ddos["DDoS"]
        mitm["Man-in-the-Middle"]
    end

    subgraph protections ["Protecções Implementadas"]
        params["Queries parametrizadas"]
        react["React escaping + Zod"]
        samesite["SameSite cookies"]
        rls["RLS + JWT"]
        ratelimit["Rate limiting"]
        cloudflare["Cloudflare WAF"]
        tls["TLS 1.3 + HSTS"]
    end

    sqli --> params
    xss --> react
    csrf --> samesite
    unauth --> rls
    brute --> ratelimit
    ddos --> cloudflare
    mitm --> tls

    classDef attackStyle fill:#ffebee,stroke:#c62828,stroke-width:1px
    classDef protectStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class sqli,xss,csrf,unauth,brute,ddos,mitm attackStyle
    class params,react,samesite,rls,ratelimit,cloudflare,tls protectStyle
```

| Ataque | Protecção | Camada |
|--------|-----------|--------|
| **SQL Injection** | Queries parametrizadas (Supabase SDK) | Database |
| **XSS** | React escaping + Zod validation | Application |
| **CSRF** | SameSite=Lax cookies + Next.js built-in | Application |
| **Acesso não autorizado** | RLS + JWT + Middleware | Auth + Database |
| **Brute Force** | Rate limiting + Account lockout | Auth |
| **DDoS** | Cloudflare WAF via Vercel | Network |
| **MITM** | TLS 1.3 + HSTS | Network |

---

## Documentos Relacionados

- [07-SEGURANCA.md](../../07-SEGURANCA.md) - Documentação completa de segurança
- [rls-policies.md](./rls-policies.md) - Detalhes das políticas RLS
- [auth-flow.md](./auth-flow.md) - Fluxo de autenticação

---

*Última actualização: Janeiro 2026*
