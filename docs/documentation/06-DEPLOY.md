# Deploy e Configuração de Ambientes

Este documento descreve a configuração de deploy, ambientes, variáveis de ambiente e processos de CI/CD do CRM Prestadores.

## Índice

- [Arquitectura de Ambientes](#arquitectura-de-ambientes)
- [Plataformas Utilizadas](#plataformas-utilizadas)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy na Vercel](#deploy-na-vercel)
- [GitHub Actions (Sincronização)](#github-actions-sincronização)
- [Base de Dados (Supabase)](#base-de-dados-supabase)
- [Cron Jobs](#cron-jobs)
- [Troubleshooting](#troubleshooting)
- [Checklist de Deploy](#checklist-de-deploy)

---

## Arquitectura de Ambientes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUÇÃO                                           │
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │     Vercel      │     │    Supabase     │     │  GitHub Actions │        │
│  │   (Frontend)    │────>│   (Database)    │<────│   (Sync Jobs)   │        │
│  │                 │     │                 │     │                 │        │
│  │  crm.fixo.pt    │     │  PostgreSQL     │     │  Puppeteer      │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│          │                       │                       │                  │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     Backoffice FIXO                              │        │
│  │                   (Sistema Legado)                               │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESENVOLVIMENTO                                      │
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐                                │
│  │   localhost     │     │    Supabase     │                                │
│  │    :3000        │────>│   (mesmo DB)    │                                │
│  │                 │     │                 │                                │
│  │  npm run dev    │     │   ou local      │                                │
│  └─────────────────┘     └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ambientes Disponíveis

| Ambiente | URL | Branch | Base de Dados |
|----------|-----|--------|---------------|
| **Produção** | `crm.fixo.pt` | `main` | Supabase (produção) |
| **Preview** | `*.vercel.app` | PRs | Supabase (produção)* |
| **Local** | `localhost:3000` | qualquer | Supabase (produção) ou local |

> *Nota: Os deployments de preview usam a mesma base de dados de produção. Ter cuidado com operações destrutivas.

---

## Plataformas Utilizadas

| Plataforma | Função | Dashboard |
|------------|--------|-----------|
| **Vercel** | Hosting do Next.js | [vercel.com/dashboard](https://vercel.com/dashboard) |
| **Supabase** | Base de dados PostgreSQL + Auth | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **GitHub** | Repositório + Actions (sync jobs) | [github.com](https://github.com) |
| **Mapbox** | Mapas de cobertura | [mapbox.com](https://www.mapbox.com/) |

---

## Variáveis de Ambiente

### Ficheiro `.env.local` (Desenvolvimento)

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://nyrnjltpyedfoommmbhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Mapbox (obrigatório para mapas)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# HubSpot Webhook (opcional)
HUBSPOT_WEBHOOK_SECRET=xxx

# GitHub Actions (apenas produção)
GITHUB_ACTIONS_TOKEN=ghp_xxx
GITHUB_REPO=hackkalot/crm-prestadores

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Environment Variables

Configurar em: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variável | Tipo | Ambientes |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain text | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain text | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Production, Preview |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Plain text | Production, Preview |
| `HUBSPOT_WEBHOOK_SECRET` | Secret | Production |
| `GITHUB_ACTIONS_TOKEN` | Secret | Production |
| `GITHUB_REPO` | Plain text | Production |
| `NEXT_PUBLIC_APP_URL` | Plain text | Production, Preview |

### GitHub Repository Secrets

Configurar em: **GitHub → Repository → Settings → Secrets and variables → Actions**

| Secret | Descrição |
|--------|-----------|
| `BACKOFFICE_USERNAME` | Email de login no backoffice FIXO |
| `BACKOFFICE_PASSWORD` | Password do backoffice FIXO |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |

### Onde Obter as Chaves

| Chave | Localização |
|-------|-------------|
| Supabase URL/Keys | Supabase Dashboard → Project Settings → API |
| Mapbox Token | Mapbox Account → Access tokens |
| GitHub PAT | GitHub Settings → Developer settings → Personal access tokens |
| HubSpot Secret | HubSpot → Settings → Integrations → Private Apps |

---

## Deploy na Vercel

### Setup Inicial

1. **Conectar repositório**
   - Vercel Dashboard → New Project
   - Import do GitHub repository
   - Framework preset: Next.js (auto-detectado)

2. **Configurar variáveis de ambiente**
   - Adicionar todas as variáveis listadas acima
   - Marcar secrets como "Sensitive"

3. **Configurar domínio** (opcional)
   - Settings → Domains → Add
   - Configurar DNS no registrar

### Deploy Automático

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   git push  │────>│   GitHub    │────>│   Vercel    │
│   main      │     │  (trigger)  │     │   (build)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Produção   │
                                        │  crm.fixo.pt│
                                        └─────────────┘
```

Cada push para `main` dispara automaticamente um novo deploy.

### Preview Deployments

Cada Pull Request cria automaticamente um deployment de preview:
- URL: `crm-prestadores-<hash>-<team>.vercel.app`
- Permite testar alterações antes de fazer merge

### Build Settings

Definidos automaticamente pelo Vercel (ou em `vercel.json`):

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### vercel.json

O ficheiro `vercel.json` configura cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/alerts/generate",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Este cron gera alertas de tarefas em atraso diariamente às 8:00 UTC.

---

## GitHub Actions (Sincronização)

Os workflows de sincronização com o backoffice correm no GitHub Actions porque a Vercel não suporta Puppeteer.

### Workflows Disponíveis

| Workflow | Ficheiro | Schedule | Descrição |
|----------|----------|----------|-----------|
| **Pedidos** | `sync-backoffice.yml` | Seg 06:00 UTC | Importa pedidos de serviço (últimos 90 dias) |
| **Facturação** | `sync-billing.yml` | Seg 06:30 UTC | Importa dados de facturação |
| **Prestadores** | `sync-providers.yml` | Seg 07:00 UTC | Sincroniza lista de prestadores |
| **Alocações** | `sync-allocation-history.yml` | Seg 07:30 UTC | Importa histórico de alocações |

### Estrutura de um Workflow

```yaml
name: Sync Backoffice Data

on:
  # Agendamento automático (segundas-feiras)
  schedule:
    - cron: '0 6 * * 1'

  # Trigger manual via GitHub UI
  workflow_dispatch:
    inputs:
      date_from:
        description: 'Start date (dd-mm-yyyy)'
        required: false

  # Trigger via API (do CRM)
  repository_dispatch:
    types: [sync-backoffice]

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      # Instalar Chrome para Puppeteer
      - run: |
          npx puppeteer browsers install chrome
          echo "PUPPETEER_EXECUTABLE_PATH=$(find ... -name 'chrome')" >> $GITHUB_ENV

      - run: npx tsx scripts/sync-backoffice-github.ts
        env:
          BACKOFFICE_USERNAME: ${{ secrets.BACKOFFICE_USERNAME }}
          BACKOFFICE_PASSWORD: ${{ secrets.BACKOFFICE_PASSWORD }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      # Guardar artifacts para debug
      - uses: actions/upload-artifact@v4
        with:
          name: sync-data
          path: data/*.xlsx
          retention-days: 7
```

### Triggers de Sincronização

1. **Automático (cron)** - Semanalmente às segundas-feiras
2. **Manual (workflow_dispatch)** - Via GitHub UI (Actions → Run workflow)
3. **API (repository_dispatch)** - Via CRM quando user clica "Sincronizar"

### Trigger via API (do CRM)

```typescript
// src/app/api/sync/github-actions/route.ts
await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  },
  body: JSON.stringify({
    event_type: 'sync-backoffice',
    client_payload: {
      date_from: '01-01-2026',
      date_to: '21-01-2026',
      sync_log_id: 'uuid'  // Para tracking
    }
  })
})
```

### Ver Logs e Artifacts

1. GitHub → Actions → Selecionar workflow run
2. Clicar no job para ver logs
3. Artifacts no fundo da página (Excel exportado, screenshots)

---

## Base de Dados (Supabase)

### Migrações

As migrações estão em `supabase/migrations/` e são aplicadas com:

```bash
# Aplicar migrações pendentes
npm run db:push

# Reset completo (CUIDADO - apaga dados!)
npm run db:reset
```

### Regenerar Tipos TypeScript

Após alterar o schema:

```bash
# Opção 1: Com Docker local
npm run db:generate

# Opção 2: Sem Docker (usa Supabase remoto)
npx supabase gen types typescript \
  --project-id nyrnjltpyedfoommmbhs \
  2>/dev/null > src/types/database.ts
```

### Backup

O Supabase faz backups automáticos diários (plano Pro). Para backup manual:

1. Supabase Dashboard → Database → Backups
2. Ou usar `pg_dump` via connection string

### Connection Pooling

Para produção, usar o connection pooler do Supabase:
- URL normal: `db.xxx.supabase.co:5432` (conexões diretas, limitadas)
- Pooler: `xxx.pooler.supabase.com:6543` (milhares de conexões)

O SDK do Supabase já usa o pooler por defeito.

---

## Cron Jobs

### Vercel Crons

Definidos em `vercel.json`:

| Path | Schedule | Descrição |
|------|----------|-----------|
| `/api/alerts/generate` | `0 8 * * *` | Gera alertas diários (8:00 UTC) |

**Limitações do plano gratuito:**
- Máximo 1 cron job
- Execução diária mínima

### GitHub Actions Crons

| Workflow | Schedule | Descrição |
|----------|----------|-----------|
| `sync-backoffice` | `0 6 * * 1` | Segundas 06:00 UTC |
| `sync-billing` | `30 6 * * 1` | Segundas 06:30 UTC |
| `sync-providers` | `0 7 * * 1` | Segundas 07:00 UTC |
| `sync-allocation-history` | `30 7 * * 1` | Segundas 07:30 UTC |

**Nota:** Todos os syncs correm às segundas-feiras para minimizar uso de minutos GitHub Actions.

---

## Troubleshooting

### Build Falha na Vercel

```
Error: Type error: ...
```

**Solução:**
1. Correr `npm run build` localmente para ver todos os erros
2. Verificar se `database.ts` está actualizado
3. Nunca usar `as any` sem `eslint-disable`

### Sync Falha no GitHub Actions

```
Error: TimeoutError: waiting for selector
```

**Possíveis causas:**
- Backoffice FIXO mudou estrutura HTML
- Credenciais expiradas/inválidas
- Rate limiting

**Verificar:**
1. Ver screenshot no artifact `sync-logs-*`
2. Testar login manualmente no backoffice
3. Verificar secrets no GitHub

### Variáveis de Ambiente não Funcionam

**Em desenvolvimento:**
- Verificar se `.env.local` existe (não commitado)
- Reiniciar `npm run dev` após alterar

**Em produção:**
- Verificar se variável está em "Production" environment
- Fazer redeploy após alterar variáveis

### Erro de Tipos após Alterar DB

```
Property 'xxx' does not exist on type ...
```

**Solução:**
```bash
npx supabase gen types typescript \
  --project-id nyrnjltpyedfoommmbhs \
  2>/dev/null > src/types/database.ts
```

### Webhook HubSpot não Chega

1. Verificar URL do webhook no HubSpot
2. Verificar se rota está em `publicRoutes` no middleware
3. Ver logs em Vercel → Deployments → Functions

---

## Checklist de Deploy

### Antes de Fazer Merge para Main

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] Testar funcionalidade localmente
- [ ] Verificar se há migrações pendentes

### Após Deploy

- [ ] Verificar deployment na Vercel (build success)
- [ ] Testar funcionalidade em produção
- [ ] Verificar logs por erros

### Ao Adicionar Nova Funcionalidade

- [ ] Adicionar variáveis de ambiente necessárias na Vercel
- [ ] Documentar novas variáveis neste documento
- [ ] Se usar nova tabela: aplicar migração + regenerar tipos

### Ao Alterar Schema da Base de Dados

1. [ ] Criar migração em `supabase/migrations/`
2. [ ] `npm run db:push` para aplicar
3. [ ] Regenerar tipos: `npx supabase gen types typescript ...`
4. [ ] Verificar build local
5. [ ] Commit e push

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor local
npm run build            # Build de produção (testar antes de deploy)
npm run lint             # Verificar ESLint

# Base de Dados
npm run db:push          # Aplicar migrações
npm run db:generate      # Regenerar tipos (requer Docker)

# Regenerar tipos sem Docker
npx supabase gen types typescript \
  --project-id nyrnjltpyedfoommmbhs \
  2>/dev/null > src/types/database.ts

# Ver logs Vercel (requer Vercel CLI)
vercel logs --follow

# Trigger manual de sync (requer gh CLI)
gh workflow run sync-backoffice.yml
```

---

## Próximos Documentos

- [01-ARQUITETURA.md](./01-ARQUITETURA.md) - Decisões técnicas
- [02-FLUXOS-NEGOCIO.md](./02-FLUXOS-NEGOCIO.md) - Estados e transições
- [03-BASE-DADOS.md](./03-BASE-DADOS.md) - Schema da base de dados
- [04-INTEGRACOES.md](./04-INTEGRACOES.md) - Integrações externas
- [05-COMPONENTES.md](./05-COMPONENTES.md) - Componentes UI

---

*Última actualização: Janeiro 2026*
