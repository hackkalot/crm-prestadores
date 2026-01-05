# Development Tracking - CRM Prestadores FIXO

Este documento acompanha o progresso de desenvolvimento do CRM, mapeando os requisitos aos to-dos e marcando o que ja esta implementado.

**Legenda:**
- [x] Implementado e funcional
- [ ] Por implementar
- [~] Parcialmente implementado

---

## 1. Modulo de Candidaturas

**Ficheiro de requisitos:** `docs/requisitos tecnicos/candidaturas.md`

### 1.1 Candidatura Recebida

#### Criacao automatica da candidatura
- [x] Integracao com HubSpot (webhook)
- [x] Card/linha por prestador com informacoes:
  - [x] Header: Nome Prestador + Tipo de Entidade
  - [x] Email
  - [x] Telefone
  - [x] Website/redes sociais
  - [x] NIF
  - [x] Zona de atuacao (distritos)
  - [x] Tipo de servicos
  - [x] Nr de tecnicos (se aplicavel)
  - [x] Tem equipa administrativa?
  - [x] Tem transporte proprio?
  - [x] Horario laboral
  - [x] Data da candidatura
  - [x] Nr de candidaturas

#### Filtros e pesquisa
- [x] Filtrar por tipo de parceiro (Tecnico / ENI / Empresa)
- [x] Filtrar por zona de atuacao
- [x] Filtrar por tipo de servicos
- [ ] Filtrar por nr de tecnicos
- [x] Filtrar por estado (Novo / Em Onboarding / Abandonado)
- [x] Filtrar por data da candidatura (intervalos)
- [x] Pesquisa por texto (nome, email)

#### Detecao e merge de duplicados
- [x] Detecao de duplicados (NIF ou Email)
- [x] Atualizacao do registo existente
- [x] Campo "# de candidaturas" atualizado
- [x] Historico de candidaturas (data, origem)

### 1.2 Screening Inicial

#### Enviar para Onboarding
- [x] Botao "Enviar para Onboarding"
- [x] Card enviado para Kanban de Onboarding
- [x] Estado passa para "Em Onboarding"
- [x] Escolher tipo: Normal ou Urgente
- [x] Candidatura visivel na lista com estado "Em Onboarding"

#### Abandonar candidatura
- [x] Botao "Abandonar"
- [x] Escolher quem nao quer avancar:
  - [x] Parceiro nao quer avancar
  - [x] FIXO nao quer avancar
- [x] Motivos pre-definidos
- [x] Campo de texto livre (outros)
- [x] Estado = "Abandonado"
- [x] Historico da decisao (data, utilizador, tipo, motivo)

### 1.3 Interface
- [x] Vista em cards
- [x] Vista em lista (linhas)
- [x] Toggle entre vistas (lista por defeito)
- [x] Pagina de detalhe dedicada `/candidaturas/[id]`

---

## 2. Modulo de Onboarding (Kanban)

**Ficheiro de requisitos:** `docs/requisitos tecnicos/kanban.md`

### 2.1 Estrutura do Kanban

#### Cards
- [x] 1 card por prestador
- [x] Header: Nome + Tipo de Entidade
- [x] Tipo de Onboarding (Normal/Urgente) com badge
- [x] Categorias de servicos (tags)
- [x] Zonas (tags)
- [x] Owner principal
- [x] Proxima tarefa ativa + prazo
- [x] Barra de progresso
- [x] Indicador de tarefas atrasadas

#### Movimento dos cards
- [x] Arrastar manualmente entre colunas (drag & drop)
- [x] Mover automaticamente quando ultima tarefa da etapa e concluida

### 2.2 Estrutura interna do card (vista detalhada)

#### Cabecalho do prestador
- [x] Nome + Tipo de Entidade
- [x] Owner principal (editavel)
- [x] Tipo de onboarding (Normal/Urgente)
- [x] Etapa atual
- [x] Zonas
- [x] Servicos

#### Stepper da etapa (tarefas)
- [x] Lista de tarefas da etapa atual
- [x] Owner da tarefa (editavel) - parcial
- [x] Prazo (data limite)
- [x] Estado (por fazer, em curso, concluida)
- [x] Marcar tarefas como concluidas
- [x] Mini-acoes internas (ex: Gerar documento de precario)
- [x] Consultar tarefas de outras etapas (historico)

