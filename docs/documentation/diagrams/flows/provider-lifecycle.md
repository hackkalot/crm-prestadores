# Ciclo de Vida do Prestador

Este diagrama mostra os estados possíveis de um prestador e as transições entre eles.

---

## State Machine

```mermaid
stateDiagram-v2
    [*] --> novo: Candidatura criada

    novo --> em_onboarding: Iniciar onboarding
    novo --> abandonado: Desistência

    em_onboarding --> ativo: Onboarding completo
    em_onboarding --> abandonado: Desistência
    em_onboarding --> suspenso: Problema identificado

    ativo --> suspenso: Suspender
    ativo --> abandonado: Terminar colaboração

    suspenso --> ativo: Reactivar
    suspenso --> abandonado: Terminar definitivamente

    abandonado --> novo: Reabrir candidatura
```

---

## Flowchart Detalhado

```mermaid
flowchart TB
    subgraph entrada ["📥 Entrada"]
        hubspot["HubSpot Webhook"]
        manual["Criação Manual"]
        csv["Import CSV"]
    end

    subgraph novo_state ["🆕 Estado: NOVO"]
        novo["Candidatura<br/>status: novo"]
        duplicado{"Duplicado?"}
        merge["Merge com existente"]
    end

    subgraph onboarding_state ["🔄 Estado: EM_ONBOARDING"]
        onboarding["Card no Kanban<br/>status: em_onboarding"]
        etapa1["Etapa 1: Contacto Inicial"]
        etapa2["Etapa 2: Documentação"]
        etapa3["Etapa 3: Formação"]
        etapa4["Etapa 4: Configuração"]
        etapa5["Etapa 5: Teste"]
        etapa6["Etapa 6: Go-Live"]
    end

    subgraph ativo_state ["✅ Estado: ATIVO"]
        ativo["Prestador Activo<br/>status: ativo"]
        trabalhos["Recebe pedidos<br/>de serviço"]
        precos["Preços definidos"]
        cobertura["Cobertura definida"]
    end

    subgraph suspenso_state ["⏸️ Estado: SUSPENSO"]
        suspenso["Prestador Suspenso<br/>status: suspenso"]
        motivo["Motivo registado"]
    end

    subgraph abandonado_state ["❌ Estado: ABANDONADO"]
        abandonado["Candidatura Abandonada<br/>status: abandonado"]
    end

    %% Entrada
    hubspot --> novo
    manual --> novo
    csv --> novo

    %% Novo
    novo --> duplicado
    duplicado -->|Sim| merge
    duplicado -->|Não| onboarding
    merge --> onboarding

    %% Onboarding
    onboarding --> etapa1
    etapa1 --> etapa2
    etapa2 --> etapa3
    etapa3 --> etapa4
    etapa4 --> etapa5
    etapa5 --> etapa6
    etapa6 --> ativo

    %% Ativo
    ativo --> trabalhos
    ativo --> precos
    ativo --> cobertura

    %% Transições negativas
    onboarding -.->|"Desistência"| abandonado
    ativo -.->|"Problema"| suspenso
    suspenso -.->|"Reactivar"| ativo
    suspenso -.->|"Terminar"| abandonado
    abandonado -.->|"Reabrir"| novo

    %% Styles
    classDef novoStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef onboardingStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef ativoStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef suspensoStyle fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    classDef abandonadoStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class novo,duplicado,merge novoStyle
    class onboarding,etapa1,etapa2,etapa3,etapa4,etapa5,etapa6 onboardingStyle
    class ativo,trabalhos,precos,cobertura ativoStyle
    class suspenso,motivo suspensoStyle
    class abandonado abandonadoStyle
```

---

## Tabela de Estados

| Estado | Descrição | Cor | Acções Possíveis |
|--------|-----------|-----|------------------|
| **novo** | Candidatura recebida, aguarda triagem | 🔵 Azul | Iniciar onboarding, Abandonar |
| **em_onboarding** | Em processo de integração (6 etapas) | 🟠 Laranja | Avançar etapa, Suspender, Abandonar |
| **ativo** | Pronto para receber trabalhos | 🟢 Verde | Suspender, Terminar |
| **suspenso** | Temporariamente inactivo | 🟡 Amarelo | Reactivar, Terminar |
| **abandonado** | Processo terminado/desistência | 🔴 Vermelho | Reabrir |

---

## Transições Permitidas

```mermaid
flowchart LR
    subgraph transitions ["Transições Válidas"]
        n[novo] -->|"startOnboarding()"| o[em_onboarding]
        n -->|"abandon()"| a[abandonado]

        o -->|"completeOnboarding()"| at[ativo]
        o -->|"suspend()"| s[suspenso]
        o -->|"abandon()"| a

        at -->|"suspend()"| s
        at -->|"abandon()"| a

        s -->|"reactivate()"| at
        s -->|"abandon()"| a

        a -->|"reopen()"| n
    end

    classDef funcStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px
    class n,o,at,s,a funcStyle
```

---

## Regras de Negócio

### Novo → Em Onboarding
- Verificação de duplicados (email, NIF, nome fuzzy)
- Se duplicado: opção de merge ou criar novo
- Card criado automaticamente no Kanban

### Em Onboarding → Ativo
- Todas as 6 etapas devem estar completas
- Tarefas obrigatórias de cada etapa concluídas
- Preços base definidos
- Pelo menos 1 concelho de cobertura

### Ativo → Suspenso
- Motivo obrigatório
- Registo em `history_log`
- Pedidos em curso mantêm-se (não são cancelados)

### Suspenso → Ativo
- Verificação de documentação válida
- Registo de reactivação em `history_log`

### Qualquer → Abandonado
- Motivo obrigatório
- Soft delete (dados mantidos para histórico)
- Pode ser reaberto se necessário

---

## Código Relacionado

| Ficheiro | Função |
|----------|--------|
| `lib/candidaturas/actions.ts` | `createCandidatura()`, `mergeCandidaturas()` |
| `lib/onboarding/actions.ts` | `startOnboarding()`, `moveCard()`, `updateTask()` |
| `lib/prestadores/actions.ts` | `updateProviderStatus()` |
| `lib/providers/actions.ts` | `getProvider()`, `updateProvider()` |

---

## Documentos Relacionados

- [02-FLUXOS-NEGOCIO.md](../../02-FLUXOS-NEGOCIO.md) - Fluxos detalhados
- [onboarding-pipeline.md](./onboarding-pipeline.md) - Pipeline de onboarding
- [03-BASE-DADOS.md](../../03-BASE-DADOS.md) - Schema da tabela providers

---

*Última actualização: Janeiro 2026*
