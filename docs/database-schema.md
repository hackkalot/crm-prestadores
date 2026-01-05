# Modelação de Dados - CRM Prestadores FIXO

## Diagrama de Relações (Simplificado)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   candidatura   │──────▶│    prestador    │◀──────│ prestador_price │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                  │                         │
                                  │                         ▼
                                  │                 ┌─────────────────┐
                                  │                 │ reference_price │
                                  │                 └─────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │ onboarding_card │
                          └─────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐ ┌─────────────┐ ┌──────────┐
            │   task    │ │    note     │ │  history │
            └───────────┘ └─────────────┘ └──────────┘
                    │
                    ▼
            ┌───────────────────┐
            │ task_definition   │
            └───────────────────┘
                    │
                    ▼
            ┌───────────────────┐
            │ stage_definition  │
            └───────────────────┘
```

---

## Enums

```sql
-- Tipo de entidade do prestador
CREATE TYPE entity_type AS ENUM ('tecnico', 'eni', 'empresa');

-- Estado do prestador
CREATE TYPE provider_status AS ENUM (
  'novo',           -- Candidatura recebida, ainda não processada
  'em_onboarding',  -- Em processo de onboarding
  'ativo',          -- Onboarding concluído, a operar na rede
  'suspenso',       -- Temporariamente suspenso
  'abandonado'      -- Abandonado (não avançou)
);

-- Tipo de onboarding
CREATE TYPE onboarding_type AS ENUM ('normal', 'urgente');

-- Quem não quis avançar (para abandono)
CREATE TYPE abandonment_party AS ENUM ('prestador', 'fixo');

-- Estado de uma tarefa individual
CREATE TYPE task_status AS ENUM ('por_fazer', 'em_curso', 'concluida');

-- Tipo de evento no histórico
CREATE TYPE history_event_type AS ENUM (
  'stage_change',
  'task_completed',
  'task_reopened',
  'owner_change',
  'task_owner_change',
  'deadline_change',
  'note_added',
  'status_change',
  'price_change'
);
```

---

## Tabelas

### 1. `users` - Utilizadores do CRM

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
```

---

### 2. `providers` - Prestadores

Tabela central que guarda todos os prestadores (desde candidatura até gestão).

```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  name VARCHAR(255) NOT NULL,
  entity_type entity_type NOT NULL,
  nif VARCHAR(20),

  -- Contactos
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(500),

  -- Operação
  districts TEXT[], -- Array de distritos onde opera
  services TEXT[],  -- Array de serviços que presta
  num_technicians INTEGER,
  has_admin_team BOOLEAN,
  has_own_transport BOOLEAN,
  working_hours VARCHAR(255),

  -- Dados administrativos
  iban VARCHAR(50),
  activity_proof_url VARCHAR(500), -- Link para comprovativo de atividade

  -- Estado e tracking
  status provider_status DEFAULT 'novo',
  application_count INTEGER DEFAULT 1,

  -- Abandono (se aplicável)
  abandonment_party abandonment_party,
  abandonment_reason VARCHAR(255),
  abandonment_notes TEXT,
  abandoned_at TIMESTAMPTZ,
  abandoned_by UUID REFERENCES users(id),

  -- Datas importantes
  first_application_at TIMESTAMPTZ,
  onboarding_started_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ, -- Data de entrada na rede
  suspended_at TIMESTAMPTZ,

  -- Owner da relação (gestão de prestadores)
  relationship_owner_id UUID REFERENCES users(id),

  -- HubSpot reference
  hubspot_contact_id VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_nif ON providers(nif);
CREATE INDEX idx_providers_email ON providers(email);
CREATE INDEX idx_providers_phone ON providers(phone);
CREATE INDEX idx_providers_entity_type ON providers(entity_type);
CREATE INDEX idx_providers_hubspot_id ON providers(hubspot_contact_id);
CREATE INDEX idx_providers_districts ON providers USING GIN(districts);
CREATE INDEX idx_providers_services ON providers USING GIN(services);
```

---