#### Notas e Historico
- [x] Tab "Notas" - notas livres sobre o prestador
- [x] Tab "Historico/Log":
  - [x] Mudanca de etapa
  - [x] Tarefas concluidas/reabertas
  - [x] Alteracao de owner principal
  - [x] Alteracao de owner de tarefa
  - [ ] Alteracao de prazos
  - [ ] Reagendamentos
  - [x] Registo de notas

### 2.3 Logica de tarefas, prazos e owners

#### Definicao das tarefas (zona global)
- [x] Tabela `task_definitions` com:
  - [x] Etapa a que pertence
  - [x] Nome da tarefa
  - [x] Owner por defeito
  - [x] Prazo padrao
  - [ ] Tipo de alerta

#### Owners
- [x] Owner principal do prestador (editavel)
- [x] Owner da tarefa (por defeito vem das definicoes)
- [x] Historico de alteracoes de owners

#### Prazos
- [x] Prazo padrao atribuido ao iniciar onboarding
- [x] Prazos diferentes para Normal vs Urgente
- [x] Reagendar prazos com motivo
- [x] Historico de alteracoes de prazos

#### Zona de definicoes globais
- [x] Pagina "Definicoes de Onboarding"
- [x] Prazos padrao por tarefa (Normal vs Urgente)
- [x] Parametros de alertas
- [x] Log de alteracoes as definicoes

### 2.4 Alertas e notificacoes
- [x] Alerta "Prazo a expirar" (X horas antes)
- [x] Alerta "Tarefa parada" (sem alteracoes ha X dias)
- [x] Marca visual no card (icone "Em risco")
- [x] Indicador visual de tarefas atrasadas (badge vermelho)

### 2.5 Conclusao do Onboarding
- [x] Botao "Concluir Onboarding"
- [x] Prestador passa para estado "Ativo"
- [x] Card removido do Kanban

---

## 3. Modulo de Gestao de Prestadores

**Ficheiro de requisitos:** `docs/requisitos tecnicos/gestao de prestadores.md`

### 3.1 Lista de prestadores
- [x] Vista tabela/lista
- [x] Campos principais:
  - [x] Nome
  - [x] Tipo de entidade
  - [x] Zonas de atuacao
  - [x] Servicos principais
  - [x] Estado (Ativo/Suspenso/Abandonado)
  - [x] Owner da relacao
- [x] Filtros:
  - [x] Zona
  - [x] Servicos
  - [x] Estado
  - [x] Tipo de entidade

### 3.2 Ficha do prestador

#### Tab Resumo/Perfil
- [x] Dados base (nome, tipo, NIF, contactos)
- [x] Zonas de atuacao
- [x] Tipos de servicos
- [x] Nr de tecnicos
- [x] Equipa administrativa (Sim/Nao)
- [x] Transporte proprio (Sim/Nao)
- [x] Horario laboral
- [x] Dados administrativos (IBAN, comprovativo atividade)
- [x] Estado atual + datas relevantes

#### Tab Servicos & Tabela de Precos
- [x] Lista de servicos que pode fazer
- [x] Preco acordado por servico
- [x] Data de inicio de vigencia
- [x] Tabela de referencia FIXO (global)
- [x] Proposta inicial automatica
- [x] Snapshots de tabela (versoes anteriores)
- [x] Alertas de desvio de precos

#### Tab Notas & Relacionamento
- [x] Notas livres (data, autor, texto)
- [x] Tag de tipo de nota (operacional, comercial, qualidade)

#### Tab Historico
- [x] Data de entrada na rede
- [x] Alteracoes de estado
- [x] Alteracoes na tabela de precos
- [x] Alteracao de owner da relacao

### 3.3 Necessidades de rede & matching
- [x] Zona de necessidades da rede
- [x] Ver prestadores disponiveis por zona/servico
- [x] Identificar lacunas na cobertura

---

## 4. KPIs e Dashboard

**Ficheiro de requisitos:** `docs/requisitos tecnicos/kpis gerais de onboarding.md`

### 4.1 Estrutura da pagina
- [x] Pagina de KPIs basica
- [x] Filtros gerais:
  - [x] Periodo (data candidatura / entrada onboarding)
  - [x] Tipo de parceiro
  - [x] Zona
  - [x] Tipo de Onboarding (Normal/Urgente)

