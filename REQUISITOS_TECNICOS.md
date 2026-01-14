# Requisitos Técnicos - CRM Prestadores

## 1. SISTEMA DE SINCRONIZAÇÃO (Scrappers)

### 1.1 Configuração de Frequência
- **REQ-SYNC-001**: Implementar agendamento semanal para todos os scrappers (via GitHub Actions cron)
- **REQ-SYNC-002**: Adicionar configuração para desativar execuções diárias automáticas
- **REQ-SYNC-003**: Manter opção de execução manual para casos urgentes

### 1.2 Metadados de Sincronização
- **REQ-SYNC-004**: Adicionar campo `last_sync_at` nas tabelas:
  - `service_requests` (última atualização de pedidos)
  - `providers` (última atualização de prestadores)
  - `allocation_history` (última atualização de alocações)
- **REQ-SYNC-005**: Criar componente `LastSyncBadge` para exibir data/hora da última sincronização
- **REQ-SYNC-006**: Exibir último sync nas páginas de Analytics (Pedidos, Faturação, Alocações)

---

## 2. MÓDULO ONBOARDING

### 2.1 Gestão de Preços
- **REQ-ONB-001**: Completar página base de Tabelas de Preços (design e estrutura)
- **REQ-ONB-002**: Implementar geração automática de PDF para tabelas de preços
  - Template com branding FIXO
  - Download automático após criação
  - Armazenamento em Supabase Storage
- **REQ-ONB-003**: Integrar PDF generator no workflow de Yola

### 2.2 Integração com Google Forms
- **REQ-ONB-004**: Criar webhook para receber respostas de Google Forms
- **REQ-ONB-005**: Mapear campos do formulário para tabela `providers`
- **REQ-ONB-006**: Criar trigger automático para atualização de status após submissão

### 2.3 Criação Automática em BackOffice
- **REQ-ONB-007**: Criar aviso/validação antes de completar onboarding:
  - Verificar se prestador existe no BO
  - Mostrar alerta se não existir
- **REQ-ONB-008**: (Ideal) Implementar API para criação automática de prestador no BO OutSystems
  - Endpoint POST para criar prestador
  - Mapping de campos CRM → BO
  - Retornar `backoffice_provider_id` após criação

### 2.4 Novo Status "On-Hold"
- **REQ-ONB-009**: Adicionar enum `on_hold` ao tipo `provider_status`
- **REQ-ONB-010**: Criar migration para adicionar status
- **REQ-ONB-011**: Adicionar filtro "On-Hold" na página de Onboarding
- **REQ-ONB-012**: Criar ação "Colocar On-Hold" nos cards do Kanban
- **REQ-ONB-013**: Registar razão/motivo quando mover para On-Hold (campo notes)

### 2.5 Alertas de Performance
- **REQ-ONB-014**: Calcular tempo médio de onboarding (por etapa e total)
- **REQ-ONB-015**: Criar sistema de alertas visuais:
  - Badge vermelho se tempo > 150% da média
  - Badge amarelo se tempo > 120% da média
- **REQ-ONB-016**: Exibir alertas nos cards do Kanban e na listagem

---

## 3. KPI's ONBOARDING

### 3.1 Métricas de Atividade
- **REQ-KPI-001**: Criar tabela `onboarding_contacts` para registar contactos:
  - `id`, `provider_id`, `contact_type` (email, telefone, reunião)
  - `contacted_by` (user_id), `contacted_at`, `notes`
- **REQ-KPI-002**: Dashboard com métricas:
  - Número de contactos realizados (total e por tipo)
  - Número de tarefas realizadas (concluídas vs. totais)
  - Prestadores que mudaram de etapa (com direção: avançou/retrocedeu)

### 3.2 Análise de Timing
- **REQ-KPI-003**: Criar tabela `onboarding_stage_changes` (histórico de mudanças):
  - `id`, `provider_id`, `from_stage`, `to_stage`, `changed_at`, `duration_days`
- **REQ-KPI-004**: Gráficos de timing:
  - Tempo médio por etapa (1-6)
  - Distribuição de tempos (histograma)
  - Comparação com meta/baseline
- **REQ-KPI-005**: Indicador de timings cumpridos (% dentro do esperado)

---

## 4. MÓDULO REDE (Cobertura)

### 4.1 Definição de Níveis de Cobertura
- **REQ-REDE-001**: Criar tabela `coverage_thresholds`:
  - `service_category`, `good_coverage_min`, `low_coverage_max`, `at_risk_max`
- **REQ-REDE-002**: Interface admin para definir thresholds por serviço
- **REQ-REDE-003**: Aplicar lógica de cores no mapa:
  - Verde: Boa Cobertura (>= good_coverage_min)
  - Amarelo: Baixa Cobertura (between low and good)
  - Vermelho: Em Risco (<= at_risk_max)

