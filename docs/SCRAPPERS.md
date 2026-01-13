# Scrappers - Resumo Executivo

## Visao Geral

O CRM utiliza 4 scrappers automatizados que extraem dados do backoffice FIXO (OutSystems) e sincronizam com a base de dados Supabase. Os scrappers correm via **GitHub Actions** em producao.

---

## Resumo dos Scrappers

| Scrapper | Horario (PT) | Dados | Tabela Supabase | Pagina CRM |
|----------|--------------|-------|-----------------|------------|
| **Pedidos de Servico** | 04:00 | Ultimos 90 dias | `service_requests` | /pedidos |
| **Faturacao** | 05:00 | Todos os processos | `billing_processes` | /faturacao |
| **Prestadores** | 06:00 | Todos os prestadores | `providers` | /prestadores |
| **Historico Alocacao** | 04:00 | Mes corrente | `allocation_history` | /alocacoes |

---

## 1. Pedidos de Servico

**Workflow:** `sync-backoffice.yml`
**Script:** `scripts/sync-backoffice-github.ts`
**Horario:** Diario as 04:00 (PT)
**Timeout:** 30 minutos

### O que faz:
- Acede ao backoffice FIXO > Service Requests
- Aplica filtros de data (ultimos 90 dias por defeito)
- Clica em "Exportar Dados" e faz download do Excel
- Processa o Excel e faz upsert na tabela `service_requests`
- Usa `request_code` como chave unica

### Parametros:
- `date_from` / `date_to` - Intervalo de datas (dd-mm-yyyy)
- `days_back` - Dias para tras (default: 90)

### Logs:
- Tabela: `sync_logs`
- Metricas: registos processados, inseridos, atualizados, duracao

---

## 2. Faturacao

**Workflow:** `sync-billing.yml`
**Script:** `scripts/sync-billing-github.ts`
**Horario:** Diario as 05:00 (PT)
**Timeout:** 30 minutos

### O que faz:
- Acede ao backoffice FIXO > Billing
- Clica em "Exportar Dados" (exporta todos os processos)
- Processa o Excel e faz upsert na tabela `billing_processes`
- Usa `request_code` como chave unica

### Dados extraidos:
- Codigo do pedido, prestador, servico
- Datas (documento, validacao, pagamento)
- Valores (custo servico, fatura, transacoes)
- Estado do processo

### Logs:
- Tabela: `billing_sync_logs`

---

## 3. Prestadores

**Workflow:** `sync-providers.yml`
**Script:** `scripts/sync-providers-github.ts`
**Horario:** Diario as 06:00 (PT)
**Timeout:** 15 minutos

### O que faz:
- Acede ao backoffice FIXO > Providers
- Garante que o filtro "Des-selecionado" esta ativo (mostra todos)
- Clica em "Exportar Dados" e faz download do Excel
- Processa o Excel e faz upsert na tabela `providers`
- Usa `backoffice_id` como chave unica

### Dados extraidos:
- Nome, NIF, email, telefone
- Estado (ativo, inativo)
- Tipo de prestador
- Data de registo

### Logs:
- Tabela: `provider_sync_logs`

---

## 4. Historico de Alocacao

**Workflow:** `sync-allocation-history.yml`
**Script:** `scripts/sync-allocation-history-github.ts`
**Horario:** Diario as 04:00 (PT)
**Timeout:** 15 minutos

### O que faz:
- Acede ao backoffice FIXO > Providers
- Clica em "Exportar historico de alocacao"
- Seleciona periodo (1º ao ultimo dia do mes corrente)
- Processa o Excel e faz upsert na tabela `allocation_history`
- Usa `(backoffice_provider_id, period_from, period_to)` como chave unica

### Logica mensal:
- **Dia 1 do mes:** INSERT de novos registos para o mes
- **Dias 2-31:** UPDATE dos registos existentes (dados acumulados)

### Dados extraidos:
- Prestador (ID e nome)
- Pedidos recebidos, aceites, rejeitados, expirados
- Tempo medio de resposta

### Logs:
- Tabela: `allocation_sync_logs`

---

## Formas de Execucao

Cada scrapper pode ser executado de 3 formas:

### 1. Automatico (Schedule)
Corre automaticamente no horario configurado via cron.

### 2. Manual (GitHub UI)
- Ir a GitHub > Actions > Selecionar workflow > Run workflow
- Permite configurar parametros (ex: datas)

### 3. Via CRM (repository_dispatch)
- Botao "Sincronizar" no CRM dispara o workflow
- O log e criado com o user que disparou
- Permite acompanhar progresso em tempo real

---

## Ordem de Execucao (Automatica)

```
03:00 UTC │ Pedidos de Servico (90 dias)
04:00 UTC │ Historico de Alocacao (mes corrente)
04:00 UTC │ Faturacao (todos)
05:00 UTC │ Prestadores (todos)
```

Os prestadores correm por ultimo para garantir que os dados relacionados ja estao atualizados.

---

## Configuracao de Secrets (GitHub)

| Secret | Descricao |
|--------|-----------|
| `BACKOFFICE_USERNAME` | Email de login no backoffice |
| `BACKOFFICE_PASSWORD` | Password do backoffice |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

---

## Artifacts

Cada execucao guarda artifacts para debug:
- **Excel exportado** (7 dias)
- **Logs e screenshots** (3 dias)

Para ver: GitHub > Actions > Workflow run > Artifacts (fundo da pagina)

---

## Monitorizacao

### Pagina de Logs
`/configuracoes/sync-logs` - Mostra historico de todas as sincronizacoes com:
- Status (sucesso, erro, em progresso)
- Duracao
- Registos processados/inseridos/atualizados
- User que disparou (se manual)
- Mensagens de erro

### Polling Automatico
A pagina faz polling a cada 5 segundos quando ha syncs em progresso.

---

## Tratamento de Erros

Quando um scrapper falha:
1. O status e atualizado para `failed` na tabela de logs
2. A mensagem e stack trace sao guardados
3. Screenshots sao guardados como artifacts
4. O workflow reporta falha no GitHub

### Erros Comuns:
- **Timeout de login** - Credenciais incorretas ou backoffice lento
- **Elemento nao encontrado** - Mudanca no UI do backoffice
- **Erro de rede** - Problemas de conectividade

---

## Manutencao

### Atualizar Credenciais
1. Ir a GitHub > Settings > Secrets and variables > Actions
2. Atualizar `BACKOFFICE_USERNAME` e/ou `BACKOFFICE_PASSWORD`

### Modificar Horarios
Editar o cron no ficheiro `.github/workflows/*.yml`:
```yaml
schedule:
  - cron: '0 3 * * *'  # Formato: minuto hora dia mes dia_semana
```

### Adicionar Novo Scrapper
1. Criar script em `scripts/`
2. Criar workflow em `.github/workflows/`
3. Criar tabela de logs em Supabase
4. Adicionar UI no CRM (dialog + pagina)
