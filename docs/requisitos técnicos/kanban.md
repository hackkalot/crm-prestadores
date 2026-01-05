# **🧩 Descrição:**

Este módulo representa o **processo de Onboarding dos prestadores** após a fase de candidatura.

- A interface principal é uma **Visão Kanban por etapas** (colunas) com os cards dos prestadores em cada etapa, alinhada com o planner de onboarding  ( https://planner.cloud.microsoft/webui/plan/W3p3DuIRuUyZU9hHYnNe9ZcAFKwz/view/board?tid=b27f00d3-6ccb-4240-b5d0-56729544887e)
- Cada prestador entra neste Kanban com base na decisão feita na **página Candidaturas**
- O fluxo tem duas variantes:
    - **Onboarding Normal**
    - **Onboarding Urgente** (mesmas etapas, mas com prazos/SLAs diferentes)
- Cada prestador é um **card** que se move entre etapas à medida que as tarefas dessa etapa são concluídas

Ao abrir um card:

- Vemos um **stepper de tarefas da etapa atual** (ex.: etapa “POR CONTACTAR” → stepper com Tarefa 1 e 2)
- Podemos:
    - Marcar tarefas como concluídas
    - Reagendar prazos
    - Alterar owners de tarefa
- Existe:
    - Uma **zona de notas** (notas gerais do prestador que podem ser ou não associadas a tarefas)
    - Uma **tab de Histórico** com o log completo de alterações (tarefas, prazos, owners, etapa, notas relevantes)

Cada prestador tem:

- Um **owner principal** (gestor do onboarding), que pode ser alterado (ex.: férias/substituições)
- Possibilidade de atribuir **tarefas específicas** a outros owners
- **Prazos automáticos**, vindos de uma **zona comum de definições**, que:
    - São atribuídos por defeito quando o prestador entra no onboarding
    - Podem ser ajustados ao nível do prestador/tarefa (mantendo histórico)
    - Alimentam a **Agenda** de cada utilizador

**Objetivos:**

- Garantir que nenhum prestador “se perde” no processo
- Ter uma visão visual (Kanban) do pipeline de onboarding
- Ter controlo sobre tarefas, prazos, owners e notas, com histórico
- No fim do processo (tarefa 23 concluída), passar automaticamente o prestador para **Gestão de Prestadores** com estado `Ativo`

Fases de implementação (importante para o dev)

**Fase 1 – Operação manual com apoio do Kanban**

- O trabalho real (telefonemas, emails, atualização de documentos, etc.) é feito fora do CRM (Outlook, Teams, etc.)
- O gestor vem ao CRM:
    - Atualizar o estado da tarefa (por fazer → concluída)
    - Registar notas
    - Anexar ou referenciar documentos relevantes (quando fizer sentido)
- Alguns **mini-automatismos internos** podem existir (ex.: botão “Gerar documento de preçário para este prestador” com base na tabela de preços), para reduzir trabalho manual

**Fase 2 (Sonho para mais tarde) – Integração automática**

- Integração de:
    - Emails
    - Formulários
    - Quizzes
- Estas integrações poderiam:
    - Atualizar automaticamente tarefas (ex.: “Receber resposta do Quiz” → concluída)
    - Criar notificações automáticas
- Nesta fase, os alertas também podem passar a reagir a eventos externos (ex.: “chegou um email novo”)

# **⚙️ Requisitos técnicos:**

## **Etapas do Onboarding**

### 1. Estrutura do Kanban

- Cada prestador corresponde a **1 card** no Kanban
- Cada card deve mostrar, pelo menos:
    - **Header:** Nome do prestador + Tipo de Entidade (ex.: “Popota, LDA – Empresa”).
    - **Tipo de Onboarding:** Normal / Urgente. Se Urgente → ícone de urgência + card priorizado dentro da coluna.
    - **Categoria(s) de serviços** e **zona(s)** (tags) ex.: `Reparações`, `Lisboa`.
    - **Owner principal** do prestador (ex.: “Owner: Yola”)
    - **Próxima tarefa ativa + prazo** (ex.: “Tarefa: Enviar email #2 – prazo 12/12”)

### 1.1. Movimento dos cards

- Os cards devem poder ser:
    - **Arrastados manualmente** entre colunas
    - Movidos automaticamente de etapa quando a **última tarefa dessa etapa** é marcada como concluída

### 1.2. Tabela de tarefas por etapa

Não existe email numero 1. 
Ver nesta pasta todas as comunicações associadas ao processo de onboarding para qualquer questão sobre o que é a tarefa:

[FID – CFT Team - 04. Processo de onboarding de prestadores - All Documents](https://fidelidadept.sharepoint.com/sites/msteams_c3504d/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fmsteams%5Fc3504d%2FShared%20Documents%2F03%2E%20CFT%20Transformation%2F03%2E%20FIXO%2FIV%20%2D%20Operations%2FB%20%2D%20Processes%2FB%2E2%20%2D%20Providers%2F04%2E%20Processo%20de%20onboarding%20de%20prestadores&viewid=d7060f83%2Df256%2D4d8f%2Db706%2D7685fcab36ff&csf=1&web=1&e=6x3h6V&ovuser=b27f00d3%2D6ccb%2D4240%2Db5d0%2D56729544887e%2Csofia%2Eamaral%2Ebrites%40fidelidade%2Ept&OR=Teams%2DHL&CT=1764860361336&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI0OS8yNTExMDIwMjMxNSIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D&CID=cdc0dfa1%2D6041%2De000%2Dad34%2D7f516841e6b2&cidOR=SPO&FolderCTID=0x012000555A05CA54C82A46959248FDA3F6E3A4)

Neste documento conseguimos ver tudo com maior detalhe: 00. V2 Processo Onboarding Prestadores_2025.12.04

| # ETAPA | ETAPA | # TAREFA | TAREFA | OWNER | PRAZO | NOTAS |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POR CONTACTAR | 1 | Enviar email #2 + anexo | Yola | 48h | Após contacto enviar email no máximo 24h depois, caso não seja possível o contacto telefónico, enviar email. Há template para email após contacto e sem contacto. É enviado o formulário de informações  [ainda por rever] |
| 1 | POR CONTACTAR | 2 | Ligar | Yola | 48h | Enviar reminder automático ao parceiro que ainda não respondeu - Email reminder #2.2
Se prestador relevante - LIGAR
Se prestador não responde passado x dias (a definir) passa a Abandonado com o motivo certo |
| 2 | CONTACTADOS / AGUARDA INFO | 3 | Analisar resposta | Yola | 72h | Se interessado - avança com tabela de custos
Se não interessado - clicar em abandonado com o motivo correto |
| 2 | CONTACTADOS / AGUARDA INFO | 4 | Enviar preçário | Yola | TBD | Email #3 |
| 2 | CONTACTADOS / AGUARDA INFO | 5 | Avaliar interesse do parceiro | Yola | TBD | Se o parceiro responder com interesse |
| 3 | AGUARDA REUNIÃO | 6 | Marcar reunião Teams | Yola | TBD | Email #4 |
| 3A | REUNIÃO MARCADA | 7 | Realizar reunião | Yola | TBD | Script da reunião |
| 4 | APRESENTAR AO COMITÉ (RICARDO) | 8 | Decisão GO / NO GO | Ricardo | TBD | * se for NO GO vai para os abondonados  |
| 5 |  AGUARDA DOCUMENTAÇÃO/APÓLICE | 9 | Pedir informação final (documentação) | Yola | TBD | Email #5 |
| 5 |  AGUARDA DOCUMENTAÇÃO/APÓLICE | 10 | Receber informação | Yola | TBD |  |
| 6 | EM FORMAÇÃO | 11 | Criar prestador BO + colocar ficha | Ricardo | TBD |  |
| 6 | EM FORMAÇÃO | 12 | Enviar email de acesso à AP, formação e merch | Ricardo | TBD | Enviar email #6.1 |
| 7 | AGUARDA RESPOSTA QUIZ | 13 | Receber resposta do Quiz | Yola | TBD | Integrar no CRM |
| 7 | AGUARDA RESPOSTA QUIZ | 14 | Receber pedido de merch | Yola | TBD | Integrar no CRM |
| 7 | AGUARDA RESPOSTA QUIZ | 15 | Receber resposta ao email #6 | Yola | TBD | Integrar no CRM |
| 8 | ENVIAR  MATERIAIS | 16 | Enviar materiais | Ops | TBD | *enviar mail 6.2 ( quizz materiais) |
| 8 | ENVIAR  MATERIAIS | 17 | Confirmar receção dos materiais | Yola | TBD |  |
| 9 | CRIAR FICHA ERP | 18 | Criar ficha ERP | Yola | TBD |  |
| 10 | ALINHAMENTO PRÉ-LAUNCH | 19 | Alinhamento da data de entrada + resposta a dúvidas | Yola | TBD | A tarefa 18 pode ser feito ao mesmo tempo da 16, caso o prestador ligue |
| 10 | ALINHAMENTO PRÉ-LAUNCH | 20 | Enviar email de launch | Yola | TBD | Email #8 |
| 10 | ALINHAMENTO PRÉ-LAUNCH | 21 | Atribuir serviços, quotas e custos | Ricardo | TBD |  |
| 10 | ALINHAMENTO PRÉ-LAUNCH | 22 | Colocar data da entrada | Ricardo | TBD |  |
| 11 | ACOMPANHAMENTO | 23 | Contacto pós-launch | Yola | 7-10 dias | 7 a 10 dias após entrada na rede, contactar o prestador |

### 2. Estrutura interna do card (vista detalhada)

### 2.1. Cabeçalho do prestador

- Nome + Tipo de Entidade
- Owner principal (editável)
- Tipo de onboarding (Normal/Urgente)
- Etapa atual (ex.: “Etapa 2 – CONTACTADOS / AGUARDA INFO”)
- Zona(s)
- Serviços

### 2.2. Stepper da etapa (tarefas) - como no CRM de inovação

- Dentro da **etapa atual**, queremos um **stepper apenas com as tarefas dessa etapa**, por ordem
- O stepper mostra a sequência de tarefas definidas para a etapa atual (ex.: etapa 2 → tarefas 3, 4, 5)
- Abaixo do stepper, uma **lista detalhada das tarefas**, em modo checklist, com:
    - `Owner da tarefa` (editável; valor por defeito vem das definições)
    - `Prazo` (data limite) – preenchido automaticamente, mas ajustável
    - `Estado` (por fazer, em curso, concluída)
    - (Idealmente) mini-ações internas, ex.: Botão “Gerar documento de preçário para este prestador”.
- Quando a **última tarefa da etapa** é marcada como concluída:
    - O card avança automaticamente para a **próxima etapa**
    - O stepper passa a mostrar as tarefas da nova etapa
    - Registar no Histórico:
        - “Prestador passou da Etapa X para Etapa Y – data/hora – utilizador”
- Deve existir uma forma de consultar também as **tarefas das outras etapas** (por ex. numa secção “Todas as tarefas” em modo read-only), para histórico

### 2.3. Notas e Histórico

Criar 2 tabs:

1. **Tab “Notas”**
    - Notas livres sobre o prestador, independentemente da etapa mas com dropdown podiamos referenciar a tarefa e essa nota aparecer na tarefa (?).
2. **Tab “Histórico / Log”**
    - Log automático (só leitura) com:
        - Mudança de etapa
        - Tarefas concluídas / reabertas
        - Alteração de owner principal
        - Alteração de owner de tarefa
        - Alteração de prazos (antes/depois)
        - Reagendamentos
        - Registo de notas

### 3. Lógica de tarefas, prazos e owners

### 3.1. Definição das tarefas (zona global)

Na **zona de definições globais**, para cada tarefa definimos:

- Etapa a que pertence
- Nome da tarefa
- Owner
- Prazo padrão (ex.: 48h, 72h, 7–10 dias)
- Tipo de alerta (ex.: alerta 24h antes do prazo)

### 3.2. Owners

- **Owner principal do prestador:**
    - Por defeito, é quem colocou o prestador no processo de onboarding
    - Pode ser alterado (ex.: redistribuição de carga, férias)
- **Owner da tarefa:**
    - Por defeito, vem da definição global dessa tarefa
    - Pode ser alterado no card, para aquele prestador específico
    - Todas as alterações ficam registadas em Histórico

### 3.3. Prazos

- Ao iniciar o onboarding de um prestador:
    - O sistema atribui a cada tarefa um **prazo padrão** com base:
        - Na tarefa
        - No tipo de onboarding (Normal / Urgente), se aplicável
- Esses prazos:
    - Alimentam:
        - A data limite que aparece no card
        - A **Agenda** do utilizador
- O utilizador pode **reagendar**:
    - Alterar o prazo de uma tarefa para aquele prestador
    - (Idealmente) indicar o motivo
- Cada alteração de prazo gera registo em Histórico:
    - Prazo antigo
    - Prazo novo
    - Utilizador
    - Data/hora
    - Motivo (se houver)

### 3.4. Zona de definições globais

Página “Definições de Onboarding” com:

- Prazos padrão por tarefa (Normal vs Urgente)
- Parâmetros de alertas:
    - Quantas horas antes gerar alerta (ex.: 24h)
    - Quantos dias sem update definem “tarefa parada”
- Log de alterações às definições:
    - Quem alterou
    - O que alterou
    - Quando

Alterações:

- Aplicam-se a **novos prestadores / novas tarefas**
- Não alteram automaticamente o histórico dos prestadores já em curso

### 4. Alertas e notificações

Alertas são **baseados apenas nos prazos das tarefas**

Tipos de alerta:

1. **Prazo a expirar**
    - Quando faltar X horas (ex.: 24h) para o prazo de uma tarefa
        - O owner dessa tarefa recebe um alerta (tipo a definir: notificação interna/email)
    - A tarefa pode aparecer destacada na Agenda (ex.: cor diferente)
2. **Tarefa parada**
    - Se uma tarefa estiver em estado “por fazer” ou “em curso” e **sem alterações** há mais de X dias (parametrizável):
        - O card ganha uma marca visual (ex.: ícone “Em risco”)
        - Opcional: enviar também alerta ao owner

## **Visão Agenda**

Cada utilizador (Yola, Ricardo, Ops) deve ter uma **vista “Agenda”** onde vê:

- Todas as **tarefas onde é owner**:
    - Em vista semanal (e eventualmente diária)
    - Com:
        - Prestador
        - Tarefa
        - Etapa
        - Prazo
        - Estado (por fazer / em atraso / concluída)
        - Indicadores de alerta (prazo a expirar, em risco) - podem ser cores

A Agenda é o **painel de controlo diário** do gestor:

- Lista do que tem para fazer
- Sinalização das tarefas mais urgentes
- Acesso rápido ao card do prestador