### 4.2 Análise por Concelho
- **REQ-REDE-004**: Criar view detalhada por concelho no mapa (drill-down):
  - Mostrar todos os serviços disponíveis
  - Indicar cobertura por serviço (# prestadores)
  - Destacar serviços em baixa cobertura
- **REQ-REDE-005**: Painel de recomendações:
  - "Contratar N prestadores do serviço X em concelho Y"
  - Ordenar por prioridade (risco + procura)

### 4.3 Visualização de Distritos Inativos
- **REQ-REDE-006**: Filtrar distritos sem operação (opacidade reduzida ou cinza)
- **REQ-REDE-007**: Adicionar toggle "Mostrar apenas distritos ativos"
- **REQ-REDE-008**: Definir distrito como ativo se tiver >= 1 prestador ativo

---

## 5. SEGURANÇA E ACESSO

### 5.1 Gestão de Permissões
- **REQ-SEC-001**: Implementar sistema de roles (Admin, Manager, Viewer)
- **REQ-SEC-002**: Criar tabela `user_roles` e `role_permissions`
- **REQ-SEC-003**: Aplicar RLS (Row Level Security) em todas as tabelas sensíveis

### 5.2 Backup e Recuperação
- **REQ-SEC-004**: Configurar backups automáticos diários (Supabase)
- **REQ-SEC-005**: Documentar processo de recuperação de acesso
- **REQ-SEC-006**: Implementar 2FA para utilizadores Admin
- **REQ-SEC-007**: Criar export manual de dados críticos (JSON/CSV)

### 5.3 Auditoria
- **REQ-SEC-008**: Expandir tabela `history_log` para incluir:
  - IP do utilizador
  - User agent
  - Tipo de ação (CREATE, UPDATE, DELETE)
- **REQ-SEC-009**: Criar página de auditoria para Admins

---

## 6. MÓDULO PEDIDOS (Service Requests)

### 6.1 Visualização no Mapa
- **REQ-PED-001**: Adicionar percentagens ao tooltip dos marcadores no mapa:
  - Taxa de conclusão
  - Taxa de cancelamento por backoffice (sem prestador)
  - Taxa de cancelamento por cliente
- **REQ-PED-002**: Criar filtro para destacar concelhos com alta taxa de cancelamento BO
- **REQ-PED-003**: Implementar análise comparativa entre concelhos (ex: Cascais vs Lisboa)

### 6.2 Análise de Cancelamentos
- **REQ-PED-004**: Criar query para calcular taxa de cancelamento por razão:
  - Sem prestador disponível
  - Cliente cancelou
  - Prazo expirado
- **REQ-PED-005**: Dashboard com mapa de calor de cancelamentos
- **REQ-PED-006**: Correlacionar cancelamentos com cobertura de rede

---

## 7. MÓDULO P&L (Profit & Loss)

### 7.1 Visualização de Margem
- **REQ-PL-001**: Criar gráfico de evolução de margem (similar a concluídos/cancelados):
  - Linha verde: Margem bruta crescente
  - Linha vermelha: Margem decrescente
  - Eixo Y: Valor em €
  - Eixo X: Tempo (mensal)
- **REQ-PL-002**: Adicionar filtros por:
  - Categoria de serviço
  - Distrito/Concelho
  - Prestador
- **REQ-PL-003**: Indicadores de performance:
  - Margem % média
  - Tendência (crescente/decrescente)
  - Comparação com meta

### 7.2 Análise Detalhada
- **REQ-PL-004**: Criar breakdown de custos e receitas:
  - Receita por serviço
  - Custo com prestadores
  - Custos operacionais (estimativa)
- **REQ-PL-005**: Export de relatório P&L em Excel/PDF

---

## 8. FUNCIONALIDADES AVANÇADAS (Futuro)

### 8.1 Análise de Reagendamentos
- **REQ-ADV-001**: Criar tabela `service_request_rescheduling`:
  - `request_id`, `original_date`, `new_date`, `reason`, `rescheduled_by`
- **REQ-ADV-002**: Dashboard de análise:
  - Taxa de reagendamento por prestador
  - Razões mais comuns
  - Impacto no tempo de conclusão

### 8.2 Análise de Localizações
- **REQ-ADV-003**: Implementar clustering de pedidos (heatmap)
- **REQ-ADV-004**: Identificar zonas sub-atendidas:
  - Alta procura + baixa cobertura
  - Sugestões de reforço de rede
- **REQ-ADV-005**: Análise de zonas para potencial fecho:
  - Baixa procura + alta cobertura
  - Custo-benefício negativo

### 8.3 Report Automático de Prestadores
- **REQ-ADV-006**: Criar sistema de reports semanais via email:
  - Performance individual
  - Comparação com média
  - Ações recomendadas
- **REQ-ADV-007**: Integração com Zendesk:
  - Criar ticket automático para prestadores com baixa performance
  - Escalar para manager se não houver resposta em N dias

### 8.4 Report Marketing
- **REQ-ADV-008**: Transpor report de marketing para CRM:
  - Origem de leads (Google Ads, Orgânico, Referral)
  - Taxa de conversão por canal
- **REQ-ADV-009**: Integrar links para análises Karma:
  - Embedded dashboards ou iframes
  - SSO para acesso direto

---

## 9. PRIORIZAÇÃO

### Fase 1 (Crítico - 2-4 semanas)
- Onboarding: Preços com PDF, Status On-Hold, Alertas de tempo
- KPI's Onboarding: Contactos, mudanças de etapa, timings
- Scrappers: Frequência semanal, último sync visível

### Fase 2 (Importante - 4-8 semanas)
- Rede: Definição de cobertura, análise por concelho
- Pedidos: Percentagens no mapa, análise de cancelamentos
- P&L: Gráfico de margem

### Fase 3 (Desejável - 8-12+ semanas)
- Report automático de prestadores
- Integração Zendesk
- Report Marketing
- Análise de reagendamentos e localizações
- Segurança: Roles e auditoria avançada

---

## 10. CONSIDERAÇÕES TÉCNICAS

### Performance
- Indexar campos usados em filtros (distrito, categoria, status)
- Implementar caching para dashboards (Vercel KV ou Redis)
- Paginar resultados grandes (>1000 registos)

### Escalabilidade
- Usar Edge Functions para operações assíncronas pesadas
- Implementar queue system para reports (BullMQ ou similar)
- Considerar CDC (Change Data Capture) para sync real-time

### Manutenibilidade
- Documentar decisões arquiteturais (ADRs)
- Criar testes automatizados para fluxos críticos
- Manter CLAUDE.md atualizado com novas features
