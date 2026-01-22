# Prompt para Google NotebookLM - Apresentação CRM Prestadores

## Contexto
Sou desenvolvedor do **CRM Prestadores**, um sistema interno para gestão do ciclo de vida de prestadores de serviços. Preciso de preparar uma apresentação executiva para o meu chefe que cubra toda a documentação técnica do projeto.

## Objetivo da Apresentação
Criar uma **apresentação executiva de 15-20 minutos** que demonstre:
1. O valor de negócio do sistema
2. A arquitetura técnica e decisões tomadas
3. As funcionalidades principais implementadas
4. Os fluxos de trabalho automatizados
5. A segurança e escalabilidade da solução

## Audiência
- **Perfil**: Gestor técnico com conhecimento de desenvolvimento de software
- **Interesse**: Compreender o ROI, a robustez técnica e a manutenibilidade do sistema
- **Tempo disponível**: 15-20 minutos + Q&A

## Documentos Fonte
Analisar toda a documentação em `/docs/documentation`:
- `README.md` - Visão geral e quick start
- `01-ARQUITETURA.md` - Stack tecnológica e decisões de design
- `02-FLUXOS-NEGOCIO.md` - Fluxos de trabalho e regras de negócio
- `03-BASE-DADOS.md` - Schema da base de dados
- `04-INTEGRACOES.md` - Integrações externas (Backoffice, HubSpot, GitHub Actions)
- `05-COMPONENTES.md` - Biblioteca de componentes UI
- `06-DEPLOY.md` - Processo de deployment
- `07-SEGURANCA.md` - Segurança e proteção de dados
- `Analytics/KPIS-ONBOARDING.md` - Sistema de métricas e KPIs

## Estrutura Desejada da Apresentação

### 1. Abertura (2 min)
**Título:** "CRM Prestadores - Sistema de Gestão de Ciclo de Vida"

**Conteúdo:**
- Problema de negócio resolvido
- Objetivos do sistema
- Impacto esperado (redução de tempo, automação, visibilidade)

**Perguntas para o NotebookLM:**
- Qual é o problema de negócio que o CRM Prestadores resolve?
- Quais são os 3 principais benefícios para a organização?
- Que processos manuais foram automatizados?

---

### 2. Visão Geral do Sistema (3 min)
**Título:** "Arquitetura e Stack Tecnológica"

**Conteúdo:**
- Stack tecnológica escolhida (Next.js 16, React 19, Supabase, TypeScript)
- Justificação das escolhas técnicas
- Diagrama de alto nível da arquitetura

**Perguntas para o NotebookLM:**
- Qual é a stack tecnológica completa do sistema?
- Por que foi escolhido Next.js App Router em vez de Pages Router?
- Quais são as vantagens de usar Supabase vs. uma solução tradicional?
- Como está organizada a estrutura de pastas do projeto?

---

### 3. Funcionalidades Core (5 min)
**Título:** "Funcionalidades Principais Implementadas"

**Conteúdo dividido em 6 áreas:**

#### 3.1 Gestão de Candidaturas
- Entrada via HubSpot (webhook) ou manual
- Sistema de detecção de duplicados (email, NIF, fuzzy matching)
- Merge automático e manual

**Perguntas:**
- Como funciona o fluxo de entrada de candidaturas?
- Como é feita a detecção de duplicados?
- Quais são as opções de merge disponíveis?

#### 3.2 Pipeline de Onboarding
- Kanban com 11 etapas configuráveis
- Drag & drop entre etapas
- Sistema de tarefas por etapa
- Tipos: normal vs urgente

**Perguntas:**
- Quantas etapas tem o pipeline de onboarding?
- Como funciona o sistema de tarefas?
- Qual é a diferença entre onboarding normal e urgente?

#### 3.3 Gestão de Prestadores
- Página de detalhe com 8 tabs
- Edição inline de campos
- Gestão de documentos
- Histórico completo de alterações

**Perguntas:**
- Quais são as 8 tabs da página de detalhe do prestador?
- Que informações são editáveis inline?
- Como funciona o sistema de histórico?

#### 3.4 Catálogo de Serviços e Preços
- Gestão centralizada de preços de referência
- Import/Export de Excel
- Edição inline com autocomplete
- 5 clusters de serviços

**Perguntas:**
- Como funciona a gestão do catálogo de serviços?
- Quais são os 5 clusters de serviços?
- Como é feita a importação de preços via Excel?

#### 3.5 Mapa de Cobertura da Rede
- Visualização choropleth de Portugal (308 concelhos)
- Análise de gaps de cobertura
- Matching inteligente de prestadores
- Filtros por tipo de serviço

**Perguntas:**
- Como funciona o mapa de cobertura?
- Como é calculada a capacidade de cobertura por concelho?
- O que são gaps de cobertura e como são identificados?

#### 3.6 Dashboard de KPIs
- 5 KPI cards principais
- 13 gráficos de análise
- Filtros dinâmicos (período, distrito, tipo, RM)
- Exportação de dados

**Perguntas:**
- Quais são os 5 KPIs principais monitorizados?
- Que tipos de análises estão disponíveis nos gráficos?
- Como funcionam os filtros do dashboard?

---

### 4. Integrações e Automações (3 min)
**Título:** "Integrações Externas e Processos Automatizados"

