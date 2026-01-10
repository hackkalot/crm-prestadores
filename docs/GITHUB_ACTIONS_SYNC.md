# GitHub Actions - Sync Backoffice

Este documento explica como configurar o GitHub Actions para sincronizar automaticamente os dados do backoffice FIXO.

## Overview

O workflow `sync-backoffice.yml` executa automaticamente:
1. **Diariamente** às 7:00 AM (hora de Portugal)
2. **Manualmente** através da UI do GitHub

O processo:
1. Lança um browser Chrome headless
2. Faz login no backoffice FIXO
3. Define filtros de data
4. Exporta Excel com pedidos de serviço
5. Faz parse do Excel
6. Upsert na tabela `service_requests` do Supabase

## Configuração de Secrets

Acede ao teu repositório no GitHub e vai a:
**Settings → Secrets and variables → Actions → New repository secret**

Adiciona os seguintes secrets:

| Nome | Descrição | Exemplo |
|------|-----------|---------|
| `BACKOFFICE_USERNAME` | Email de login no backoffice FIXO | `user@fidelidade.pt` |
| `BACKOFFICE_PASSWORD` | Password do backoffice | `********` |
| `SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase | `eyJhbGciOi...` |

### Onde encontrar os valores:

1. **BACKOFFICE_USERNAME/PASSWORD**: Credenciais de acesso ao backoffice FIXO
2. **SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
3. **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → Project API keys → `service_role` (secret)

## Execução Manual

### Via GitHub UI

1. Vai a **Actions** no repositório
2. Seleciona **Sync Backoffice Data** na sidebar
3. Clica **Run workflow**
4. Opcionalmente, define:
   - `date_from`: Data inicial (dd-mm-yyyy)
   - `date_to`: Data final (dd-mm-yyyy)
   - `days_back`: Número de dias para trás (default: 7)

### Via GitHub CLI

```bash
# Sync últimos 7 dias (default)
gh workflow run sync-backoffice.yml

# Sync período específico
gh workflow run sync-backoffice.yml \
  -f date_from="01-01-2026" \
  -f date_to="10-01-2026"

# Sync últimos 30 dias
gh workflow run sync-backoffice.yml -f days_back="30"
```

## Agendamento Automático

O workflow está configurado para executar diariamente às 6:00 UTC (7:00 hora de Portugal).

Para alterar o horário, edita o cron em `.github/workflows/sync-backoffice.yml`:

```yaml
schedule:
  - cron: '0 6 * * *'  # 6:00 UTC = 7:00 Lisboa
```

Exemplos de cron:
- `0 6 * * *` - Diariamente às 6:00 UTC
- `0 6 * * 1-5` - Segunda a Sexta às 6:00 UTC
- `0 6,18 * * *` - Duas vezes ao dia (6:00 e 18:00 UTC)

## Logs e Artefactos

Após cada execução:

1. **Logs de execução**: Visíveis na tab Actions do GitHub
2. **Ficheiro Excel**: Guardado como artefacto por 7 dias
3. **Screenshots de debug**: Guardados como artefacto por 3 dias
4. **Sync logs**: Registados na tabela `sync_logs` do Supabase

## Troubleshooting

### Erro: "Timeout no download"
O backoffice pode estar lento ou com muitos dados. Tenta:
- Reduzir o período de datas
- Verificar se o backoffice está acessível

### Erro: "Login failed"
- Verifica se as credenciais estão corretas nos secrets
- Confirma que a conta tem acesso ao backoffice

### Erro: "Database error"
- Verifica se as credenciais Supabase estão corretas
- Confirma que a tabela `service_requests` existe

### Ver logs detalhados
1. Vai a **Actions** no GitHub
2. Clica no workflow run que falhou
3. Expande os steps para ver os logs
4. Faz download dos artefactos para ver screenshots

## Estrutura de Ficheiros

```
.github/
└── workflows/
    └── sync-backoffice.yml     # Workflow definition

scripts/
├── export-backoffice-data.ts   # Puppeteer scrapper
└── sync-backoffice-github.ts   # Standalone sync script

docs/
└── GITHUB_ACTIONS_SYNC.md      # This file
```

## Custos

GitHub Actions oferece **2000 minutos/mês grátis** para repositórios privados.

Cada execução demora aproximadamente:
- 2-5 minutos para períodos pequenos (1-7 dias)
- 5-15 minutos para períodos grandes (30+ dias)

Com execução diária, usarás ~150-300 minutos/mês.
