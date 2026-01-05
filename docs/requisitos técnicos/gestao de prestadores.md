# **🧩 Descrição:**

Este módulo representa a **gestão contínua da relação com os prestadores**, após a conclusão do onboarding.

Aqui deixamos de olhar para o prestador como “candidato” e passamos a vê-lo como:

- **Elemento ativo da rede FIXO** (com ficha, preços, serviços atribuídos, zona de atuação, etc.).
- Alguém com quem vamos **ajustando a relação ao longo do tempo** (negociação de preços, suspensão/reativação, alteração de serviços, notas de performance, etc.).

A página deve permitir:

- Consultar a **ficha completa do prestador**.
- Gerir **estado** (Ativo, Suspenso, Abandonado, etc.).
- Ver e editar **serviços atribuídos** e respetiva **tabela de preços**.
- Ter acesso rápido a **notas**, **histórico** e informação relevante para a operação.
- Apoiar decisões de **reforço de rede** (ver quem temos em cada zona/serviço e onde há gaps).

É um módulo mais estratégico e de longo prazo, não tanto processual como o onboarding.

# **⚙️ Requisitos técnicos:**

## 

### 1. Lista de prestadores

- Vista principal tipo **tabela/lista**, com filtros.
- Cada linha = **1 prestador** que já passou o onboarding.
- Campos principais a mostrar:
    - Nome do prestador.
    - Tipo de entidade (Técnico / ENI / Empresa).
    - Zona(s) de atuação.
    - Serviços principais.
    - Estado (Ativo / Suspenso / Abandonado / Em revisão).
    - Owner da relação (quem é responsável por este prestador no dia a dia, se fizer sentido).
- Filtros típicos:
    - Zona, serviços, estado, tipo de entidade.
    - (Futuro) indicadores de performance ou qualidade, se forem criados.

Ao clicar num prestador, abre-se a **ficha detalhada**.

---

### 2. Ficha do prestador

A ficha deve ser organizada por **tabs/ secções**. Sugestão:

1. **Resumo / Perfil**
2. **Serviços & Tabela de Preços**
3. **Notas & Relacionamento**
4. **Histórico**
5. (Opcional futuro) **Indicadores de performance**

### 2.1. Resumo / Perfil

- Dados base (muitos vindos de Candidaturas/Onboarding):
    - Nome, tipo de entidade.
    - NIF.
    - Contactos (email, telefone).
    - Zona(s) de atuação.
    - Tipos de serviços que presta.
    - Nº de técnicos (se aplicável).
    - Tem equipa administrativa? (Sim/Não).
    - Tem transporte próprio? (Sim/Não).
    - Horário laboral.
- Dados administrativos:
    - IBAN.
    - Comprovativo de atividade aberta (incluindo link/documento).
- Estado atual do prestador:
    - Ativo / Suspenso / Abandonado (com motivos).
    - Data de entrada na rede.
    - Data de suspensão/abandono (se aplicável).

> Ideia futura: ter aqui também uma pequena “health badge” (ex.: Estável, Pouco ativo, Em risco), com base em regras que venham a ser definidas.
> 

---

### 2.2. Serviços & Tabela de Preços

Esta secção foca-se na **relação económica** com o prestador.

- Cada prestador tem:
    - Lista de serviços que pode fazer.
    - Para cada serviço:
        - Preço acordado (para FIXO).
        - (Se fizer sentido) custo vs preço cliente.
        - Data de início de vigência.
- Deve existir uma **“tabela de referência FIXO”** (global) com preços por serviço:
    - Usada como base para criar propostas iniciais.
    - Usada para comparar preços do prestador vs referência.

Funcionalidades desejadas (alto nível):

- **Proposta inicial automática:**
    - Quando o prestador entra em Gestão de Prestadores:
        - Criar automaticamente uma proposta/tabela de preços com base na tabela de referência + serviços que queremos que ele faça.
- **Snapshots de tabela:**
    - Sempre que há uma alteração relevante de preços:
        - Guardar um “snapshot” da tabela anterior.
        - Permitir ver “Tabela atual” vs “Tabelas anteriores”.
- **Alertas de desvio de preços:**
    - Se os preços deste prestador forem muito diferentes da tabela de referência (parâmetros a definir, ex.: >20% acima ou abaixo):
        - Sinalizar visualmente (ex.: ícone de alerta ao lado do serviço).
        - Eventualmente criar um “flag” ao nível do prestador: “Rever tabela de preços”.

---

### 2.3. Notas & Relacionamento

Tab focada na “memória” da relação.

- Notas livres sobre:
    - Como é trabalhar com o prestador.
    - Pontos fortes/fracos.
    - Feedback de clientes (se for registado aqui).
    - Combinações específicas (ex.: “Só aceita urgências até às 20h”, “Muito forte em Lisboa centro, fraco disponibilidade em fins de semana”).
- Cada nota deve ter:
    - Data.
    - Autor.
    - Texto.
    - (Opcional) Tag de tipo de nota (operacional, comercial, qualidade, etc.).

> Ideia futura: poder associar algumas notas a “alertas” temporários (ex.: “Indisponível em agosto”).
> 

---

### 2.4. Histórico

- Histórico consolidado da relação, incluindo:
    - Data de entrada na rede (vinda do onboarding).
    - Alterações de estado (Ativo → Suspenso → Ativo, etc.).
    - Alterações relevantes na tabela de preços (ex.: “Renegociação 2026”).
    - Alteração de owner da relação (se existir esse campo).
- Apenas leitura, ordenado do mais recente para o mais antigo.

---

### 2.5. Necessidades de rede & matching (ideia mais macro)

Este ponto pode estar aqui ou numa página futura específica, mas faz sentido introduzir:

- **Zona de “necessidades da rede”** onde o gestor define:
    - Tipo de serviço.
    - Zona.
    - Urgência.
- E o CRM ajuda a:
    - Ver rapidamente **que prestadores existentes** podem reforçar essa zona.
    - Ver se há **lacunas** claras (zonas sem prestadores para certo serviço).

> Isto não tem de estar 100% especificado agora – pode ser apenas registado como “capacidade futura desejada”: usar a gestão de prestadores como base para análise de cobertura e planeamento de reforços.
>