### 3. `application_history` - Histórico de candidaturas (duplicados)

```sql
CREATE TABLE application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Dados da candidatura naquele momento
  raw_data JSONB, -- Dados originais do HubSpot
  source VARCHAR(100) DEFAULT 'hubspot',
  hubspot_submission_id VARCHAR(100),

  applied_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_application_history_provider ON application_history(provider_id);
CREATE INDEX idx_application_history_applied_at ON application_history(applied_at);
```

---

### 4. `stage_definitions` - Definição das etapas do Kanban

```sql
CREATE TABLE stage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  stage_number VARCHAR(10) NOT NULL, -- "1", "2", "3A", etc.
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_stage_definitions_number ON stage_definitions(stage_number);
CREATE INDEX idx_stage_definitions_order ON stage_definitions(display_order);
```

---

### 5. `task_definitions` - Definição das tarefas (configuração global)

```sql
CREATE TABLE task_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  stage_id UUID NOT NULL REFERENCES stage_definitions(id),
  task_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Defaults
  default_owner_id UUID REFERENCES users(id),
  default_deadline_hours_normal INTEGER, -- Prazo em horas (onboarding normal)
  default_deadline_hours_urgent INTEGER, -- Prazo em horas (onboarding urgente)

  -- Alertas
  alert_hours_before INTEGER DEFAULT 24, -- Horas antes do prazo para alertar

  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_task_definitions_stage ON task_definitions(stage_id);
CREATE UNIQUE INDEX idx_task_definitions_number ON task_definitions(task_number);
CREATE INDEX idx_task_definitions_order ON task_definitions(display_order);
```

---

### 6. `onboarding_cards` - Cards do Kanban (instância de onboarding)

```sql
CREATE TABLE onboarding_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Tipo e estado
  onboarding_type onboarding_type NOT NULL DEFAULT 'normal',
  current_stage_id UUID NOT NULL REFERENCES stage_definitions(id),

  -- Owner principal do onboarding
  owner_id UUID NOT NULL REFERENCES users(id),

  -- Tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id) -- Um prestador só pode ter um onboarding ativo
);

-- Índices
CREATE INDEX idx_onboarding_cards_provider ON onboarding_cards(provider_id);
CREATE INDEX idx_onboarding_cards_stage ON onboarding_cards(current_stage_id);
CREATE INDEX idx_onboarding_cards_owner ON onboarding_cards(owner_id);
CREATE INDEX idx_onboarding_cards_type ON onboarding_cards(onboarding_type);
```

---

### 7. `onboarding_tasks` - Tarefas instanciadas para cada prestador

```sql
CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  card_id UUID NOT NULL REFERENCES onboarding_cards(id) ON DELETE CASCADE,
  task_definition_id UUID NOT NULL REFERENCES task_definitions(id),

  -- Estado
  status task_status DEFAULT 'por_fazer',

  -- Owner específico desta tarefa (pode diferir do default)
  owner_id UUID REFERENCES users(id),

  -- Prazos
  deadline_at TIMESTAMPTZ,
  original_deadline_at TIMESTAMPTZ, -- Prazo original para tracking

  -- Tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(card_id, task_definition_id)
);

-- Índices
CREATE INDEX idx_onboarding_tasks_card ON onboarding_tasks(card_id);
CREATE INDEX idx_onboarding_tasks_definition ON onboarding_tasks(task_definition_id);
CREATE INDEX idx_onboarding_tasks_owner ON onboarding_tasks(owner_id);
CREATE INDEX idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX idx_onboarding_tasks_deadline ON onboarding_tasks(deadline_at);
```

---