### 4.2 KPIs principais

#### Nr de prestadores em cada etapa
- [x] Contagem por coluna do Kanban
- [x] Cards com totais
- [x] Grafico de barras

#### Tempo medio entre inicio e fim de onboarding
- [x] Calculo: data entrada -> data conclusao
- [x] Media em dias
- [x] Mediana
- [x] Distribuicao Normal vs Urgente
- [x] Tempo medio por etapa

#### Nr de prestadores em onboarding
- [x] Total em onboarding
- [x] Dividido por Normal vs Urgente

#### Nr de prestadores em candidatura
- [x] Candidaturas por tratar (nao enviados, nao abandonados)

### 4.3 Evolucao futura
- [x] Funil completo (candidaturas -> onboarding -> ativos -> % conversao)
- [x] Media de tempo por etapa (identificar gargalos)
- [x] Comparacao Normal vs Urgente
- [x] Performance por owner

---

## 5. Visao Agenda

**Ficheiro de requisitos:** `docs/requisitos tecnicos/kanban.md` (seccao Agenda)

### 5.1 Vista pessoal
- [x] Vista semanal
- [x] Vista diaria
- [x] Todas as tarefas onde o utilizador e owner

### 5.2 Informacao por tarefa
- [x] Prestador
- [x] Tarefa
- [x] Etapa
- [x] Prazo
- [x] Estado (por fazer / em atraso / concluida)
- [x] Indicadores de alerta (cores)

### 5.3 Funcionalidades
- [x] Acesso rapido ao card do prestador
- [x] Sinalizacao de tarefas urgentes

---

## 6. Infraestrutura e Base

### 6.1 Autenticacao
- [x] Login com email/password
- [x] Protecao de rotas (middleware)
- [x] Tabela de utilizadores

### 6.2 Base de Dados
- [x] Schema Supabase completo
- [x] Tabelas principais:
  - [x] providers
  - [x] applications
  - [x] stage_definitions
  - [x] task_definitions
  - [x] onboarding_cards
  - [x] onboarding_tasks
  - [x] history_log
  - [x] users

### 6.3 Integracao HubSpot
- [x] Webhook para receber candidaturas
- [x] Detecao de duplicados
- [x] Criacao/atualizacao de providers

### 6.4 UI/UX
- [x] Layout dashboard com sidebar
- [x] Tema claro/escuro
- [x] Cor primaria Fidelidade (vermelho)
- [x] Componentes UI base (Button, Card, Badge, Dialog, etc.)

---

## Resumo de Progresso

| Modulo | Progresso Estimado |
|--------|-------------------|
| Candidaturas | 95% |
| Onboarding (Kanban) | 100% |
| Gestao de Prestadores | 100% |
| KPIs/Dashboard | 100% |
| Agenda | 100% |
| Infraestrutura | 95% |

**Proximos passos prioritarios:**
1. ~~Completar filtros avancados nas candidaturas~~ DONE
2. ~~Implementar sistema de notas e historico no onboarding~~ DONE
3. ~~Movimento automatico de cards quando etapa completa~~ DONE
4. ~~Ficha completa do prestador (Gestao de Prestadores)~~ DONE
5. ~~KPIs com filtros e graficos~~ DONE
6. ~~Visao Agenda~~ DONE
7. ~~Pagina de definicoes globais de onboarding~~ DONE
8. ~~Reagendar prazos com motivo e historico~~ DONE
9. ~~Sistema de alertas (prazo a expirar, tarefa parada)~~ DONE
10. ~~Tempo medio por etapa (KPIs)~~ DONE
11. ~~Performance por owner (KPIs)~~ DONE
12. ~~Tabela de precos por prestador~~ DONE
13. ~~Mini-acoes internas (ex: Gerar documento de precario)~~ DONE
14. ~~Consultar tarefas de outras etapas (historico)~~ DONE
15. ~~Tags de zonas e servicos nos cards do Kanban~~ DONE
16. ~~Proposta inicial automatica de precos~~ DONE
17. ~~Necessidades de rede & matching~~ DONE

---

*Ultima atualizacao: 2026-01-05*
