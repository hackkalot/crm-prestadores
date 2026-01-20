# Fluxos de Negócio

Este documento descreve os fluxos de dados, estados e regras de negócio do CRM Prestadores.

## Índice

- [Ciclo de Vida do Prestador](#ciclo-de-vida-do-prestador)
- [Fluxo de Candidaturas](#fluxo-de-candidaturas)
- [Fluxo de Onboarding](#fluxo-de-onboarding)
- [Fluxo de Formulários de Serviços](#fluxo-de-formulários-de-serviços)
- [Fluxo de Pedidos de Serviço](#fluxo-de-pedidos-de-serviço)
- [Fluxo de Preços e Catálogo de Serviços](#fluxo-de-preços-e-catálogo-de-serviços)
- [Fluxo de Cobertura Geográfica](#fluxo-de-cobertura-geográfica)
- [Sistema de Alertas](#sistema-de-alertas)
- [Histórico de Alterações](#histórico-de-alterações)
- [Regras de Negócio Importantes](#regras-de-negócio-importantes)
- [Próximos Documentos](#próximos-documentos)

---

## Ciclo de Vida do Prestador

O prestador passa por diferentes estados ao longo do seu relacionamento com a empresa:

```
                                    ┌─────────────────────────────────────┐
                                    │                                     │
                                    ▼                                     │
┌─────────┐    enviar para    ┌──────────────┐    concluir    ┌─────────┐ │
│  NOVO   │ ──────────────────│ EM_ONBOARDING│ ──────────────>│  ATIVO  │ │
└────┬────┘    onboarding     └──────┬───────┘   onboarding   └─────┬───┘ │
     │                               │                              │     │
     │ abandonar                     │ abandonar                    │     │
     │                               │                              │     │
     ▼                               ▼                              │     │
┌──────────────────────────────────────────┐       suspender        │     │
│              ABANDONADO                  │<───────────────────────┘     │
└────────────────────┬─────────────────────┘                              │
                     │                                                    │
                     │ recuperar                                          │
                     └────────────────────────────────────────────────────┘
```

### Estados Possíveis

| Estado | Descrição | Próximas Acções |
|--------|-----------|-----------------|
| `novo` | Candidatura recebida, aguarda análise | Enviar para onboarding, Abandonar |
| `em_onboarding` | Em processo de integração | Concluir onboarding, Abandonar, Remover do onboarding |
| `ativo` | Operacional, pode receber trabalhos | Suspender |
| `suspenso` | Temporariamente inativo | Reactivar |
| `abandonado` | Desistiu ou foi rejeitado | Recuperar |

### Transições de Estado

```typescript
// Estados permitidos (database enum)
type ProviderStatus = 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado'
```

| De | Para | Acção | Quem pode |
|----|------|-------|-----------|
| `novo` | `em_onboarding` | Enviar para onboarding | Qualquer user |
| `novo` | `abandonado` | Abandonar candidatura | Qualquer user |
| `em_onboarding` | `ativo` | Concluir onboarding | Qualquer user |
| `em_onboarding` | `abandonado` | Abandonar | Qualquer user |
| `em_onboarding` | `novo` | Remover do onboarding | Qualquer user |
| `ativo` | `suspenso` | Suspender | Qualquer user |
| `suspenso` | `ativo` | Reactivar | Qualquer user |
| `abandonado` | `novo` | Recuperar | Qualquer user |

---

## Fluxo de Candidaturas

### Entrada de Candidaturas

As candidaturas podem entrar no sistema de duas formas:

```
┌─────────────────┐                    ┌─────────────────┐
│    HubSpot      │                    │   Criação       │
│   (webhook)     │                    │    Manual       │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │ POST /api/webhooks/hubspot           │ Form UI
         │                                      │
         ▼                                      ▼
┌──────────────────────────────────────────────────────────┐
│                    VALIDAÇÃO                             │
│  - Campos obrigatórios (nome, email)                     │
│  - Formato de email válido                               │
│  - NIF válido (9 dígitos) se fornecido                   │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              DETECÇÃO DE DUPLICADOS                      │
│  1. Email exacto                                         │
│  2. NIF exacto                                           │
│  3. Nome fuzzy (≥85% similaridade)                       │
└─────────────────────────┬────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
     ┌──────────┐               ┌──────────────┐
     │   Novo   │               │  Duplicado   │
     │ Provider │               │  Detectado   │
     └──────────┘               └──────┬───────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
                   ┌──────────────┐         ┌──────────────┐
                   │ Quick Merge  │         │ Merge Manual │
                   │ (automático) │         │ (campo a     │
                   │              │         │   campo)     │
                   └──────────────┘         └──────────────┘
```

### Detecção de Duplicados

O sistema detecta duplicados por ordem de prioridade:

1. **Email exacto** - Correspondência exacta de email (case-insensitive)
2. **NIF exacto** - Correspondência exacta de NIF (9 dígitos)
3. **Nome fuzzy** - Similaridade ≥85% usando distância de Levenshtein

```typescript
// Exemplo de cálculo de similaridade
function calculateSimilarity(str1: string, str2: string): number {
  // Normalizar strings (lowercase, remover acentos)
  // Calcular distância de Levenshtein
  // Retornar percentagem de similaridade
  return Math.round((1 - distance / maxLen) * 100)
}

// "João Silva" vs "Joao Silva" → 95% ✅ (duplicado)
// "João Silva" vs "Maria Silva" → 70% ❌ (não duplicado)
```

### Opções de Merge

| Tipo | Quando usar | Comportamento |
|------|-------------|---------------|
| **Quick Merge** | Duplicado óbvio, dados consistentes | Mantém registo mais antigo, actualiza campos vazios |
| **Merge Manual** | Dados conflitantes | UI para escolher campo a campo qual valor manter |

---

## Fluxo de Onboarding

### Visão Geral

O onboarding é um pipeline Kanban com **11 etapas** e **23 tarefas**. Cada etapa tem tarefas específicas que devem ser concluídas antes de avançar automaticamente.

```
Etapas 1-4:
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Etapa 1  │──>│  Etapa 2  │──>│  Etapa 3  │──>│ Etapa 3A  │
│    POR    │   │CONTACTADOS│   │  AGUARDA  │   │  REUNIÃO  │
│ CONTACTAR │   │AGUARDA INF│   │  REUNIÃO  │   │  MARCADA  │
└───────────┘   └───────────┘   └───────────┘   └─────┬─────┘
                                                      │
Etapas 4-7:                                           ▼
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Etapa 4  │──>│  Etapa 5  │──>│  Etapa 6  │──>│  Etapa 7  │
│  COMITÉ   │   │  AGUARDA  │   │    EM     │   │  AGUARDA  │
│ GO/NO GO  │   │   DOCS    │   │ FORMAÇÃO  │   │   QUIZ    │
└───────────┘   └───────────┘   └───────────┘   └─────┬─────┘
                                                      │
Etapas 8-11:                                          ▼
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Etapa 8  │──>│  Etapa 9  │──>│ Etapa 10  │──>│ Etapa 11  │
│  ENVIAR   │   │  CRIAR    │   │ALINHAMENTO│   │ACOMPANHA- │
│ MATERIAIS │   │FICHA ERP  │   │PRE-LAUNCH │   │  MENTO    │
└───────────┘   └───────────┘   └───────────┘   └───────────┘
```

### Etapas e Tarefas Detalhadas

#### Etapa 1: POR CONTACTAR
| # | Tarefa | Deadline Normal | Deadline Urgente |
|---|--------|-----------------|------------------|
| 1 | Enviar email #2 + anexo | 48h | 24h |
| 2 | Ligar (ou enviar reminder) | 48h | 24h |

#### Etapa 2: CONTACTADOS / AGUARDA INFO
| # | Tarefa | Deadline Normal | Deadline Urgente |
|---|--------|-----------------|------------------|
| 3 | Analisar resposta | 72h | 48h |
| 4 | Enviar precário (Email #3) | Manual | Manual |
| 5 | Avaliar interesse do parceiro | Manual | Manual |

#### Etapa 3: AGUARDA REUNIÃO
| # | Tarefa | Deadline |
|---|--------|----------|
| 6 | Marcar reunião Teams (Email #4) | Manual |

#### Etapa 3A: REUNIÃO MARCADA
| # | Tarefa | Deadline |
|---|--------|----------|
| 7 | Realizar reunião (usar script) | Manual |

#### Etapa 4: APRESENTAR AO COMITÉ
| # | Tarefa | Deadline |
|---|--------|----------|
| 8 | Decisão GO / NO GO | Manual |

> **Nota:** NO GO → Prestador passa para estado `abandonado`

#### Etapa 5: AGUARDA DOCUMENTAÇÃO/APÓLICE
| # | Tarefa | Deadline |
|---|--------|----------|
| 9 | Pedir informação final (Email #5) | Manual |
| 10 | Receber informação | Manual |

#### Etapa 6: EM FORMAÇÃO
| # | Tarefa | Deadline |
|---|--------|----------|
| 11 | Criar prestador BO + colocar ficha | Manual |
| 12 | Enviar email de acesso à AP, formação e merch (Email #6) | Manual |

#### Etapa 7: AGUARDA RESPOSTA QUIZ
| # | Tarefa | Deadline |
|---|--------|----------|
| 13 | Receber resposta do Quiz | Manual |
| 14 | Receber pedido de merch | Manual |
| 15 | Receber resposta ao email #6 | Manual |

#### Etapa 8: ENVIAR MATERIAIS
| # | Tarefa | Deadline |
|---|--------|----------|
| 16 | Enviar materiais (Email 6.2) | Manual |
| 17 | Confirmar recepção dos materiais | Manual |

#### Etapa 9: CRIAR FICHA ERP
| # | Tarefa | Deadline |
|---|--------|----------|
| 18 | Criar ficha ERP | Manual |

#### Etapa 10: ALINHAMENTO PRE-LAUNCH
| # | Tarefa | Deadline |
|---|--------|----------|
| 19 | Alinhamento da data de entrada + dúvidas | Manual |
| 20 | Enviar email de launch (Email #8) | Manual |
| 21 | Atribuir serviços, quotas e custos | Manual |
| 22 | Colocar data da entrada | Manual |

#### Etapa 11: ACOMPANHAMENTO
| # | Tarefa | Deadline Normal | Deadline Urgente |
|---|--------|-----------------|------------------|
| 23 | Contacto pós-launch (7-10 dias após entrada) | 240h (10 dias) | 168h (7 dias) |

### Tipos de Onboarding

| Tipo | Prazos | Uso |
|------|--------|-----|
| `normal` | Prazos padrão | Maioria dos casos |
| `urgente` | Prazos reduzidos | Necessidade imediata de prestador na zona |

```typescript
type OnboardingType = 'normal' | 'urgente'
```

### Estrutura de Dados

```
┌──────────────────┐
│  onboarding_card │ ←── Representa o prestador no Kanban
├──────────────────┤
│ provider_id      │ ←── Ligação ao prestador
│ current_stage_id │ ←── Etapa actual (1-11)
│ onboarding_type  │ ←── normal ou urgente
│ started_at       │ ←── Data de início
│ completed_at     │ ←── null enquanto em progresso
└────────┬─────────┘
         │
         │ 1:N (uma tarefa por task_definition)
         ▼
┌──────────────────────┐
│   onboarding_task    │ ←── Tarefas do card
├──────────────────────┤
│ task_definition_id   │ ←── Definição da tarefa
│ status               │ ←── por_fazer, em_curso, concluida
│ deadline_at          │ ←── Prazo calculado
│ original_deadline_at │ ←── Prazo original (para tracking)
│ completed_at         │ ←── Quando foi concluída
│ completed_by         │ ←── Quem concluiu
└──────────────────────┘
```

### Estados das Tarefas

```typescript
type TaskStatus = 'por_fazer' | 'em_curso' | 'concluida'
```

```
┌───────────┐    iniciar    ┌───────────┐    concluir   ┌───────────┐
│ POR_FAZER │ ─────────────>│ EM_CURSO  │ ─────────────>│ CONCLUIDA │
└───────────┘               └─────┬─────┘               └─────┬─────┘
                                  │                           │
                                  │ reabrir                   │
                                  │<──────────────────────────┘
```

### Avanço Automático de Etapa

Quando todas as tarefas obrigatórias de uma etapa são concluídas, o card avança automaticamente para a próxima etapa:

```typescript
async function checkAndMoveToNextStage(cardId, currentStageId) {
  // 1. Obter todas as tarefas da etapa actual
  const currentStageTasks = await getTasks(cardId, currentStageId)

  // 2. Verificar se todas estão concluídas
  const allCompleted = currentStageTasks.every(t => t.status === 'concluida')

  if (!allCompleted) return false

  // 3. Obter próxima etapa
  const nextStage = await getNextStage(currentStageId)

  if (!nextStage) return false // Última etapa

  // 4. Mover card
  await moveCard(cardId, nextStage.id)

  // 5. Calcular deadlines da próxima etapa
  await calculateNextStageDeadlines(cardId, nextStage.id)

  return true
}
```

### Cálculo de Deadlines

Os deadlines são calculados em cascata — cada tarefa começa quando a anterior termina:

```
Tarefa 1: 2h  ──┐
               │
Tarefa 2: 4h  ─┼─> Tarefa 1: agora + 2h
               │   Tarefa 2: agora + 2h + 4h = agora + 6h
Tarefa 3: 1h  ─┘   Tarefa 3: agora + 6h + 1h = agora + 7h
```

```typescript
// Deadlines diferentes por tipo de onboarding
const deadlineHours = onboardingType === 'urgente'
  ? taskDef.default_deadline_hours_urgent  // Ex: 1h
  : taskDef.default_deadline_hours_normal  // Ex: 24h
```

### Conclusão do Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONCLUIR ONBOARDING                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Marcar card como concluído (completed_at = now)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Actualizar provider.status = 'ativo'                        │
│     Actualizar provider.activated_at = now                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Registar no history_log                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Recalcular prioridades (background)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Formulários de Serviços

### Visão Geral

O sistema de formulários permite que prestadores submetam informações detalhadas sobre os seus serviços, documentação, recursos e cobertura geográfica. Cada submissão cria um **snapshot histórico** que fica imutável, enquanto os dados editáveis são mantidos na tabela `providers`.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE DADOS                         │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ providers (dados editáveis/actuais)                               │
├───────────────────────────────────────────────────────────────────┤
│ - services[]                  │ Serviços seleccionados (UUIDs)    │
│ - counties[]                  │ Concelhos de cobertura            │
│ - has_activity_declaration    │ Documentação                      │
│ - has_liability_insurance     │                                   │
│ - has_work_accidents_insurance│                                   │
│ - certifications[]            │                                   │
│ - works_with_platforms[]      │ Plataformas parceiras             │
│ - available_weekdays[]        │ Disponibilidade                   │
│ - work_hours_start/end        │                                   │
│ - num_technicians             │ Recursos                          │
│ - has_own_transport           │                                   │
│ - has_computer                │                                   │
│ - own_equipment[]             │                                   │
│ - forms_submitted_at          │ Data da última submissão          │
└───────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N (histórico de submissões)
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ provider_forms_data (snapshots imutáveis)                         │
├───────────────────────────────────────────────────────────────────┤
│ - provider_id                 │ FK para providers                 │
│ - submission_number           │ Número sequencial (1, 2, 3...)    │
│ - submitted_at                │ Data/hora da submissão            │
│ - submitted_ip                │ IP de origem                      │
│ - selected_services[]         │ Serviços no momento da submissão  │
│ - coverage_municipalities[]   │ Concelhos no momento              │
│ - (todos os outros campos)    │ Snapshot completo                 │
└───────────────────────────────────────────────────────────────────┘
```

### Fluxo de Submissão

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gerar Token   │───>│ Prestador abre  │───>│   Submeter      │
│   (backoffice)  │    │   link único    │    │   Formulário    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                      │                       │
        │                      │                       │
        ▼                      ▼                       ▼
  Token guardado         /forms/services/       INSERT em
  em providers.          [token]               provider_forms_data
  forms_token                                  + UPDATE providers
```

#### 1. Geração de Token

```typescript
// O backoffice gera um token único para o prestador
const token = Buffer.from(`${providerId}:${Date.now()}`).toString('base64url')

// Token é guardado em providers.forms_token
await supabase
  .from('providers')
  .update({ forms_token: token })
  .eq('id', providerId)
```

#### 2. Acesso ao Formulário

O prestador acede via URL: `/forms/services/[token]`

- Token é validado contra `providers.forms_token`
- Se válido, carrega dados actuais do prestador para pré-preenchimento
- Formulário permite múltiplas submissões

#### 3. Submissão do Formulário

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSO DE SUBMISSÃO                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Calcular próximo submission_number                          │
│     SELECT MAX(submission_number) + 1 FROM provider_forms_data  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INSERT novo registo em provider_forms_data                  │
│     (snapshot imutável com todos os dados submetidos)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. UPDATE providers com dados actuais                          │
│     (versão editável)                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. INSERT em history_log                                       │
│     event_type: 'forms_submission'                              │
└─────────────────────────────────────────────────────────────────┘
```

### Histórico de Submissões

Cada submissão é preservada como um snapshot histórico, permitindo:

- Ver evolução dos dados ao longo do tempo
- Comparar submissões diferentes
- Auditar alterações

```
┌─────────────────────────────────────────────────────────────────┐
│                    TAB "SUBMISSÕES" NO CRM                       │
└─────────────────────────────────────────────────────────────────┘

┌────────┬────────────────────┬──────────┬───────────┬───────────┐
│   #    │  Data Submissão    │ Serviços │ Concelhos │   Ações   │
├────────┼────────────────────┼──────────┼───────────┼───────────┤
│   3    │ 20/01/2026 14:30   │    15    │    23     │  [Ver]    │
│   2    │ 15/01/2026 10:15   │    12    │    20     │  [Ver]    │
│   1    │ 10/01/2026 09:00   │    10    │    18     │  [Ver]    │
└────────┴────────────────────┴──────────┴───────────┴───────────┘
```

### Edição pelo Backoffice

O backoffice pode editar os dados actuais do prestador directamente na tabela `providers`:

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLUXO DE EDIÇÃO (BACKOFFICE)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐                    ┌─────────────────┐
│  Tab "Perfil"   │                    │  history_log    │
│  (CRM)          │───── edição ──────>│  (auditoria)    │
└─────────────────┘                    └─────────────────┘
        │                                      │
        │ UPDATE providers                     │ INSERT com
        │ (campos editáveis)                   │ old_value/new_value
        ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│ Dados actuais   │                    │ Campos alterados│
│ do prestador    │                    │ registados      │
└─────────────────┘                    └─────────────────┘
```

Os campos editáveis incluem:
- Documentação (seguros, declarações, certificações)
- Recursos (viatura, computador, equipamento, técnicos)
- Disponibilidade (dias, horários)
- Serviços e cobertura geográfica

### Estrutura da Base de Dados

```sql
-- Snapshots históricos (imutáveis após inserção)
CREATE TABLE provider_forms_data (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers(id),
  submission_number INTEGER,  -- 1, 2, 3... (sequencial por provider)
  submitted_at TIMESTAMPTZ,
  submitted_ip TEXT,
  -- Todos os campos do formulário...
  selected_services UUID[],
  coverage_municipalities TEXT[],
  -- etc.
);

-- Índice para queries por provider ordenado por data
CREATE INDEX idx_provider_forms_data_provider_submitted
ON provider_forms_data(provider_id, submitted_at DESC);
```

### Regras de Negócio

1. **Múltiplas Submissões**: Um prestador pode submeter o formulário várias vezes
2. **Snapshots Imutáveis**: Registos em `provider_forms_data` nunca são actualizados
3. **Dados Editáveis**: A tabela `providers` contém a versão actual e editável
4. **Auditoria Completa**: Todas as alterações (submissões e edições) são registadas
5. **Token Único**: Cada prestador tem um token único para acesso ao formulário

---

## Fluxo de Pedidos de Serviço

### Importação do Backoffice

Os pedidos de serviço são importados do backoffice FIXO via scraping:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Backoffice  │────>│    Excel      │────>│   Supabase    │
│     FIXO      │     │  (download)   │     │   (insert)    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        │ Puppeteer           │ Parse               │ Upsert
        │ scrape              │ XLSX                │
        ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│  Alguns Campos importados:                                    │
│  - Número do pedido                                           │
│  - Data/hora                                                  │
│  - Prestador (nome, ID backoffice)                            │
│  - Serviço                                                    │
│  - Morada                                                     │
│  - Estado                                                     │
│  - Valor                                                      │
└───────────────────────────────────────────────────────────────┘
```

### Sincronização

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGERS DE SYNC                             │
└─────────────────────────────────────────────────────────────────┘

1. AUTOMÁTICO (cron) - Semanalmente às segundas-feiras
   - 06:00 UTC - Sync Backoffice (pedidos últimos 90 dias)
   - 06:30 UTC - Sync Billing (facturação)
   - 07:00 UTC - Sync Providers (prestadores)
   - 07:30 UTC - Sync Allocation History (histórico alocações)

2. MANUAL (UI)
   - Botão "Sincronizar" em /configuracoes
   - Permite escolher intervalo de datas

3. WORKFLOW
   GitHub Actions
   └── Puppeteer login
       └── Navegar para exportação
           └── Download Excel
               └── Parse e insert no Supabase
                   └── Actualizar sync_logs
```

---

## Fluxo de Preços e Catálogo de Serviços

### Estrutura do Catálogo

O catálogo de serviços é importado via Excel e contém preços de referência organizados por clusters:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DO CATÁLOGO                        │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ service_prices (preços de referência)                             │
├───────────────────────────────────────────────────────────────────┤
│ - service_name         │ Nome do serviço                          │
│ - cluster              │ Agrupamento (Casa, Saúde, Empresas, etc) │
│ - service_group        │ Grupo específico (Canalizador, etc)      │
│ - unit_description     │ Unidade de medida                        │
│ - typology             │ Variante do serviço                      │
│ - vat_rate             │ Taxa de IVA (23%, 6%, etc)               │
│ - price_base           │ Preço base s/ IVA                        │
│ - price_hour_*         │ Preços por hora (com/sem materiais)      │
│ - price_cleaning_*     │ Preços de limpeza (variantes)            │
│ - is_active            │ Se o serviço está disponível             │
└───────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N (por prestador)
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ provider_prices (preços acordados)                                │
├───────────────────────────────────────────────────────────────────┤
│ - provider_id              │ ID do prestador                      │
│ - reference_price_id       │ FK para service_prices               │
│ - custom_price_without_vat │ Preço personalizado (opcional)       │
│ - is_selected_for_proposal │ Seleccionado para proposta PDF       │
│ - notes                    │ Observações                          │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ material_catalog (materiais)                                      │
├───────────────────────────────────────────────────────────────────┤
│ - material_name        │ Nome do material                         │
│ - category             │ Categoria (ex: Canalizador)              │
│ - price_without_vat    │ Preço s/ IVA                             │
│ - vat_rate             │ Taxa de IVA                              │
└───────────────────────────────────────────────────────────────────┘
```

### Importação do Catálogo

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Upload Excel  │────>│    Parse XLSX    │────>│   Upsert DB       │
│  (Configurações)│     │  (api/service-   │     │ (service_prices   │
│                 │     │   catalog/import)│     │  material_catalog)│
└─────────────────┘     └──────────────────┘     └───────────────────┘
         │                       │                       │
         │ Ficheiro              │ Ler sheets:           │ Limpar tabela
         │ .xlsx                 │ - DB (preços)         │ e inserir
         ▼                       │ - Materiais_*         │ novos registos
                                 ▼                       ▼
```

### Fluxo de Definição de Preços por Prestador

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Seleccionar    │───>│  Personalizar   │───>│   Gerar PDF     │
│  Serviços       │    │   Preços        │    │   Proposta      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
 Marcar checkbox      Definir preço           Apenas serviços
 is_selected_for_     custom_price ou         com is_selected
 proposal = true      usar referência         são incluídos
```

### Clusters Disponíveis

| Cluster | Cor Badge | Descrição |
|---------|-----------|-----------|
| Casa | Azul | Serviços domésticos |
| Saúde e bem estar | Verde | Serviços de saúde |
| Empresas | Roxo | Serviços corporativos |
| Luxo | Âmbar | Serviços premium |
| Pete | Rosa | Serviços especiais |

---

## Fluxo de Cobertura Geográfica

### Estrutura

```
┌─────────────────────────────────────────────────────────────────┐
│                    COBERTURA DO PRESTADOR                       │
└─────────────────────────────────────────────────────────────────┘

providers.districts = ['Lisboa', 'Setúbal', ...]     ←── Distritos
providers.counties = ['Lisboa', 'Sintra', ...]       ←── Concelhos

┌─────────────────────────────────────────────────────────────────┐
│  308 concelhos de Portugal disponíveis                          │
│  GeoJSON em public/geo/portugal-municipalities-simplified.json  │
└─────────────────────────────────────────────────────────────────┘
```

### Visualização no Mapa

```
┌─────────────────────────────────────────────────────────────────┐
│                      MAPA CHOROPLETH                             │
└─────────────────────────────────────────────────────────────────┘

Cor por nível de cobertura:

  🟢 Verde   = 2+ prestadores activos
  🟡 Amarelo = 1 prestador activo
  🔴 Vermelho = 0 prestadores

Filtros disponíveis:
  - Por tipo de serviço
  - Por categoria
```

---

## Sistema de Alertas

### Tipos de Alertas

| Tipo | Trigger | Destinatário |
|------|---------|--------------|
| `deadline_approaching` | Tarefa a 24h do deadline | RM do provider (`relationship_owner_id`) |
| `task_stalled` | Tarefa parada há X dias | RM do provider (`relationship_owner_id`) |


### Fluxo de Geração

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRON JOB (diário)                             │
│                    /api/alerts/generate                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Buscar tarefas com deadline próximo ou paradas              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Para cada tarefa, obter o RM do provider associado          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Verificar se já existe alerta para esta tarefa              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Criar alerta se não existir                                 │
│     - user_id = provider.relationship_owner_id                  │
│     - task_id = task.id                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. UI mostra badge no header (AlertsBell component)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Histórico de Alterações

Todas as acções significativas são registadas na tabela `history_log`:

### Eventos Registados

| event_type | Descrição |
|------------|-----------|
| `sent_to_onboarding` | Candidatura enviada para onboarding |
| `stage_change` | Card movido para nova etapa |
| `task_completed` | Tarefa concluída |
| `task_reopened` | Tarefa reaberta |
| `deadline_change` | Prazo alterado |
| `owner_change` | Responsável alterado |
| `task_owner_change` | Responsável de tarefa alterado |
| `status_change` | Estado do prestador alterado |
| `note_added` | Nota adicionada |
| `price_change` | Preço alterado |
| `field_change` | Campo editado (documentação, recursos, disponibilidade) |
| `forms_submission` | Formulário de serviços submetido pelo prestador |
| `abandoned` | Candidatura abandonada |
| `recovered` | Candidatura recuperada |
| `removed_from_onboarding` | Removido do onboarding |

### Estrutura do Log

```typescript
interface HistoryLogEntry {
  id: string
  provider_id: string
  card_id?: string        // Se relacionado com onboarding
  task_id?: string        // Se relacionado com tarefa
  event_type: string
  description: string
  old_value?: object      // Estado anterior
  new_value?: object      // Novo estado
  reason?: string         // Motivo (quando aplicável)
  created_by: string      // User que fez a acção
  created_at: string
}
```

---

## Regras de Negócio Importantes

### 1. Onboarding
 
- Um prestador só pode ter um card de onboarding activo
- Tarefas de etapas futuras não têm deadline até o card chegar a essa etapa
- Ao avançar de etapa, os deadlines são calculados a partir desse momento

### 2. Duplicados

- Email e NIF devem ser únicos (excepto valores mascarados `***`)
- Duplicados são detectados no momento da criação/importação
- Merge manual preserva o ID do registo mais antigo

### 3. Catálogo de Serviços e Preços

- Preços de referência estão em `service_prices` (importados via Excel)
- Preços personalizados por prestador em `provider_prices`
- Um prestador pode ter preço diferente da referência (`custom_price_without_vat`)
- IVA é definido ao nível do serviço (coluna `vat_rate` em `service_prices`)
- Serviços são agrupados por `cluster` (Casa, Saúde, Empresas, etc.)
- Apenas serviços marcados com `is_selected_for_proposal` aparecem no PDF de proposta

### 4. Cobertura

- Um prestador pode cobrir múltiplos concelhos
- A cobertura é usada para matching de pedidos
- Concelhos sem cobertura aparecem a vermelho no mapa

### 5. Formulários de Serviços

- Cada submissão cria um snapshot imutável em `provider_forms_data`
- Os dados editáveis ficam na tabela `providers` (podem ser alterados pelo backoffice)
- O número de submissão (`submission_number`) é sequencial por prestador
- Alterações pelo backoffice são registadas com `event_type: 'field_change'`
- Submissões pelo prestador são registadas com `event_type: 'forms_submission'`

---

## Próximos Documentos

- [03-BASE-DADOS.md](./03-BASE-DADOS.md) - Schema detalhado
- [04-INTEGRACOES.md](./04-INTEGRACOES.md) - Backoffice, HubSpot, Mapbox

---

*Última actualização: Janeiro 2026*