### 8. `notes` - Notas sobre prestadores

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE SET NULL, -- Opcional: associar a tarefa

  content TEXT NOT NULL,
  note_type VARCHAR(50), -- 'operacional', 'comercial', 'qualidade', etc.

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notes_provider ON notes(provider_id);
CREATE INDEX idx_notes_task ON notes(task_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_type ON notes(note_type);
```

---

### 9. `history_log` - Log de todas as alterações

```sql
CREATE TABLE history_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  card_id UUID REFERENCES onboarding_cards(id) ON DELETE SET NULL,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE SET NULL,

  event_type history_event_type NOT NULL,
  description TEXT NOT NULL,

  -- Valores antes/depois (para alterações)
  old_value JSONB,
  new_value JSONB,

  -- Metadados
  reason TEXT, -- Motivo da alteração (opcional)

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_history_log_provider ON history_log(provider_id);
CREATE INDEX idx_history_log_card ON history_log(card_id);
CREATE INDEX idx_history_log_event_type ON history_log(event_type);
CREATE INDEX idx_history_log_created_at ON history_log(created_at DESC);
```

---

### 10. `service_categories` - Categorias de serviços

```sql
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  cluster VARCHAR(100), -- 'Casa', 'Saúde e bem estar', etc.
  vat_rate DECIMAL(5,2) DEFAULT 0.23, -- Taxa de IVA

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_service_categories_name ON service_categories(name);
CREATE INDEX idx_service_categories_cluster ON service_categories(cluster);
```

---

### 11. `services` - Serviços específicos

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category_id UUID NOT NULL REFERENCES service_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Unidade de medida/cobrança
  unit VARCHAR(50), -- 'hora', 'unidade', 'm', 'equipamento', etc.

  is_active BOOLEAN DEFAULT TRUE,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_name ON services(name);
```

---

### 12. `reference_prices` - Tabela de preços de referência FIXO

```sql
CREATE TABLE reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  service_id UUID NOT NULL REFERENCES services(id),

  -- Variante do preço (ex: "T0-T2", "1ª instalação", "hora extra")
  variant_name VARCHAR(255),
  variant_description TEXT,

  -- Preço
  price_without_vat DECIMAL(10,2) NOT NULL,

  -- Vigência
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_reference_prices_service ON reference_prices(service_id);
CREATE INDEX idx_reference_prices_valid ON reference_prices(valid_from, valid_until);
```

---

### 13. `provider_services` - Serviços que cada prestador oferece

```sql
CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),

  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id, service_id)
);

-- Índices
CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_service ON provider_services(service_id);
```

---

### 14. `provider_prices` - Preços acordados com cada prestador

```sql
CREATE TABLE provider_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),

  -- Variante (mesma lógica dos preços de referência)
  variant_name VARCHAR(255),

  -- Preço acordado
  price_without_vat DECIMAL(10,2) NOT NULL,

  -- Vigência
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_provider_prices_provider ON provider_prices(provider_id);
CREATE INDEX idx_provider_prices_service ON provider_prices(service_id);
CREATE INDEX idx_provider_prices_valid ON provider_prices(valid_from, valid_until);
```

---

### 15. `provider_price_snapshots` - Snapshots históricos de tabelas de preços

```sql
CREATE TABLE provider_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  snapshot_name VARCHAR(255), -- Ex: "Tabela inicial", "Renegociação 2026"
  snapshot_data JSONB NOT NULL, -- Cópia completa dos preços naquele momento

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_provider_price_snapshots_provider ON provider_price_snapshots(provider_id);
CREATE INDEX idx_provider_price_snapshots_created_at ON provider_price_snapshots(created_at DESC);
```

---

### 16. `alerts` - Sistema de alertas

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE CASCADE,

  -- Destinatário
  user_id UUID NOT NULL REFERENCES users(id),

  -- Conteúdo
  alert_type VARCHAR(50) NOT NULL, -- 'deadline_approaching', 'task_stalled', 'price_deviation'
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Quando deve ser mostrado
  trigger_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_provider ON alerts(provider_id);
CREATE INDEX idx_alerts_task ON alerts(task_id);
CREATE INDEX idx_alerts_unread ON alerts(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_alerts_trigger ON alerts(trigger_at);
```

---

### 17. `settings` - Configurações globais do sistema

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,

  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações iniciais sugeridas:
-- 'alert_hours_before_deadline': 24
-- 'stalled_task_days': 3
-- 'price_deviation_threshold': 0.20
```

---

### 18. `settings_log` - Log de alterações às configurações

```sql
CREATE TABLE settings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  setting_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,

  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_settings_log_key ON settings_log(setting_key);
CREATE INDEX idx_settings_log_changed_at ON settings_log(changed_at DESC);
```

---

## Views Úteis

### View: Agenda do utilizador

```sql
CREATE VIEW user_agenda AS
SELECT
  t.id AS task_id,
  t.status,
  t.deadline_at,
  t.owner_id,
  td.name AS task_name,
  td.task_number,
  sd.name AS stage_name,
  p.id AS provider_id,
  p.name AS provider_name,
  p.entity_type,
  c.onboarding_type,
  CASE
    WHEN t.deadline_at < NOW() THEN 'atrasada'
    WHEN t.deadline_at < NOW() + INTERVAL '24 hours' THEN 'urgente'
    ELSE 'normal'
  END AS urgency
FROM onboarding_tasks t
JOIN task_definitions td ON t.task_definition_id = td.id
JOIN stage_definitions sd ON td.stage_id = sd.id
JOIN onboarding_cards c ON t.card_id = c.id
JOIN providers p ON c.provider_id = p.id
WHERE t.status != 'concluida'
ORDER BY t.deadline_at ASC;
```

### View: KPIs de Onboarding

```sql
CREATE VIEW onboarding_kpis AS
SELECT
  sd.id AS stage_id,
  sd.name AS stage_name,
  sd.display_order,
  COUNT(c.id) AS providers_count,
  COUNT(CASE WHEN c.onboarding_type = 'normal' THEN 1 END) AS normal_count,
  COUNT(CASE WHEN c.onboarding_type = 'urgente' THEN 1 END) AS urgent_count
FROM stage_definitions sd
LEFT JOIN onboarding_cards c ON c.current_stage_id = sd.id
  AND c.completed_at IS NULL
GROUP BY sd.id, sd.name, sd.display_order
ORDER BY sd.display_order;
```

---

## Triggers Sugeridos

### 1. Auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas as tabelas com updated_at
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- (repetir para outras tabelas...)
```

### 2. Log automático de alterações de estado

```sql
CREATE OR REPLACE FUNCTION log_provider_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO history_log (provider_id, event_type, description, old_value, new_value)
    VALUES (
      NEW.id,
      'status_change',
      'Estado alterado de ' || OLD.status || ' para ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_provider_status
  AFTER UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION log_provider_status_change();
```

---

## Seed Data Inicial

### Etapas

```sql
INSERT INTO stage_definitions (stage_number, name, display_order) VALUES
('1', 'POR CONTACTAR', 1),
('2', 'CONTACTADOS / AGUARDA INFO', 2),
('3', 'AGUARDA REUNIÃO', 3),
('3A', 'REUNIÃO MARCADA', 4),
('4', 'APRESENTAR AO COMITÉ (RICARDO)', 5),
('5', 'AGUARDA DOCUMENTAÇÃO/APÓLICE', 6),
('6', 'EM FORMAÇÃO', 7),
('7', 'AGUARDA RESPOSTA QUIZ', 8),
('8', 'ENVIAR MATERIAIS', 9),
('9', 'CRIAR FICHA ERP', 10),
('10', 'ALINHAMENTO PRÉ-LAUNCH', 11),
('11', 'ACOMPANHAMENTO', 12);
```

### Tarefas (exemplo parcial)

```sql
-- As tarefas serão inseridas com base no Excel CRM_Etapas e Tarefas.xlsx
-- Ver ficheiro de migração para dados completos
```

---

## Notas de Implementação

1. **Row Level Security (RLS)**: Ativar no Supabase para controlar acesso por utilizador
2. **Realtime**: Ativar subscriptions nas tabelas `onboarding_cards`, `onboarding_tasks`, `alerts`
3. **Storage**: Bucket para documentos dos prestadores (comprovativos, contratos, etc.)
4. **Edge Functions**: Para webhook do HubSpot e cálculo de alertas
