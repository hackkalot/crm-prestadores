# Fluxo de Formulários de Prestadores

Este diagrama detalha o sistema de envio, preenchimento e processamento de formulários de prestadores.

> **Documentação completa:** [02-FLUXOS-NEGOCIO.md](../../02-FLUXOS-NEGOCIO.md#formulários-de-prestadores)

---

## Visão Geral: Ciclo Completo

```mermaid
flowchart TB
    subgraph crm ["🖥️ CRM (Admin)"]
        admin["👤 Relationship Manager"]
        detail["Página Detalhe<br/>Prestador"]
        copy["📋 Copiar Link<br/>do Formulário"]
    end

    subgraph send ["📤 Envio Manual"]
        email["✉️ Email"]
        whatsapp["💬 WhatsApp"]
        sms["📱 SMS"]
    end

    subgraph public ["🌐 Formulário Público"]
        form["📝 Wizard 7 Passos<br/>/forms/services/{token}"]
        submit["✅ Submeter"]
    end

    subgraph backend ["⚙️ Processamento"]
        validate["Validar Token"]
        snapshot["Criar Snapshot<br/>Histórico"]
        update["Actualizar<br/>Prestador"]
        log["Registar<br/>Evento"]
    end

    subgraph result ["📊 Resultado"]
        success["Página Sucesso<br/>Confirmação"]
        view["Ver Submissões<br/>no CRM"]
    end

    admin --> detail
    detail --> copy
    copy -->|"Gera token único"| send

    email --> form
    whatsapp --> form
    sms --> form

    form --> submit
    submit --> validate
    validate --> snapshot
    validate --> update
    validate --> log

    snapshot --> success
    update --> success
    log --> success

    success -.->|"Próxima vez"| view

    classDef crmStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef sendStyle fill:#fff8e1,stroke:#f9a825,stroke-width:1px
    classDef publicStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef backendStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef resultStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class admin,detail,copy crmStyle
    class email,whatsapp,sms sendStyle
    class form,submit publicStyle
    class validate,snapshot,update,log backendStyle
    class success,view resultStyle
```

---

## Geração do Link (Token)

```mermaid
flowchart LR
    subgraph trigger ["🖱️ Trigger"]
        click["Admin clica<br/>'Copiar Link'"]
    end

    subgraph generate ["⚙️ generateFormsToken()"]
        create["Criar string:<br/>providerId:timestamp"]
        encode["Codificar em<br/>Base64 URL-safe"]
        store["Guardar token<br/>em providers.forms_token"]
    end

    subgraph output ["📋 Output"]
        url["URL completo:<br/>/forms/services/{token}"]
        clipboard["Copiar para<br/>Clipboard"]
    end

    click --> create
    create --> encode
    encode --> store
    store --> url
    url --> clipboard

    classDef triggerStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef generateStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef outputStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class click triggerStyle
    class create,encode,store generateStyle
    class url,clipboard outputStyle
```

### Formato do Token

```
providerId:timestamp → Base64 URL-safe
Exemplo: "abc-123-uuid:1705929600000" → "YWJjLTEyMy11dWlkOjE3MDU5Mjk2MDAwMDA"
```

---

## Wizard de 7 Passos

```mermaid
flowchart TB
    subgraph wizard ["📝 Formulário de Serviços"]
        s1["1️⃣ Dados Prestador<br/>Nome, Email, Telefone, NIF"]
        s2["2️⃣ Documentação<br/>Seguros, Certificações, Plataformas"]
        s3["3️⃣ Disponibilidade<br/>Dias, Horário, Nº Técnicos"]
        s4["4️⃣ Recursos<br/>Transporte, Computador, Equipamento"]
        s5["5️⃣ Serviços<br/>Selecção por Cluster/Grupo"]
        s6["6️⃣ Cobertura<br/>Concelhos por Distrito"]
        s7["7️⃣ Revisão<br/>Confirmar Dados"]
    end

    s1 -->|"Next"| s2
    s2 -->|"Next"| s3
    s3 -->|"Next"| s4
    s4 -->|"Next"| s5
    s5 -->|"Next"| s6
    s6 -->|"Next"| s7

    s7 -->|"Submeter"| done["✅ Enviado"]

    classDef stepStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px
    classDef doneStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class s1,s2,s3,s4,s5,s6,s7 stepStyle
    class done doneStyle
```

---

## Detalhe: Cada Passo do Formulário

### Passo 1 - Dados do Prestador

```mermaid
flowchart LR
    subgraph fields ["📝 Campos (editáveis)"]
        name["Nome<br/>(pre-preenchido)"]
        email["Email<br/>(pre-preenchido)"]
        phone["Telefone<br/>(pre-preenchido)"]
        nif["NIF<br/>(pre-preenchido)"]
    end

    subgraph note ["💡 Nota"]
        info["Dados existentes do prestador<br/>são carregados automaticamente"]
    end

    fields --> note

    classDef fieldStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef noteStyle fill:#fff8e1,stroke:#f9a825,stroke-width:1px

    class name,email,phone,nif fieldStyle
    class info noteStyle
```

### Passo 2 - Documentação

```mermaid
flowchart TB
    subgraph insurance ["🛡️ Seguros (checkboxes)"]
        i1["☐ Declaração de Actividade"]
        i2["☐ Seguro Responsabilidade Civil"]
        i3["☐ Seguro Acidentes de Trabalho"]
    end

    subgraph certs ["📜 Certificações (multi-select)"]
        c1["Opções predefinidas +<br/>'Outro' (texto livre)"]
    end

    subgraph platforms ["🔧 Plataformas (multi-select)"]
        p1["Opções predefinidas +<br/>'Outro' (texto livre)"]
    end

    classDef groupStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px

    class i1,i2,i3,c1,p1 groupStyle
```

### Passo 3 - Disponibilidade

```mermaid
flowchart LR
    subgraph days ["📅 Dias da Semana"]
        d["☑️ Segunda<br/>☑️ Terça<br/>☑️ Quarta<br/>☑️ Quinta<br/>☑️ Sexta<br/>☐ Sábado<br/>☐ Domingo"]
    end

    subgraph hours ["🕐 Horário"]
        h1["Início: 09:00"]
        h2["Fim: 18:00"]
    end

    subgraph team ["👥 Equipa"]
        t["Nº Técnicos: 2"]
    end

    classDef groupStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:1px

    class d,h1,h2,t groupStyle
```

### Passo 4 - Recursos

```mermaid
flowchart LR
    subgraph resources ["🔧 Recursos"]
        r1["☑️ Transporte próprio"]
        r2["☑️ Computador"]
        r3["Equipamento próprio:<br/>(multi-select + 'Outro')"]
    end

    classDef resourceStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px

    class r1,r2,r3 resourceStyle
```

### Passo 5 - Serviços (Selecção Hierárquica)

```mermaid
flowchart TB
    subgraph hierarchy ["🏗️ Estrutura de Serviços"]
        cluster["📁 Cluster<br/>(ex: Reparações)"]
        group["📂 Grupo de Serviços<br/>(ex: Electrodomésticos)"]
        service["📄 Serviço<br/>(ex: Reparar Máquina Lavar)"]
    end

    subgraph selection ["✅ Selecção"]
        multi["Multi-select<br/>com checkboxes"]
        expand["Expandir/colapsar<br/>grupos"]
    end

    cluster --> group
    group --> service
    service --> multi

    classDef hierarchyStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
    classDef selectionStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class cluster,group,service hierarchyStyle
    class multi,expand selectionStyle
```

### Passo 6 - Cobertura Geográfica

```mermaid
flowchart TB
    subgraph geo ["🗺️ Selecção Geográfica"]
        district["📍 Distrito<br/>(ex: Lisboa)"]
        concelho["🏘️ Concelhos<br/>(ex: Lisboa, Cascais, Sintra)"]
    end

    subgraph features ["⚡ Features"]
        search["🔍 Pesquisa<br/>por nome"]
        selectAll["☑️ Seleccionar<br/>todos do distrito"]
        expand["📂 Expandir<br/>distrito"]
    end

    district --> concelho
    concelho --> features

    classDef geoStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    classDef featureStyle fill:#fff8e1,stroke:#f9a825,stroke-width:1px

    class district,concelho geoStyle
    class search,selectAll,expand featureStyle
```

### Passo 7 - Revisão

```mermaid
flowchart TB
    subgraph review ["📋 Revisão Final"]
        readonly["Todos os dados<br/>em modo leitura"]
        sections["Organizado por<br/>secções do wizard"]
    end

    subgraph actions ["⚡ Acções"]
        back["⬅️ Voltar atrás<br/>para editar"]
        submit["✅ Confirmar<br/>e Submeter"]
    end

    review --> actions

    classDef reviewStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px
    classDef actionStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class readonly,sections reviewStyle
    class back,submit actionStyle
```

---

## Processamento da Submissão

```mermaid
sequenceDiagram
    autonumber
    participant P as 👤 Prestador
    participant F as 📝 Formulário
    participant A as ⚙️ Server Action
    participant DB as 🗄️ Database

    P->>F: Preenche wizard (7 passos)
    P->>F: Clica "Submeter"

    F->>A: submitServicesForm(token, data, ip)

    A->>DB: SELECT WHERE forms_token = token
    DB-->>A: provider_id (validado)

    Note over A: Calcular submission_number

    A->>DB: SELECT MAX(submission_number)<br/>FROM provider_forms_data<br/>WHERE provider_id = ?
    DB-->>A: current_max (ex: 2)

    par Operações Paralelas
        A->>DB: INSERT provider_forms_data<br/>(snapshot histórico #3)
    and
        A->>DB: UPDATE providers<br/>(dados actuais)
    and
        A->>DB: INSERT history_log<br/>(event: forms_submission)
    end

    DB-->>A: Success

    A-->>F: { success: true }
    F-->>P: ✅ Página de Confirmação
```

---

## Armazenamento Dual

```mermaid
flowchart TB
    subgraph submission ["📝 Submissão"]
        data["Dados do<br/>Formulário"]
    end

    subgraph storage ["🗄️ Armazenamento"]
        subgraph snapshot ["📸 provider_forms_data"]
            s1["Snapshot imutável"]
            s2["submission_number: 1, 2, 3..."]
            s3["Histórico completo"]
            s4["Para auditoria"]
        end

        subgraph current ["📝 providers"]
            c1["Versão actual"]
            c2["Editável no CRM"]
            c3["Sempre atualizada"]
            c4["Para operações"]
        end
    end

    data --> snapshot
    data --> current

    classDef submissionStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef snapshotStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef currentStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:1px

    class data submissionStyle
    class s1,s2,s3,s4 snapshotStyle
    class c1,c2,c3,c4 currentStyle
```

### Porquê Armazenamento Dual?

| Tabela | Propósito | Mutável? |
|--------|-----------|----------|
| `provider_forms_data` | Registo histórico de cada submissão | ❌ Não (snapshot) |
| `providers` | Dados actuais do prestador | ✅ Sim (editável) |

**Benefícios:**
- 📜 **Auditoria** - Saber exactamente o que foi submetido e quando
- 🔄 **Múltiplas submissões** - Prestador pode actualizar dados várias vezes
- ✏️ **Flexibilidade** - Admin pode corrigir dados actuais sem perder histórico

---

## Visualização no CRM

```mermaid
flowchart TB
    subgraph tab ["📊 Tab 'Submissões'"]
        table["Tabela de Histórico"]
        columns["Colunas:<br/>#, Data, IP, Documentação,<br/>Certificações, Plataformas,<br/>Disponibilidade, Recursos,<br/>Serviços, Cobertura"]
    end

    subgraph details ["🔍 Detalhes (click)"]
        services["Lista de Serviços<br/>(agrupados por cluster)"]
        coverage["Lista de Concelhos<br/>(por distrito)"]
    end

    subgraph actions ["⚡ Acções"]
        copy["📋 Copiar Link<br/>(gerar novo token)"]
        latest["Submissão mais<br/>recente destacada"]
    end

    table --> columns
    columns -->|"Click célula"| details
    tab --> actions

    classDef tabStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef detailStyle fill:#f5f5f5,stroke:#616161,stroke-width:1px
    classDef actionStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class table,columns tabStyle
    class services,coverage detailStyle
    class copy,latest actionStyle
```

---

## Ciclo de Re-submissão

```mermaid
stateDiagram-v2
    [*] --> SemSubmissao: Prestador criado

    SemSubmissao --> LinkGerado: Admin gera link
    LinkGerado --> FormularioEnviado: Admin envia link

    FormularioEnviado --> Preenchido: Prestador preenche
    Preenchido --> Submetido: Prestador submete

    Submetido --> FormularioEnviado: Admin pede actualização
    Submetido --> [*]: Processo completo

    note right of LinkGerado
        Token único gerado
        Link válido indefinidamente
    end note

    note right of Submetido
        Snapshot #N criado
        Dados actuais actualizados
    end note
```

---

## Dados Guardados

### Campos do Formulário

| Secção | Campos |
|--------|--------|
| **Dados** | nome, email, telefone, NIF |
| **Documentação** | 3 seguros, certificações[], plataformas[] |
| **Disponibilidade** | dias_semana[], hora_início, hora_fim, num_técnicos |
| **Recursos** | transporte_próprio, computador, equipamento[] |
| **Serviços** | selected_services[] (UUIDs) |
| **Cobertura** | coverage_municipalities[] (nomes) |

### Metadados da Submissão

| Campo | Descrição |
|-------|-----------|
| `submission_number` | Número sequencial (1, 2, 3...) |
| `submitted_at` | Data/hora da submissão |
| `submitted_ip` | Endereço IP do prestador |

---

## Código Relacionado

| Ficheiro | Função |
|----------|--------|
| `app/forms/services/[token]/page.tsx` | Página pública do formulário |
| `app/forms/services/[token]/services-form-client.tsx` | Wizard de 7 passos |
| `lib/forms/services-actions.ts` | `generateFormsToken()`, `submitServicesForm()` |
| `components/forms/services-selector.tsx` | Selector de serviços hierárquico |
| `components/forms/coverage-selector.tsx` | Selector de cobertura geográfica |
| `components/providers/tabs/submissoes-tab.tsx` | Tab de visualização no CRM |

---

## Documentos Relacionados

- [02-FLUXOS-NEGOCIO.md](../../02-FLUXOS-NEGOCIO.md) - Fluxos de negócio principais
- [provider-lifecycle.md](./provider-lifecycle.md) - Ciclo de vida do prestador
- [03-BASE-DADOS.md](../../03-BASE-DADOS.md) - Schema das tabelas

---

*Última actualização: Janeiro 2026*