**Conteúdo:**

#### 4.1 Sincronização com Backoffice FIXO
- Scrappers Puppeteer para 4 tipos de dados
- Execução via GitHub Actions (produção)
- Agendamento semanal automático
- Sistema de logs e monitorização

**Perguntas:**
- Quais são os 4 tipos de dados sincronizados do backoffice?
- Por que é usado GitHub Actions em vez de executar no Vercel?
- Como funciona o agendamento das sincronizações?
- Como é feita a monitorização dos syncs?

#### 4.2 Integração HubSpot
- Webhook para criação automática de candidaturas
- Detecção de duplicados em tempo real
- Update de registos existentes

**Perguntas:**
- Como funciona a integração com o HubSpot?
- O que acontece quando chega uma candidatura duplicada via webhook?

#### 4.3 Mapbox
- Visualização de mapas interativos
- GeoJSON otimizado (29MB → 3.2MB)
- Renderização de 308 concelhos

**Perguntas:**
- Como foi otimizado o ficheiro GeoJSON?
- Que funcionalidades do Mapbox são utilizadas?

---

### 5. Segurança e Permissões (2 min)
**Título:** "Segurança, Autenticação e Controlo de Acesso"

**Conteúdo:**
- Sistema de autenticação (Supabase Auth)
- 4 níveis de roles (admin, manager, RM, user)
- Permissões dinâmicas por página
- Row Level Security (RLS) na base de dados
- Auditoria completa de alterações

**Perguntas:**
- Quais são os 4 níveis de roles do sistema?
- Como funciona o sistema de permissões dinâmicas?
- O que é Row Level Security e como é implementado?
- Que tipo de auditoria está implementada?

---

### 6. Base de Dados e Performance (2 min)
**Título:** "Arquitetura de Dados e Otimizações"

**Conteúdo:**
- 30+ tabelas no Supabase
- Tipos gerados automaticamente (TypeScript)
- Índices otimizados para queries frequentes
- Políticas RLS para segurança

**Perguntas:**
- Quantas tabelas principais tem o sistema?
- Como são gerados os tipos TypeScript da base de dados?
- Que otimizações de performance foram implementadas?
- Quais são as tabelas core do sistema?

---

### 7. Deploy e Ambientes (1 min)
**Título:** "Deployment e Ambientes"

**Conteúdo:**
- Vercel para hosting (preview + produção)
- GitHub Actions para CI/CD
- Supabase para base de dados
- Variáveis de ambiente por ambiente

**Perguntas:**
- Onde está hospedado o sistema?
- Como funciona o processo de deployment?
- Quantos ambientes existem (dev, staging, prod)?

---

### 8. Métricas de Sucesso e Próximos Passos (2 min)
**Título:** "Resultados e Roadmap"

**Conteúdo:**
- Métricas de adoção
- Feedback dos utilizadores
- Melhorias planeadas
- Roadmap técnico

**Perguntas:**
- Que melhorias futuras estão documentadas?
- Quais são os principais desafios técnicos identificados?
- Que funcionalidades estão no backlog?

---

## Formato de Output Desejado

Por favor, gera:

1. **Slide Deck Outline** (estrutura de slides com títulos e bullet points)
2. **Script de Apresentação** (texto para narrar cada slide, 1-2 min por slide)
3. **FAQ Técnico** (10 perguntas mais prováveis do chefe com respostas detalhadas)
4. **One-Pager Executivo** (resumo de 1 página com os highlights principais)
5. **Glossário de Termos** (termos técnicos e de negócio que podem precisar de explicação)

## Tom e Estilo

- **Profissional mas acessível**: Evitar jargão excessivo
- **Orientado a resultados**: Focar no valor de negócio, não apenas na tecnologia
- **Baseado em factos**: Usar números e métricas da documentação
- **Confiante**: Destacar decisões técnicas bem fundamentadas
- **Transparente**: Mencionar desafios e como foram resolvidos

## Perguntas Específicas Adicionais

1. Qual é o tempo médio de onboarding de um prestador segundo o sistema de KPIs?
2. Quantas linhas de código tem o projeto aproximadamente?
3. Quais foram as 3 decisões técnicas mais importantes e porquê?
4. Como é garantida a consistência dos dados entre o CRM e o Backoffice FIXO?
5. Qual é a estratégia de backup e disaster recovery?
6. Como é medida a performance do sistema?
7. Que testes estão implementados (unitários, integração, E2E)?
8. Como é feita a gestão de erros e logging?
9. Qual é o plano de escalabilidade para crescimento de utilizadores?
10. Que documentação existe para novos developers que entrem no projeto?

---

## Notas Finais

- Priorizar **clareza** sobre complexidade técnica
- Incluir **exemplos concretos** de fluxos de trabalho
- Destacar **automações** que poupam tempo
- Mencionar **segurança** e **compliance** quando relevante
- Preparar para perguntas sobre **custos** de infraestrutura (Vercel, Supabase, Mapbox)

---

**Instruções para o NotebookLM:**
Analisa toda a documentação fornecida e cria uma apresentação executiva seguindo esta estrutura. Para cada secção, extrai os factos mais relevantes, números concretos, e exemplos práticos. Organiza a informação de forma lógica e progressiva, começando pelo valor de negócio e descendo gradualmente para os detalhes técnicos.
