# Integrações

Este documento descreve as integrações do CRM com sistemas externos.

## Índice

- [Visão Geral](#visão-geral)
- [Backoffice FIXO (Scrappers)](#backoffice-fixo-scrappers)
  - [Pedidos de Serviço](#1-pedidos-de-serviço)
  - [Faturação](#2-faturação)
  - [Prestadores](#3-prestadores)
  - [Histórico de Alocação](#4-histórico-de-alocação)
- [GitHub Actions](#github-actions)
  - [Configuração de Secrets](#configuração-de-secrets)
  - [Execução Manual](#execução-manual)
  - [Agendamento Automático](#agendamento-automático)
- [Mapbox (Mapas)](#mapbox-mapas)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

O CRM integra com os seguintes sistemas externos:

| Sistema | Propósito | Método |
|---------|-----------|--------|
| **Backoffice FIXO** | Sincronização de pedidos, prestadores, faturação | Scrappers Puppeteer via GitHub Actions |
| **Mapbox** | Visualização de cobertura geográfica | API de mapas |
| **Supabase** | Base de dados e autenticação | SDK oficial |

---

## Backoffice FIXO (Scrappers)

O CRM utiliza 4 scrappers automatizados que extraem dados do backoffice FIXO (OutSystems) e sincronizam com a base de dados Supabase. Os scrappers correm via **GitHub Actions** em produção.

### Resumo dos Scrappers

| Scrapper | Horário (PT) | Dados | Tabela Supabase | Página CRM |
|----------|--------------|-------|-----------------|------------|
| **Pedidos de Serviço** | 04:00 | Últimos 90 dias | `service_requests` | /pedidos |
| **Faturação** | 05:00 | Todos os processos | `billing_processes` | /faturacao |
| **Prestadores** | 06:00 | Todos os prestadores | `providers` | /prestadores |
| **Histórico Alocação** | 04:00 | Mês corrente | `allocation_history` | /alocacoes |

### Ordem de Execução (Automática)

```
03:00 UTC │ Pedidos de Serviço (90 dias)
04:00 UTC │ Histórico de Alocação (mês corrente)
04:00 UTC │ Faturação (todos)
05:00 UTC │ Prestadores (todos)
```

Os prestadores correm por último para garantir que os dados relacionados já estão actualizados.

---

### 1. Pedidos de Serviço

**Workflow:** `sync-backoffice.yml`
**Script:** `scripts/sync-backoffice-github.ts`
**Horário:** Diário às 04:00 (PT)
**Timeout:** 30 minutos

#### O que faz:
1. Acede ao backoffice FIXO > Service Requests
2. Aplica filtros de data (últimos 90 dias por defeito)
3. Clica em "Exportar Dados" e faz download do Excel
4. Processa o Excel e faz upsert na tabela `service_requests`
5. Usa `request_code` como chave única

#### Parâmetros:
- `date_from` / `date_to` - Intervalo de datas (dd-mm-yyyy)
- `days_back` - Dias para trás (default: 90)

#### Logs:
- Tabela: `sync_logs`
- Métricas: registos processados, inseridos, actualizados, duração

---

### 2. Faturação

**Workflow:** `sync-billing.yml`
**Script:** `scripts/sync-billing-github.ts`
**Horário:** Diário às 05:00 (PT)
**Timeout:** 30 minutos

#### O que faz:
1. Acede ao backoffice FIXO > Billing
2. Clica em "Exportar Dados" (exporta todos os processos)
3. Processa o Excel e faz upsert na tabela `billing_processes`
4. Usa `request_code` como chave única

#### Dados extraídos:
- Código do pedido, prestador, serviço
- Datas (documento, validação, pagamento)
- Valores (custo serviço, factura, transacções)
- Estado do processo

#### Logs:
- Tabela: `billing_sync_logs`

---

### 3. Prestadores

**Workflow:** `sync-providers.yml`
**Script:** `scripts/sync-providers-github.ts`
**Horário:** Diário às 06:00 (PT)
**Timeout:** 15 minutos

#### O que faz:
1. Acede ao backoffice FIXO > Providers
2. Garante que o filtro "Des-selecionado" está activo (mostra todos)
3. Clica em "Exportar Dados" e faz download do Excel
4. Processa o Excel e faz upsert na tabela `providers`
5. Usa `backoffice_id` como chave única

#### Dados extraídos:
- Nome, NIF, email, telefone
- Estado (activo, inactivo)
- Tipo de prestador
- Data de registo

#### Logs:
- Tabela: `provider_sync_logs`

---

### 4. Histórico de Alocação

**Workflow:** `sync-allocation-history.yml`
**Script:** `scripts/sync-allocation-history-github.ts`
**Horário:** Diário às 04:00 (PT)
**Timeout:** 15 minutos

#### O que faz:
1. Acede ao backoffice FIXO > Providers
2. Clica em "Exportar histórico de alocação"
3. Selecciona período (1º ao último dia do mês corrente)
4. Processa o Excel e faz upsert na tabela `allocation_history`
5. Usa `(backoffice_provider_id, period_from, period_to)` como chave única

#### Lógica mensal:
- **Dia 1 do mês:** INSERT de novos registos para o mês
- **Dias 2-31:** UPDATE dos registos existentes (dados acumulados)

#### Dados extraídos:
- Prestador (ID e nome)
- Pedidos recebidos, aceites, rejeitados, expirados
- Tempo médio de resposta

#### Logs:
- Tabela: `allocation_sync_logs`

---

## GitHub Actions

### Formas de Execução

Cada scrapper pode ser executado de 3 formas:

| Forma | Descrição |
|-------|-----------|
| **Automático (Schedule)** | Corre automaticamente no horário configurado via cron |
| **Manual (GitHub UI)** | Actions > Seleccionar workflow > Run workflow |
| **Via CRM (repository_dispatch)** | Botão "Sincronizar" no CRM dispara o workflow |

### Configuração de Secrets

#### GitHub Repository Secrets

Acede ao repositório no GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

| Nome | Descrição | Exemplo |
|------|-----------|---------|
| `BACKOFFICE_USERNAME` | Email de login no backoffice FIXO | `user@fidelidade.pt` |
| `BACKOFFICE_PASSWORD` | Password do backoffice | `********` |
| `SUPABASE_URL` | URL do projecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase | `eyJhbGciOi...` |

#### Vercel Environment Variables (para trigger via CRM)

Para o botão de sync funcionar em produção, adiciona no Vercel:
**Project Settings → Environment Variables**

| Nome | Descrição | Como obter |
|------|-----------|------------|
| `GITHUB_ACTIONS_TOKEN` | Personal Access Token do GitHub | Ver abaixo |
| `GITHUB_REPO` | Nome do repositório | `hackkalot/crm-prestadores` |

##### Como criar o GITHUB_ACTIONS_TOKEN:

1. Vai a GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Clica **Generate new token**
3. Dá um nome (ex: "CRM Sync Trigger")
4. Selecciona o repositório `crm-prestadores`
5. Em **Permissions**, define:
   - **Contents**: Read and write
   - **Metadata**: Read-only
6. Clica **Generate token** e copia o valor

### Execução Manual

#### Via GitHub UI

1. Vai a **Actions** no repositório
2. Selecciona o workflow na sidebar
3. Clica **Run workflow**
4. Opcionalmente, define parâmetros (ex: datas)

#### Via GitHub CLI

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

### Agendamento Automático

Para alterar o horário, edita o cron em `.github/workflows/*.yml`:

```yaml
schedule:
  - cron: '0 6 * * *'  # 6:00 UTC = 7:00 Lisboa
```

Exemplos de cron:
- `0 6 * * *` - Diariamente às 6:00 UTC
- `0 6 * * 1-5` - Segunda a Sexta às 6:00 UTC
- `0 6,18 * * *` - Duas vezes ao dia (6:00 e 18:00 UTC)

### Artifacts

Cada execução guarda artifacts para debug:
- **Excel exportado** (7 dias)
- **Logs e screenshots** (3 dias)

Para ver: GitHub > Actions > Workflow run > Artifacts (fundo da página)

### Custos

GitHub Actions oferece **2000 minutos/mês grátis** para repositórios privados.

Cada execução demora aproximadamente:
- 2-5 minutos para períodos pequenos (1-7 dias)
- 5-15 minutos para períodos grandes (30+ dias)

Com execução diária, usarás ~150-300 minutos/mês.

---

## Mapbox (Mapas)

O CRM utiliza Mapbox para visualização de cobertura geográfica na página `/rede`.

### Configuração

Adicionar no `.env.local`:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx
```

### Funcionalidades

- **Mapa choropleth** de Portugal com 308 concelhos
- **Cores por cobertura**: verde (2+ prestadores), amarelo (1), vermelho (0)
- **Filtro por serviço**: selecciona clusters/serviços específicos
- **Hover com detalhes**: mostra informação do concelho

### GeoJSON

O ficheiro de fronteiras está em:
`public/geo/portugal-municipalities-simplified.geojson` (3.2MB)

Fonte: OpenDataSoft/e-REDES (simplificado de 29MB para 3.2MB)

---

## Troubleshooting

### Erro: "Timeout no download"
O backoffice pode estar lento ou com muitos dados. Tenta:
- Reduzir o período de datas
- Verificar se o backoffice está acessível

### Erro: "Login failed"
- Verifica se as credenciais estão correctas nos secrets
- Confirma que a conta tem acesso ao backoffice

### Erro: "Database error"
- Verifica se as credenciais Supabase estão correctas
- Confirma que as tabelas existem

### Ver logs detalhados
1. Vai a **Actions** no GitHub
2. Clica no workflow run que falhou
3. Expande os steps para ver os logs
4. Faz download dos artifacts para ver screenshots

### Página de Logs no CRM

`/configuracoes/sync-logs` - Mostra histórico de todas as sincronizações com:
- Status (sucesso, erro, em progresso)
- Duração
- Registos processados/inseridos/actualizados
- User que disparou (se manual)
- Mensagens de erro

A página faz polling a cada 5 segundos quando há syncs em progresso.

---

## Estrutura de Ficheiros

```
.github/
└── workflows/
    ├── sync-backoffice.yml        # Pedidos de serviço
    ├── sync-billing.yml           # Faturação
    ├── sync-providers.yml         # Prestadores
    └── sync-allocation-history.yml # Histórico alocação

scripts/
├── export-backoffice-data.ts      # Puppeteer scrapper base
├── sync-backoffice-github.ts      # Standalone: pedidos
├── sync-billing-github.ts         # Standalone: faturação
├── sync-providers-github.ts       # Standalone: prestadores
└── sync-allocation-history-github.ts # Standalone: alocação
```

---

*Última actualização: Janeiro 2026*
