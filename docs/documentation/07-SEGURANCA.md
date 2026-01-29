# Segurança e Protecção de Dados

Este documento descreve a arquitectura de segurança do CRM Prestadores, as medidas de protecção implementadas, conformidade RGPD e boas práticas seguidas no desenvolvimento.

---

## Glossário de Termos Técnicos

Antes de ler este documento, familiarize-se com os termos técnicos utilizados:

| Termo | O que é | Analogia simples |
|-------|---------|------------------|
| **API** | Interface que permite que sistemas comuniquem entre si | É como um "balcão de atendimento" onde um sistema pede informação a outro |
| **SDK** | Kit de ferramentas para programadores interagirem com um serviço | É como um "kit de montagem" com peças prontas a usar |
| **JWT** | Token digital que prova que um utilizador está autenticado | É como um "bilhete de identidade digital" temporário |
| **RLS** | Row Level Security - regras que controlam quem vê que dados | É como um "segurança" que verifica permissões antes de mostrar informação |
| **SQL** | Linguagem usada para consultar bases de dados | É como "perguntas" que fazemos à base de dados |
| **SQL Injection** | Ataque onde tentam inserir código malicioso via inputs | É como tentar "enganar" o sistema com perguntas maliciosas |
| **TLS** | Protocolo de encriptação para comunicação segura | É como um "envelope selado" que protege dados em trânsito |
| **AES-256** | Algoritmo de encriptação muito forte | É como um "cofre digital" praticamente impossível de abrir |
| **HTTPS** | Versão segura do protocolo web (usa TLS) | É o "cadeado" que vês no browser |
| **Cookies** | Pequenos ficheiros que guardam informação da sessão | São como "lembranças" que o site guarda sobre ti |
| **Hash** | Transformação irreversível de dados (ex: passwords) | É como uma "impressão digital" única de um dado |
| **Middleware** | Código que corre entre o pedido e a resposta | É como um "porteiro" que verifica cada pedido |
| **Server Actions** | Funções que correm no servidor, não no browser | Código que corre no "cofre" (servidor), não no "balcão" (browser) |
| **Secrets/Keys** | Chaves e passwords de acesso a serviços | São como "chaves de casa" - não se partilham |
| **RGPD/GDPR** | Regulamento europeu de protecção de dados pessoais | Lei que protege os dados dos cidadãos da UE |
| **Backup** | Cópia de segurança dos dados | É como ter uma "cópia de reserva" de documentos importantes |
| **CDN** | Rede que distribui conteúdo globalmente | É como ter "armazéns" espalhados pelo mundo para entregar mais rápido |
| **DDoS** | Ataque que tenta sobrecarregar um serviço | É como uma "multidão" a tentar entrar numa loja ao mesmo tempo |
| **2FA** | Two-Factor Authentication - autenticação com dois factores | É como precisar de chave E código para abrir um cofre |
| **TOTP** | Time-based One-Time Password - código que muda a cada 30s | É como um código que muda automaticamente a cada momento |
| **OTP** | One-Time Password - código de uso único | É como um bilhete que só pode ser usado uma vez |
| **Backup Codes** | Códigos de recuperação para emergências | São como "chaves suplentes" para quando perdes o telemóvel |

---

## Índice

