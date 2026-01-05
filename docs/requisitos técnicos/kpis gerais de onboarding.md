## **🧩 Descrição:**

Este módulo é uma **zona de dashboards/KPIs** focada no **pipeline de candidaturas e onboarding**, para dar visibilidade global ao estado da operação.

A ideia é ter uma visão rápida para perguntas como:

- Quantos prestadores temos em cada etapa?
- Quanto tempo estamos a demorar, em média, do início ao fim do onboarding?
- Quanta “massa” de prestadores está em onboarding vs só em candidatura?

Deve ser possível filtrar por períodos de tempo e, idealmente, por alguns atributos (zona, tipo de prestador, etc.), mas o core inicial são os KPIs base

## **⚙️ Requisitos técnicos:**

### 1. Estrutura da página

- Página com 1 ou mais “blocos” de KPIs.
- Filtros gerais sugeridos:
    - Período (Data de candidatura / Data de entrada no onboarding).
    - Tipo de parceiro (Técnico / ENI / Empresa).
    - Zona (opcional, se for simples puxar).
    - Tipo de Onboarding (Normal / Urgente).

---

### 2. KPIs principais (primeira versão)

1. **# de prestadores em cada etapa**
    - Contagem atual de prestadores por coluna do Kanban:
        - Ex.: 10 em POR CONTACTAR, 7 em AGUARDA REUNIÃO, 3 em ACOMPANHAMENTO, etc.
    - Idealmente em formato:
        - Gráfico de barras ou simples cards “Etapa X – N prestadores”.
2. **Tempo médio entre início e fim de onboarding**
    - Definição:
        - Início: data em que o prestador entra na primeira etapa do onboarding.
        - Fim: data de conclusão da última tarefa (Tarefa 23) ou entrada na Gestão de Prestadores como `Ativo`.
    - KPI:
        - Média em dias entre início e fim.
    - Possíveis extensões futuras:
        - Mediana.
        - Distribuição por tipo de onboarding (Normal vs Urgente).
        - Ver “tempo médio por etapa” (para perceber gargalos).
3. **# de prestadores em onboarding (geral)**
    - Quantos prestadores se encontram **em qualquer etapa do Kanban de onboarding**, no momento
    - Pode ser:
        - Número total
        - Eventualmente dividido por Normal vs Urgente.
4. **# de prestadores em candidatura**
    - Quantos prestadores estão ainda na **página Candidaturas** (não enviados para onboarding, não abandonados ou apenas “aguardam decisão”)
    - Este KPI ajuda a ver:
        - Se há “engarrafamento” antes do onboarding (candidaturas por tratar

---

### 3. Ideias de evolução (não fechar demasiado agora)

Deixar registadas algumas ideias para fases seguintes:

- **Funil completo**:
- # de Candidaturas recebidas → # Em onboarding → # Ativos → % conversão
- **Média de tempo por etapa**:
    - Onde é que o onboarding está a “encravar” (ex.: AGUARDA DOCUMENTAÇÃO, REUNIÃO MARCADA, etc.)
- **Comparação Normal vs Urgente**:
    - Ver se o onboarding urgente está de facto mais rápido
- **Performance por owner**:
    - Quantos prestadores em onboarding por owner
    - Tempos médios por owner (apenas se fizer sentido, cuidado para não virar “ferramenta de polícia” sem combinar internamente)