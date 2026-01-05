# **🧩 Descrição:**

Este módulo tem como objetivo representar a gestão de candidaturas no CRM.  Cada candidatura corresponde a 1 prestador = 1 card/linha, criada automaticamente a partir do Hubspot.

O objetivo é:

- Centralizar todas as candidaturas recebidas.
- Permitir screening inicial rápido (Enviar para Onboarding / Abandonar).
- Manter histórico de candidaturas repetidas.

Idealmente a visão é em cards, mas pode ser em linhas se for tecnicamente mais simples.

Cada prestador deve ter sempre uma tag de estado principal:

- Novo Prestador
- Em Onboarding (quando já foi enviado)
- Abandonado

# **⚙️ Requisitos técnicos:**

## **Candidatura Recebida**

### 1. Criação automática da candidatura

Através da ligação com Hubspot, temos automaticamente na base de dados do CRM um card (ou uma linha) por prestador com as devidas informações sobre o prestador:

- **Header:** Nome Prestador + Tipo de Entidade
- Email
- Telefone
- Website/redes sociais
- NIF
- Zona de atuação
- Tipo de serviços
- Nº de técnicos (se aplicável)
- Tem equipa administrativa?
- Tem transporte próprio?
- Horário laboral
- Data da candidatura
- # de candidaturas

### 2. Filtros e pesquisa

A listagem de candidaturas deve permitir filtrar e pesquisar por:

- Tipo de parceiro (Técnico / ENI / Empresa)
- Zona de atuação
- Tipo de serviços
- Nº de técnicos
- Estado (Novo / Em Onboarding / Abandonado)
- Data da candidatura (intervalos de datas)

Objetivo: permitir rapidamente responder a necessidades específicas (ex.: “canalizadores no Porto”)

### 3. Deteção e merge de duplicados

- Se um prestador se candidatar mais do que uma vez:
    - O sistema deve **detetar duplicados** com base em:
        - NIF **ou**
        - Email **ou**
        - Telemóvel (regras a definir, por ex: 2 de 3 campos iguais).
- Comportamento desejado:
    - Não criar um novo prestador “independente”, mas sim:
        - **Atualizar o registo existente**, incorporando nova informação relevante.
        - Atualizar o campo **“# de candidaturas”**.
        - Registar um **histórico de candidaturas**, com:
            - Data de cada candidatura
            - Origem (se houver mais do que uma fonte no futuro)

## **Screening Inicial**

Para cada prestador, na página Candidaturas, devem existir **duas ações principais**:

### 1. Enviar para Onboarding

- Botão: **“Enviar para Onboarding”**
    - Ao clicar:
        - O card é enviado para o **Kanban de Onboarding**.
        - O estado do prestador passa para: `Prestador em Onboarding`.
        - A candidatura aparece na lista de candidaturas com filtro mas já com o estado “Em Onboarding”
- Ao enviar, o utilizador escolhe:
    - **Onboarding Normal**
    - **Onboarding Urgente**
        - Este onboarding urgente a diferença será apenas no que toca a prazos e SLAs no Kanban

### 4.2. Abandonar candidatura

- Botão: **“Abandonar”**
- Quando clicado, o utilizador tem de escolher **quem não quer avançar** e o **motivo**:
1. **“Abandonar – parceiro não quer avançar”**
    - Motivos:
        - Não aceita preço
        - Não é oportuno
        - Outros (campo de texto livre)
2. **“Abandonar – FIXO não quer avançar”**
    - Motivos:
        - Parceiro não responde
        - Não se enquadra no perfil
        - Não tem IBAN PT
        - Não tem atividade aberta
        - Outros (campo de texto livre)
- Resultado:
    - Estado do prestador = `Prestador Abandonado`.
    - Fica sempre o **histórico da decisão**:
        - Data de abandono
        - Quem decidiu (utilizador)
        - Tipo de abandono + motivo

# 🧾 Resultado esperado

Na prática, nesta página:

- Ricardo e Yola conseguem ver:
    - Todas as candidaturas vindas do Hubspot.
    - Filtrar conforme necessidades (tipo parceiro, zona, serviços, etc).
- Para cada candidatura, conseguem:
    - Decidir se:
        - **Envia para Onboarding** (normal/urgente)
        - **Abandona** com um motivo claro.
- O sistema:
    - Gere duplicados sem perder histórico
    - Mantém clara a situação atual de cada prestador