- [Resumo Executivo](#resumo-executivo)
- [Arquitectura de Segurança](#arquitectura-de-segurança)
- [Protecção Contra Acesso Não Autorizado](#protecção-contra-acesso-não-autorizado)
- [Protecção Contra SQL Injection](#protecção-contra-sql-injection)
- [Porquê Supabase?](#porquê-supabase-justificação-de-segurança)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Gestão de Secrets e Credenciais](#gestão-de-secrets-e-credenciais)
- [Conformidade RGPD](#conformidade-rgpd)
- [Controlo de Acessos](#controlo-de-acessos)
- [Autenticação e Autorização](#autenticação-e-autorização)
  - [Segurança de Cookies e JWT](#segurança-de-cookies-e-jwt)
- [Autenticação de Dois Factores (2FA)](#autenticação-de-dois-factores-2fa)
- [Sistema de Tokens para Formulários Externos](#sistema-de-tokens-para-formulários-externos)
- [Validação de Dados](#validação-de-dados)
- [Backups e Continuidade](#backups-e-continuidade-de-negócio)
- [Nota Sobre Desenvolvimento com IA](#nota-sobre-desenvolvimento-com-ia)

---

## Resumo Executivo

```
┌─────────────────────────────────────────────────────────────────┐
│               SEGURANÇA - VISÃO GERAL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ IMPLEMENTADO                                                │
│  ├─ Dados armazenados na União Europeia (Frankfurt)             │
│  ├─ Encriptação em trânsito (TLS 1.3) e repouso (AES-256)       │
│  ├─ Autenticação obrigatória para acesso                        │
│  ├─ Autenticação de Dois Factores (2FA) - Email OTP e TOTP      │
│  ├─ Row Level Security por role (admin/manager/viewer)          │
│  ├─ Protecção contra SQL Injection (queries parametrizadas)     │
│  ├─ Secrets encriptadas no Vercel (acesso restrito)             │
│  ├─ Código versionado no GitHub (apenas 1 admin)                │
│  ├─ Histórico de alterações auditável                           │
│  ├─ Tokens seguros para formulários externos (256-bit)          │
│  ├─ Rate limiting contra ataques de força bruta                 │
│  └─ Conformidade RGPD (dados EU, direitos dos titulares)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura de Segurança

O sistema implementa segurança em múltiplas camadas (defense in depth), onde cada camada adiciona uma barreira adicional contra acessos não autorizados:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. NETWORK LAYER                                                │
│    - HTTPS obrigatório (Vercel enforced)                        │
│    - TLS 1.3 para todas as conexões                             │
│    - CDN com proteção DDoS (Cloudflare via Vercel)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. APPLICATION LAYER - MIDDLEWARE                               │
│    - Verifica sessão válida (JWT)                               │
│    - Redireciona para /login se não autenticado                 │
│    - Permite rotas públicas (/login, /verificar-2fa, /api/...)  │
│    - CSRF protection (Next.js built-in)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2.5. APPLICATION LAYER - 2FA                                    │
│    - Verifica se utilizador tem 2FA activo                      │
│    - Redireciona para /verificar-2fa se necessário              │
│    - Rate limiting: 5 tentativas, lockout 30 min                │
│    - Suporta Email OTP e TOTP (Authenticator Apps)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. APPLICATION LAYER - SERVER ACTIONS                           │
│    - Verificam supabase.auth.getUser()                          │
│    - Validação de inputs com Zod                                │
│    - Retornam erro se não autenticado                           │
│    - Usam adminClient apenas quando necessário                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DATABASE LAYER - ROW LEVEL SECURITY                          │
│    - Políticas PostgreSQL por tabela                            │
│    - Controlo de leitura/escrita por role                       │
│    - Última linha de defesa (defense in depth)                  │
│    - Encriptação AES-256 at-rest                                │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio:** Mesmo que uma camada seja comprometida, as camadas seguintes continuam a proteger os dados.

---

## Protecção Contra Acesso Não Autorizado

Esta secção responde directamente à questão: **"É possível alguém aceder à base de dados através da URL ou hackear o sistema?"**

### Resposta: Não.

A base de dados PostgreSQL **não está exposta na internet**. Não existe porta ou endpoint público que permita conexão directa ao PostgreSQL. Toda a comunicação passa pela API do Supabase, que implementa múltiplas camadas de segurança.

### Cenário de Ataque Hipotético

Mesmo que um atacante tente várias abordagens, todas são bloqueadas:

```
┌─────────────────────────────────────────────────────────────────┐
│                 TENTATIVA DE ACESSO NÃO AUTORIZADO              │
└─────────────────────────────────────────────────────────────────┘

  ATACANTE                          SISTEMA
  ────────                          ───────

  1. Tenta aceder via URL
     https://xxx.supabase.co        → Apenas API REST disponível
                                      (não há acesso directo ao PostgreSQL)

  2. Descobre anon key no browser
     (é pública por design)         → API aceita pedido...

  3. Tenta fazer SELECT             → ❌ BLOQUEADO pelo RLS
     sem autenticação                  "new row violates policy"

  4. Tenta SQL injection            → ❌ IMPOSSÍVEL
     ' OR 1=1 --                       SDK usa queries parametrizadas

  5. Tenta ligar ao PostgreSQL      → ❌ IMPOSSÍVEL
     via porta 5432                    Porta não está exposta publicamente

  6. Tenta usar DevTools            → ❌ SEM EFEITO
     para roubar credenciais           Só encontra anon key (inútil sem sessão)
```

### O Que é Público vs Privado

| Elemento | Visível no Browser? | Risco de Segurança |
|----------|--------------------|--------------------|
| `SUPABASE_URL` | ✅ Sim (NEXT_PUBLIC_) | **Nenhum** - é apenas o endpoint da API |
| `SUPABASE_ANON_KEY` | ✅ Sim (NEXT_PUBLIC_) | **Nenhum** - RLS bloqueia acessos não autenticados |
| `SERVICE_ROLE_KEY` | ❌ Não (server only) | Esta key bypassa RLS - **nunca exposta** |
| Connection String | ❌ Não (server only) | Acesso directo ao PostgreSQL - **nunca exposta** |

### Porque é que a Anon Key é Pública?

É um **padrão de design do Supabase** (e de outras plataformas como Firebase). A `anon key` permite que o browser faça chamadas à API, mas:

1. O **RLS (Row Level Security)** verifica se o pedido tem um JWT válido
2. Sem sessão autenticada, o pedido é **rejeitado a nível de base de dados**
3. A key sozinha **não dá acesso a nenhum dado**

É comparável a saber o endereço de um banco: saber onde fica não significa que consegues entrar no cofre.

### Cenário: Atacante com Acesso ao Browser

Mesmo que alguém:
1. Abra as DevTools do browser
2. Encontre a `SUPABASE_URL` e `ANON_KEY`
3. Tente fazer pedidos à API com ferramentas como Postman ou curl

**Resultado:** Os pedidos são rejeitados porque:
- Não tem sessão válida (JWT)
- RLS bloqueia queries sem autenticação
- Não consegue obter `SERVICE_ROLE_KEY` (está apenas no servidor)

---

## Protecção Contra SQL Injection

### O que é SQL Injection?

SQL Injection é um ataque onde o atacante tenta inserir código SQL malicioso através de inputs do utilizador. Por exemplo:

```sql
-- Input malicioso: ' OR 1=1 --
-- Se concatenado, resultaria em:
SELECT * FROM users WHERE email = '' OR 1=1 --'
-- Isto retornaria TODOS os utilizadores!
```

### Porque é Impossível no CRM Prestadores?

O código **nunca concatena strings SQL**. O SDK do Supabase usa **queries parametrizadas** (prepared statements):

```typescript
// ❌ VULNERÁVEL - Nunca fazemos isto
const query = `SELECT * FROM providers WHERE name = '${userInput}'`

// ✅ SEGURO - Como o código realmente funciona
const { data } = await supabase
  .from('providers')
  .select('*')
  .eq('name', userInput)
```

### Como Funciona Internamente

O SDK transforma a query num **prepared statement**:

```sql
-- O que o SDK gera internamente:
SELECT * FROM providers WHERE name = $1
-- $1 é um PARÂMETRO, não parte da query
```

Mesmo que `userInput` seja `'; DROP TABLE providers; --`, o PostgreSQL trata isso como uma **string literal** a comparar, não como SQL a executar.

### Validação Adicional com Zod

Além das queries parametrizadas, validamos todos os inputs antes de chegarem à base de dados:

```typescript
const ProviderSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  nif: z.string().regex(/^\d{9}$/),  // Apenas 9 dígitos
})

// Input malicioso é rejeitado antes de chegar à query
const result = ProviderSchema.safeParse(userInput)
if (!result.success) {
  return { error: 'Dados inválidos' }
}
```

---

## Porquê Supabase? Justificação de Segurança

A escolha do Supabase como plataforma foi baseada em critérios de segurança, além dos benefícios de produtividade:

| Critério | Supabase | Firebase | MongoDB Atlas |
|----------|----------|----------|---------------|
| **Base de dados** | PostgreSQL (ACID) | Proprietary | Document DB |
| **Row Level Security** | ✅ Nativo PostgreSQL | ⚠️ Rules limitadas | ❌ App-level only |
| **Encriptação at-rest** | ✅ AES-256 (AWS) | ✅ AES-256 | ✅ AES-256 |
| **Encriptação in-transit** | ✅ TLS 1.3 | ✅ TLS | ✅ TLS |
| **Localização de dados** | 🇪🇺 EU (Frankfurt) | 🌍 Escolha limitada | 🌍 Varia |
| **Compliance** | SOC2 Type II, GDPR | SOC2, GDPR | SOC2, GDPR |
| **Vendor lock-in** | **Baixo** (PostgreSQL) | Alto | Médio |
| **Auditoria** | ✅ Logs de acesso | ✅ Logs | ✅ Logs |
| **Open Source** | ✅ Sim | ❌ Não | ❌ Não |

**Decisão:** O Supabase oferece:
- Segurança enterprise (SOC2 Type II, GDPR ready)
- Row Level Security nativo (não apenas app-level)
- PostgreSQL standard (podemos migrar se necessário)
- Dados na União Europeia

---

## Row Level Security (RLS)

O RLS é implementado a nível de PostgreSQL, não na aplicação. Isto significa que **mesmo com acesso directo à API, os dados estão protegidos**.

### Políticas Implementadas

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tabela: providers                                              │
│  ├─ SELECT: authenticated users podem ler                       │
│  ├─ INSERT: authenticated users podem criar                     │
│  ├─ UPDATE: authenticated users podem editar                    │
│  └─ DELETE: apenas admins (via service role)                    │
│                                                                 │
│  Tabela: users                                                  │
│  ├─ SELECT: users podem ver outros users (para atribuição)      │
│  └─ UPDATE: users só podem editar o próprio perfil              │
│                                                                 │
│  Tabela: sync_logs                                              │
│  └─ SELECT/INSERT: authenticated users                          │
│                                                                 │
│  Tabela: history_log                                            │
│  └─ INSERT: authenticated users (auditoria)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Clientes Supabase e Quando Usar

| Cliente | Key Usada | RLS | Quando Usar |
|---------|-----------|-----|-------------|
| `createClient()` (server) | Anon Key + Cookies | ✅ Activo | Operações normais |
| `createClient()` (browser) | Anon Key | ✅ Activo | Real-time, cliente |
| `createAdminClient()` | Service Role | ❌ Bypass | Operações admin, sync |

```typescript
// ✅ CORRECTO - usar server client para operações normais
const supabase = await createClient()
const { data } = await supabase.from('providers').select('*')
// Respeita RLS - user só vê o que as políticas permitem

// ⚠️ CUIDADO - admin client bypassa RLS
const admin = createAdminClient()
const { data } = await admin.from('providers').select('*')
// Vê TODOS os registos - usar apenas quando necessário
```

---

## Gestão de Secrets e Credenciais

### O que são Secrets? (Explicação Simples)

**Secrets** são passwords e chaves de acesso que o sistema precisa para funcionar, mas que **nunca devem aparecer no código**. São como as chaves de casa, precisas delas para entrar, mas não as deixas debaixo do tapete.

#### Porquê usar Secrets?

| ❌ Mau | ✅ Bom |
|--------|--------|
| Password escrita no código | Password guardada como Secret |
| Qualquer pessoa com acesso ao código vê a password | Só administradores acedem aos Secrets |
| Se o código for partilhado, a password é exposta | Secrets ficam separados e protegidos |

#### Como funcionam?

1. **Guardas o secret** numa área protegida (GitHub Settings ou Vercel Settings)
2. **O código pede o secret** usando uma variável de ambiente (ex: `process.env.PASSWORD`)
3. **O sistema injeta o valor** apenas quando o código corre, sem nunca o mostrar

#### Onde estão guardados os nossos Secrets?

| Local | Quem acede | Para quê |
|-------|------------|----------|
| **GitHub Repository Secrets** | Apenas admins do repositório | Scripts de sincronização (correm no GitHub) |
| **Vercel Environment Variables** | Apenas admins do projecto Vercel | Aplicação CRM (corre na Vercel) |

#### Boas práticas de segurança

- ✅ **Nunca** escrever passwords directamente no código
- ✅ **Nunca** fazer commit de ficheiros `.env` com secrets reais
- ✅ **Rodar** (mudar) passwords periodicamente
- ✅ Usar **tokens com permissões mínimas** (princípio do menor privilégio)
- ✅ **Revogar** tokens de pessoas que saem da equipa


---

### Níveis de Sensibilidade

```
┌─────────────────────────────────────────────────────────────────┐
│                    NÍVEIS DE SENSIBILIDADE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔴 CRÍTICO (nunca expor no cliente)                            │
│  ├─ SUPABASE_SERVICE_ROLE_KEY                                   │
│  ├─ BACKOFFICE_USERNAME / PASSWORD                              │
│  └─ GITHUB_ACTIONS_TOKEN                                        │
│                                                                 │
│  🟡 SENSÍVEL (apenas server-side)                               │
│  ├─ HUBSPOT_WEBHOOK_SECRET                                      │
│  └─ Database connection strings                                 │
│                                                                 │
│  🟢 PÚBLICO (pode estar no cliente)                             │
│  ├─ NEXT_PUBLIC_SUPABASE_URL                                    │
│  ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY                               │
│  └─ NEXT_PUBLIC_MAPBOX_TOKEN                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Armazenamento Seguro

| Secret | Localização | Acesso | Encriptação |
|--------|-------------|--------|-------------|
| Variáveis de produção | Vercel Dashboard | 1 admin | ✅ Encriptadas |
| Variáveis de dev | `.env.local` | Local only | N/A (gitignored) |
| GitHub Secrets | Repository Secrets | 1 admin | ✅ Encriptadas |

### Regras de Segurança

1. **Prefixo `NEXT_PUBLIC_`** - Variáveis com este prefixo são expostas ao browser (por design)
2. **Nunca commitar `.env.local`** - Está no `.gitignore`
3. **Service Role Key** - Só existe em server actions e GitHub Actions
4. **Rotação de keys** - Supabase permite regenerar keys se comprometidas

---

## Conformidade RGPD

O sistema processa dados pessoais de cidadãos da União Europeia, pelo que está sujeito ao Regulamento Geral de Proteção de Dados (RGPD).

### Medidas Implementadas

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFORMIDADE RGPD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Dados armazenados na UE (Supabase Frankfurt)                │
│  ✅ Encriptação em trânsito (TLS 1.3)                           │
│  ✅ Encriptação em repouso (AES-256)                            │
│  ✅ Acesso restrito (apenas 1 administrador)                    │
│  ✅ Histórico de alterações (tabela history_log)                │
│  ✅ Logs de acesso a dados sensíveis                            │
│  ✅ Tokens de formulário com expiração (30 min após submissão)  │
│  ✅ Rate limiting em endpoints públicos (10 req/15min)          │
│  ✅ Registo de IP em submissões externas                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Controlo de Acessos

### Matriz de Acessos às Plataformas

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE ACESSOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PLATAFORMA              QUEM TEM ACESSO                        │
│  ─────────────────────────────────────────────                  │
│  Vercel (Deploy)         1 administrador                        │
│  Supabase (Database)     1 administrador                        │
│  GitHub (Código)         1 administrador                        │
│  CRM (Aplicação)         Utilizadores autenticados              │
│                                                                 │
│  PRINCÍPIO: Mínimo privilégio                                   │
│  - Acesso às consolas restrito                                  │
│  - Service keys apenas em ambiente servidor                     │
│  - Sem partilha de credenciais                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sistema de Permissões Dinâmico

O CRM implementa um sistema de **permissões dinâmico** baseado em três tabelas na base de dados:

```
┌─────────────────────────────────────────────────────────────────┐
│                ARQUITECTURA DE PERMISSÕES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────┐         ┌─────────────────┐         ┌─────────┐  │
│    │  roles  │────────▶│ role_permissions│◀────────│  pages  │  │
│    └─────────┘         └─────────────────┘         └─────────┘  │
│                               │                                 │
│                               ▼                                 │
│                    ┌─────────────────┐                          │
│                    │   can_access    │                          │
│                    │  (true/false)   │                          │
│                    └─────────────────┘                          │
│                                                                 │
│  Fluxo de verificação:                                          │
│  1. Utilizador tenta aceder a /candidaturas                     │
│  2. Guard verifica role do utilizador                           │
│  3. Consulta role_permissions para page_key='candidaturas'      │
│  4. Se can_access=true → permite; senão → redireciona           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tabelas do Sistema de Permissões

| Tabela | Descrição |
|--------|-----------|
| `roles` | Roles disponíveis (admin, user, manager, relationship_manager) |
| `pages` | Páginas/rotas do sistema com key única e secção |
| `role_permissions` | Matriz role × página com flag `can_access` |

#### Roles e Permissões por Defeito

| Role | Descrição | Páginas Bloqueadas |
|------|-----------|-------------------|
| **admin** | Acesso total ao sistema | Nenhuma |
| **manager** | Gestor com acesso a prioridades | `admin_utilizadores` |
| **relationship_manager** | RM para gestão de prestadores | `admin_utilizadores`, `prioridades` |
| **user** | Utilizador base | `admin_utilizadores`, `prioridades` |

#### Gestão de Permissões (UI Admin)

Os administradores podem gerir permissões através da página `/admin/utilizadores`:

- **Tab Roles**: Criar, editar e apagar roles (excepto roles de sistema)
- **Tab Acessos**: Matriz visual para toggle de permissões por página/role

```
┌─────────────────────────────────────────────────────────────────┐
│  MATRIZ DE PERMISSÕES (UI Admin)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Página           │ admin │ manager │ rm    │ user  │           │
│  ─────────────────┼───────┼─────────┼───────┼───────┤           │
│  Candidaturas     │  ✅   │   ✅    │  ✅   │  ✅   │           │
│  Onboarding       │  ✅   │   ✅    │  ✅   │  ✅   │           │
│  Prioridades      │  ✅   │   ✅    │  ❌   │  ❌   │           │
│  Admin Utilizadores│ ✅   │   ❌    │  ❌   │  ❌   │           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementação Técnica

**Guard em Server Components:**

```typescript
// src/lib/permissions/guard.ts
export async function requirePageAccess(pageKey: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const canAccess = await canCurrentUserAccessPage(pageKey)
  if (!canAccess) {
    redirect('/sem-permissao')
  }
}
```

**Uso em páginas:**

```typescript
// src/app/(dashboard)/prioridades/page.tsx
export default async function PrioridadesPage() {
  await requirePageAccess('prioridades')
  // ... resto da página
}
```

#### RLS nas Tabelas de Permissões

As tabelas de permissões estão protegidas por RLS:

- **Leitura**: Utilizadores aprovados podem ver roles, pages e permissions
- **Escrita**: Apenas administradores podem modificar

Ver detalhes em [03-BASE-DADOS.md](./03-BASE-DADOS.md#rls-para-tabelas-de-permissões).

---

### Níveis de Acesso na Aplicação (Resumo)

| Role | Permissões | Implementação |
|------|------------|---------------|
| **Admin** | Acesso total, gestão de utilizadores e permissões | `role_permissions` + Service Role Key |
| **Manager** | Gestão completa excepto admin | `role_permissions` + RLS |
| **RM** | Gestão de prestadores e onboarding | `role_permissions` + RLS |
| **User** | Acesso básico | `role_permissions` + RLS |

---

## Autenticação e Autorização

### Fluxo de Autenticação

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  Login   │────>│ Supabase  │────>│   2FA    │────>│ Middleware│────>│ Dashboard│
│  Form    │     │   Auth    │     │  Check   │     │  (check)  │     │  Layout  │
└──────────┘     └───────────┘     └──────────┘     └───────────┘     └──────────┘
                       │                 │
                       ▼                 ▼
                 ┌───────────┐     ┌───────────┐
                 │  Cookies  │     │ Verificar │
                 │ (session) │     │    2FA    │
                 │   (JWT)   │     │  (se act) │
                 └───────────┘     └───────────┘
```

**Com 2FA activo**, o fluxo inclui um passo adicional:
1. Utilizador submete credenciais (email + password)
2. Supabase valida e cria sessão temporária
3. Sistema detecta 2FA activo → termina sessão
4. Redirect para `/verificar-2fa`
5. Utilizador introduz código (email/app/backup)
6. Código válido → sessão restabelecida
7. Redirect para dashboard

### Segurança de Cookies e JWT

O sistema usa **JWT (JSON Web Tokens)** para autenticação, armazenados em **cookies**. Esta secção explica as configurações de segurança implementadas.

#### Configuração de Cookies (Supabase SSR)

| Flag | Protege contra | Activo? | Nota |
|------|----------------|---------|------|
| **Secure** | Intercepção em redes | ✅ Sim | Cookies só via HTTPS |
| **SameSite=Lax** | CSRF | ✅ Sim | Bloqueia requests cross-site |
| **HttpOnly** | XSS | ❌ Não | Supabase precisa de acesso no cliente para refresh tokens |

#### XSS: É um risco real?

**Não.** O ataque XSS (injectar código malicioso via inputs) é **teoricamente possível** se não houvesse protecções, mas:

| Protecção | Como nos protege |
|-----------|------------------|
| **React escaping** | Sanitiza automaticamente todos os inputs - `<script>` aparece como texto |
| **Sem dangerouslySetInnerHTML** | Não usamos renderização de HTML não sanitizado |
| **Zod validation** | Inputs validados antes de guardar na BD |
| **Token expira** | JWTs expiram em ~1 hora |
| **Auditoria** | Todas as acções ficam no `history_log` |

> **Resumindo:** Para haver XSS, seria preciso cometermos um erro específico no código, que não cometemos. Memso que acontecesse, o hacker apenas poderia lêr os dados na front-end, nunca teria acesso à base de dados. É como dizer que um cofre pode ser arrombado se deixarem a porta aberta: tecnicamente verdade, mas não deixamos a porta aberta.

#### Comparação com outros riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| **XSS no CRM** | Muito baixa | React escaping, Zod |
| **Phishing** | Média | Formação utilizadores |
| **Password fraca** | Média | Políticas de passwords |


---

### Verificação em Server Actions

**Todas** as server actions verificam autenticação:

```typescript
'use server'

export async function updateProvider(id: string, data: Partial<Provider>) {
  const supabase = await createClient()

  // 1. Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  // 2. Verificar autorização (se aplicável)
  // Ex: verificar se user tem permissão para editar este provider

  // 3. Validar dados de entrada (Zod)
  const validated = ProviderSchema.safeParse(data)
  if (!validated.success) {
    return { error: 'Dados inválidos' }
  }

  // 4. Executar operação
  const { error } = await createAdminClient()
    .from('providers')
    .update(validated.data)
    .eq('id', id)

  // 5. Registar no histórico (auditoria)
  await logHistory(user.id, 'providers', id, 'update', data)

  return { success: true }
}
```

---

## Autenticação de Dois Factores (2FA)

O CRM implementa um sistema completo de **Autenticação de Dois Factores (2FA)** para proteger contas de utilizadores internos. Esta camada adicional de segurança requer que os utilizadores confirmem a sua identidade com um segundo factor além da password.

### Métodos Suportados

```
┌─────────────────────────────────────────────────────────────────┐
│              MÉTODOS DE AUTENTICAÇÃO 2FA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📧 EMAIL OTP                                                   │
│  ├─ Código de 6 dígitos enviado por email                       │
│  ├─ Expira em 10 minutos                                        │
│  └─ Ideal para quem não usa apps de autenticação                │
│                                                                 │
│  📱 TOTP (Authenticator App)                                    │
│  ├─ Microsoft Authenticator, Google Authenticator, Authy, etc.  │
│  ├─ Código de 6 dígitos gerado localmente                       │
│  ├─ Muda a cada 30 segundos                                     │
│  └─ Mais seguro que email (não depende de rede)                 │
│                                                                 │
│  🔑 CÓDIGOS DE RECUPERAÇÃO (Backup)                             │
│  ├─ 10 códigos únicos de 8 caracteres                           │
│  ├─ Cada código só pode ser usado uma vez                       │
│  └─ Para recuperação em caso de perda do dispositivo            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação com 2FA

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUXO DE LOGIN COM 2FA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Utilizador faz login com email + password                   │
│     ├─ Credenciais validadas pelo Supabase Auth                 │
│     └─ Sistema verifica se 2FA está activo                      │
│                                                                 │
│  2. Se 2FA activo:                                              │
│     ├─ Sessão Supabase é terminada (ainda não autenticado)      │
│     ├─ Redireccionamento para /verificar-2fa                    │
│     └─ Se método=email: código enviado automaticamente          │
│                                                                 │
│  3. Utilizador introduz código de verificação                   │
│     ├─ 6 dígitos do email/app OU código de recuperação          │
│     ├─ Rate limiting: máx 5 tentativas                          │
│     └─ Bloqueio de 30 min após 5 falhas                         │
│                                                                 │
│  4. Código válido:                                              │
│     ├─ Token de sessão temporário gerado (5 min validade)       │
│     ├─ Sessão Supabase restabelecida                            │
│     └─ Redirect para página solicitada                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Arquitectura Técnica

#### Tabelas de Base de Dados

| Tabela | Descrição |
|--------|-----------|
| `users` (colunas 2FA) | Configuração 2FA do utilizador |
| `two_factor_codes` | Códigos OTP temporários (email) |
| `two_factor_sessions` | Tokens de sessão pós-verificação |

#### Colunas 2FA na tabela `users`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `two_factor_enabled` | BOOLEAN | 2FA activo/inactivo |
| `two_factor_method` | TEXT | 'email' ou 'totp' |
| `totp_secret_encrypted` | TEXT | Segredo TOTP encriptado (AES-256-CBC) |
| `totp_confirmed_at` | TIMESTAMPTZ | Quando TOTP foi confirmado |
| `backup_codes_hash` | TEXT[] | Array de hashes SHA-256 dos códigos de recuperação |
| `two_factor_attempts` | INTEGER | Contador de tentativas falhadas |
| `two_factor_locked_until` | TIMESTAMPTZ | Timestamp de desbloqueio |
| `last_two_factor_at` | TIMESTAMPTZ | Última verificação 2FA bem sucedida |

### Segurança Criptográfica

#### Encriptação de Segredos TOTP

Os segredos TOTP são encriptados com **AES-256-CBC** antes de serem guardados:

```typescript
import crypto from 'crypto'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)  // Initialization Vector único
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`  // IV:Ciphertext
}
```

**Porque AES-256-CBC?**
- Standard de encriptação usado por governos e instituições financeiras
- 256 bits = 2^256 combinações possíveis
- IV único por encriptação previne ataques de padrão

#### Hashing de Códigos

Códigos OTP e de recuperação são **hasheados com SHA-256** antes de serem guardados:

```typescript
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}
```

**Porquê hash em vez de encriptar?**
- Não precisamos de recuperar o código original
- Verificamos comparando hashes
- Mesmo que a BD seja comprometida, os códigos são irrecuperáveis

### Geração de Tokens TOTP

Os tokens TOTP seguem o standard **RFC 6238** (TOTP) usado por Google Authenticator e Microsoft Authenticator:

```typescript
import { generateSecret, generateURI, verifySync } from 'otplib'

// Gerar segredo (20 bytes = 160 bits, Base32 encoded)
const secret = generateSecret()

// Gerar URI para QR Code
const otpauthUrl = generateURI({
  issuer: 'FIXO CRM',
  label: user.email,
  secret,
})

// Verificar código (window de 30 segundos)
const result = verifySync({ token: code, secret })
const isValid = result.valid
```

### Códigos de Recuperação (Backup Codes)

```
┌─────────────────────────────────────────────────────────────────┐
│              CÓDIGOS DE RECUPERAÇÃO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Formato: 8 caracteres hexadecimais (ex: A1B2C3D4)              │
│  Quantidade: 10 códigos únicos                                  │
│  Uso: Cada código só pode ser usado UMA vez                     │
│  Armazenamento: Hash SHA-256 (irreversível)                     │
│                                                                 │
│  Casos de uso:                                                  │
│  ├─ Perda do telemóvel                                          │
│  ├─ App de autenticação apagada/corrompida                      │
│  └─ Acesso de emergência sem segundo factor                     │
│                                                                 │
│  ⚠️ Mostrados APENAS uma vez durante a configuração             │
│  ⚠️ Utilizador deve guardar em local seguro                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Limiting e Lockout

Para prevenir ataques de força bruta:

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `MAX_ATTEMPTS` | 5 | Tentativas máximas antes de lockout |
| `LOCKOUT_MINUTES` | 30 | Duração do bloqueio |
| `CODE_EXPIRY_MINUTES` | 10 | Validade de códigos email |
| `SESSION_EXPIRY_MINUTES` | 5 | Validade do token pós-2FA |

```typescript
if (newAttempts >= MAX_ATTEMPTS) {
  // Bloquear conta
  updateData.two_factor_locked_until = new Date(
    Date.now() + LOCKOUT_MINUTES * 60 * 1000
  ).toISOString()
  updateData.two_factor_attempts = 0  // Reset para próximo ciclo
}
```

### Configuração pelo Utilizador

Os utilizadores podem gerir 2FA nas suas definições:

```
┌─────────────────────────────────────────────────────────────────┐
│              OPÇÕES DE CONFIGURAÇÃO 2FA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Activar 2FA                                                 │
│     ├─ Escolher método (Email ou Authenticator App)             │
│     ├─ Verificar com código                                     │
│     └─ Receber códigos de recuperação (guardar!)                │
│                                                                 │
│  🔄 Regenerar Códigos de Recuperação                            │
│     ├─ Requer verificação com código actual                     │
│     └─ Gera novos 10 códigos (invalida anteriores)              │
│                                                                 │
│  ❌ Desactivar 2FA                                              │
│     ├─ Requer verificação com código ou backup code             │
│     └─ Remove toda a configuração 2FA                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Boas Práticas Implementadas

| Prática | Implementação |
|---------|---------------|
| **Segredos encriptados** | AES-256-CBC com IV único |
| **Códigos hasheados** | SHA-256 (irreversível) |
| **TOTP standard** | RFC 6238 (compatível com apps standard) |
| **Rate limiting** | 5 tentativas, 30 min lockout |
| **Códigos de recuperação** | 10 códigos únicos, uso único |
| **Sessões temporárias** | Token pós-2FA expira em 5 min |
| **Auditoria** | `last_two_factor_at` registado |

### Ficheiros Relevantes

| Ficheiro | Descrição |
|----------|-----------|
| `src/lib/auth/two-factor.ts` | Lógica completa de 2FA |
| `src/lib/auth/actions.ts` | Fluxo de login com 2FA |
| `src/app/(auth)/verificar-2fa/page.tsx` | Página de verificação |
| `src/components/auth/two-factor-settings.tsx` | UI de configuração |

### Migrations de Base de Dados

```sql
-- Migration: 20260129160000_add_two_factor_auth.sql

-- Colunas na tabela users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_method TEXT
    CHECK (two_factor_method IN ('email', 'totp', null)),
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backup_codes_hash TEXT[],
  ADD COLUMN IF NOT EXISTS two_factor_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS two_factor_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_two_factor_at TIMESTAMPTZ;

-- Tabela para códigos temporários (email OTP)
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,  -- SHA-256 do código
  code_type TEXT NOT NULL CHECK (code_type IN ('setup', 'login')),
  method TEXT NOT NULL CHECK (method IN ('email', 'totp')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para sessões pós-2FA
CREATE TABLE IF NOT EXISTS two_factor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Sistema de Tokens para Formulários Externos

O CRM permite enviar formulários públicos a prestadores (ex: formulário de serviços). Estes formulários são acedidos via um **token único** sem necessidade de login. Esta secção documenta as medidas de segurança implementadas.

### Arquitectura de Segurança dos Tokens

```
┌─────────────────────────────────────────────────────────────────┐
│            FLUXO DE ACESSO A FORMULÁRIO EXTERNO                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. RM gera token no CRM                                        │
│     ├─ Token criptograficamente seguro (32 bytes random)        │
│     ├─ Guardado na tabela providers (forms_token)               │
│     └─ Timestamp de criação registado (auditoria)               │
│                                                                 │
│  2. Prestador acede via link                                    │
│     https://crm.../forms/services/{token}                       │
│                                                                 │
│  3. Sistema valida acesso                                       │
│     ├─ Rate limiting por IP (max 10 tentativas/15min)           │
│     ├─ Verifica se token existe                                 │
│     ├─ Verifica se token não expirou                            │
│     └─ Bloqueia se forma já foi submetido                       │
│                                                                 │
│  4. Após submissão                                              │
│     ├─ Token expira após janela de feedback (30 min)            │
│     └─ Dados guardados com IP e timestamp                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Geração Segura de Tokens

Os tokens são gerados usando `crypto.randomBytes()` do Node.js:

```typescript
import crypto from 'crypto'

// Gera 32 bytes random = 64 caracteres hex
// Entropia: 256 bits (computacionalmente impossível de adivinhar)
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
```

**Porque 32 bytes?**
- 256 bits de entropia
- Mais combinações possíveis que átomos no universo (2^256)
- Mesmo com 1 trilião de tentativas por segundo, levaria mais tempo que a idade do universo

### Rate Limiting

Para prevenir ataques de força bruta, o sistema implementa rate limiting:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Configuração:                                                  │
│  ├─ Máximo 10 tentativas por 15 minutos (por IP)                │
│  ├─ Após limite: bloqueio de 60 minutos                         │
│  └─ Registos limpos após 24 horas                               │
│                                                                 │
│  Tabela: forms_rate_limits                                      │
│  ├─ identifier (IP ou token)                                    │
│  ├─ attempts (contador)                                         │
│  ├─ first_attempt_at / last_attempt_at                          │
│  └─ blocked_until (timestamp de desbloqueio)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Exemplo de ataque bloqueado:**

```
Tentativa 1-10:  ✅ Aceites (mas token inválido = erro)
Tentativa 11:    ❌ BLOQUEADO - "Demasiadas tentativas"
                    Bloqueio activo durante 60 minutos
```

### Expiração de Tokens

Os tokens têm um ciclo de vida controlado:

| Estado | Descrição | Expiração |
|--------|-----------|-----------|
| **Novo** | Token gerado, formulário não submetido | Sem expiração (até ser usado) |
| **Submetido** | Formulário preenchido e enviado | Expira em 30 minutos |
| **Expirado** | Janela de feedback fechada | Token inválido permanentemente |

**Janela de Feedback:**

Após submeter o formulário, o prestador tem 30 minutos para enviar feedback opcional (NPS, comentários). Após esse período, o token é invalidado.

### Campos de Segurança na Tabela `providers`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `forms_token` | TEXT | Token actual (64 caracteres hex) |
| `forms_token_created_at` | TIMESTAMPTZ | Quando o token foi gerado |
| `forms_token_expires_at` | TIMESTAMPTZ | Quando o token expira (null = não submetido) |

### Protecção RLS

A tabela `forms_rate_limits` está protegida por RLS - apenas o `service_role` pode ler/escrever:

```sql
-- Política RLS para rate limits
CREATE POLICY "Service role can manage rate limits"
  ON forms_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

Isto significa que:
- O browser **não consegue** consultar ou manipular rate limits
- Apenas o servidor (via adminClient) pode gerir esta tabela
- Um atacante não consegue "limpar" o seu rate limit

### Auditoria e Logging

Todas as submissões são registadas:

```typescript
// Na submissão do formulário
const formsData = {
  provider_id: providerId,
  submission_number: nextSubmissionNumber,  // Histórico numerado
  // ... dados do formulário ...
  submitted_at: new Date().toISOString(),
  submitted_ip: ipAddress || null,  // IP do prestador
}

// Entrada no histórico geral
await adminClient.from('history_log').insert({
  provider_id: providerId,
  event_type: 'forms_submission',
  description: `Formulário de serviços submetido...`,
  new_value: { /* snapshot dos dados */ },
})
```

### Boas Práticas Seguidas

| Prática | Implementação |
|---------|---------------|
| **Tokens criptograficamente seguros** | `crypto.randomBytes(32)` |
| **Rate limiting** | 10 req/15min, bloqueio 60min |
| **Expiração de tokens** | 30 min após submissão |
| **Registo de IP** | Guardado em `submitted_ip` |
| **Histórico imutável** | `provider_forms_data` com `submission_number` |
| **RLS nas tabelas de segurança** | `forms_rate_limits` só acessível por service_role |
| **Invalidação após uso** | Token não pode ser reutilizado após feedback |

---

## Validação de Dados

Todos os inputs são validados com **Zod** antes de chegarem à base de dados:

```typescript
import { z } from 'zod'

const CandidaturaSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  nif: z.string().regex(/^\d{9}$/),
  phone: z.string().optional(),
})

export async function createCandidatura(formData: FormData) {
  const parsed = CandidaturaSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    nif: formData.get('nif'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  // Continuar apenas com dados validados
  const { data, error } = await supabase
    .from('providers')
    .insert(parsed.data)
}
```

**Benefícios:**
- Inputs maliciosos rejeitados antes de chegarem à BD
- Tipos TypeScript garantidos em runtime
- Mensagens de erro claras para o utilizador

---

## Nota Sobre Desenvolvimento com IA

**Nota pessoal de Diogo Pita:**
Ao longo deste projeto recorri a ferramentas de IA (Claude Code) como apoio ao desenvolvimento. Esse uso, combinado com a minha experiência como Solution Architect na construção de sistemas digitais complexos muito antes da existência destas ferramentas, **não compromete a segurança nem a robustez do sistema.**

A IA foi utilizada como um acelerador de produtividade (geração assistida de código, sugestões e automatização de tarefas repetitivas), mas a responsabilidade técnica manteve-se totalmente humana: **arquitectura, desenho de fluxos e regras, validação, revisão, garantia de qualidade, etc...** No final, os requisitos e expectativas de uma equipa não técnica continuam a ter de ser traduzidos para um sistema coerente, completo e seguro, usado no dia-a-dia de equipas, independentemente das ferramentas utilizadas.

### 1. Os Padrões São os Mesmos

O código gerado segue exactamente os mesmos padrões de segurança que qualquer developer senior usaria:
- Server Actions com verificação de autenticação
- Row Level Security no Supabase
- Validação de inputs com Zod
- Queries parametrizadas (sem concatenação SQL)

### 2. O Código é Auditável

- Todo o código está versionado no GitHub
- Pode ser revisto linha a linha
- Histórico completo de alterações
- Não há "código escondido" ou ofuscado

### 3. A Arquitectura Isola Código Sensível

- Next.js Server Actions garantem que lógica crítica corre no servidor
- Service keys nunca são expostas ao cliente
- A separação server/client é enforced pelo framework

### 4. Não Há "Atalhos" de Segurança

- A IA não introduz backdoors ou vulnerabilidades
- Todas as boas práticas de segurança são seguidas
- O código passa pelos mesmos testes e validações

### Comparação

| Aspecto | Dev Tradicional | Dev com IA |
|---------|-----------------|------------|
| Padrões de segurança | ✅ Standard | ✅ Standard |
| Code review possível | ✅ Sim | ✅ Sim |
| Vulnerabilidades conhecidas | ⚠️ Possível | ⚠️ Possível |
| Auditoria | ✅ Git history | ✅ Git history |

**Conclusão:** A qualidade e segurança do código dependem dos padrões seguidos, não da ferramenta usada para o escrever.

---

## Documentos Relacionados

- [01-ARQUITETURA.md](./01-ARQUITETURA.md) - Arquitectura geral do sistema
- [03-BASE-DADOS.md](./03-BASE-DADOS.md) - Schema da base de dados
- [06-DEPLOY.md](./06-DEPLOY.md) - Configuração de ambientes e deploy

---

*Última actualização: 29 Janeiro 2026*
