-- =============================================
-- CRM Prestadores FIXO - Schema Inicial
-- =============================================

-- Enums
CREATE TYPE entity_type AS ENUM ('tecnico', 'eni', 'empresa');
CREATE TYPE provider_status AS ENUM ('novo', 'em_onboarding', 'ativo', 'suspenso', 'abandonado');
CREATE TYPE onboarding_type AS ENUM ('normal', 'urgente');
CREATE TYPE abandonment_party AS ENUM ('prestador', 'fixo');
CREATE TYPE task_status AS ENUM ('por_fazer', 'em_curso', 'concluida');
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

-- =============================================
-- Tabela: users
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- =============================================
-- Tabela: providers
-- =============================================
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  entity_type entity_type NOT NULL,
  nif VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(500),
  districts TEXT[],
  services TEXT[],
  num_technicians INTEGER,
  has_admin_team BOOLEAN,
  has_own_transport BOOLEAN,
  working_hours VARCHAR(255),
  iban VARCHAR(50),
  activity_proof_url VARCHAR(500),
  status provider_status DEFAULT 'novo',
  application_count INTEGER DEFAULT 1,
  abandonment_party abandonment_party,
  abandonment_reason VARCHAR(255),
  abandonment_notes TEXT,
  abandoned_at TIMESTAMPTZ,
  abandoned_by UUID REFERENCES users(id),
  first_application_at TIMESTAMPTZ,
  onboarding_started_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  relationship_owner_id UUID REFERENCES users(id),
  hubspot_contact_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_nif ON providers(nif);
CREATE INDEX idx_providers_email ON providers(email);
CREATE INDEX idx_providers_phone ON providers(phone);
CREATE INDEX idx_providers_entity_type ON providers(entity_type);
CREATE INDEX idx_providers_hubspot_id ON providers(hubspot_contact_id);
CREATE INDEX idx_providers_districts ON providers USING GIN(districts);
CREATE INDEX idx_providers_services ON providers USING GIN(services);

-- =============================================
-- Tabela: application_history
-- =============================================
CREATE TABLE application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  raw_data JSONB,
  source VARCHAR(100) DEFAULT 'hubspot',
  hubspot_submission_id VARCHAR(100),
  applied_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_application_history_provider ON application_history(provider_id);
CREATE INDEX idx_application_history_applied_at ON application_history(applied_at);

-- =============================================
-- Tabela: stage_definitions
-- =============================================
CREATE TABLE stage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_number VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_stage_definitions_number ON stage_definitions(stage_number);
CREATE INDEX idx_stage_definitions_order ON stage_definitions(display_order);

-- =============================================
-- Tabela: task_definitions
-- =============================================
CREATE TABLE task_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES stage_definitions(id),
  task_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_owner_id UUID REFERENCES users(id),
  default_deadline_hours_normal INTEGER,
  default_deadline_hours_urgent INTEGER,
  alert_hours_before INTEGER DEFAULT 24,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_definitions_stage ON task_definitions(stage_id);
CREATE UNIQUE INDEX idx_task_definitions_number ON task_definitions(task_number);
CREATE INDEX idx_task_definitions_order ON task_definitions(display_order);

-- =============================================
-- Tabela: onboarding_cards
-- =============================================
CREATE TABLE onboarding_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  onboarding_type onboarding_type NOT NULL DEFAULT 'normal',
  current_stage_id UUID NOT NULL REFERENCES stage_definitions(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id)
);

CREATE INDEX idx_onboarding_cards_provider ON onboarding_cards(provider_id);
CREATE INDEX idx_onboarding_cards_stage ON onboarding_cards(current_stage_id);
CREATE INDEX idx_onboarding_cards_owner ON onboarding_cards(owner_id);
CREATE INDEX idx_onboarding_cards_type ON onboarding_cards(onboarding_type);

-- =============================================
-- Tabela: onboarding_tasks
-- =============================================
CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES onboarding_cards(id) ON DELETE CASCADE,
  task_definition_id UUID NOT NULL REFERENCES task_definitions(id),
  status task_status DEFAULT 'por_fazer',
  owner_id UUID REFERENCES users(id),
  deadline_at TIMESTAMPTZ,
  original_deadline_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, task_definition_id)
);

CREATE INDEX idx_onboarding_tasks_card ON onboarding_tasks(card_id);
CREATE INDEX idx_onboarding_tasks_definition ON onboarding_tasks(task_definition_id);
CREATE INDEX idx_onboarding_tasks_owner ON onboarding_tasks(owner_id);
CREATE INDEX idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX idx_onboarding_tasks_deadline ON onboarding_tasks(deadline_at);

-- =============================================
-- Tabela: notes
-- =============================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  note_type VARCHAR(50),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_provider ON notes(provider_id);
CREATE INDEX idx_notes_task ON notes(task_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_type ON notes(note_type);

-- =============================================
-- Tabela: history_log
-- =============================================
CREATE TABLE history_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  card_id UUID REFERENCES onboarding_cards(id) ON DELETE SET NULL,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE SET NULL,
  event_type history_event_type NOT NULL,
  description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_history_log_provider ON history_log(provider_id);
CREATE INDEX idx_history_log_card ON history_log(card_id);
CREATE INDEX idx_history_log_event_type ON history_log(event_type);
CREATE INDEX idx_history_log_created_at ON history_log(created_at DESC);

-- =============================================
-- Tabela: service_categories
-- =============================================
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cluster VARCHAR(100),
  vat_rate DECIMAL(5,2) DEFAULT 0.23,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_service_categories_name ON service_categories(name);
CREATE INDEX idx_service_categories_cluster ON service_categories(cluster);

-- =============================================
-- Tabela: services
-- =============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_name ON services(name);

-- =============================================
-- Tabela: reference_prices
-- =============================================
CREATE TABLE reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id),
  variant_name VARCHAR(255),
  variant_description TEXT,
  price_without_vat DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reference_prices_service ON reference_prices(service_id);
CREATE INDEX idx_reference_prices_valid ON reference_prices(valid_from, valid_until);

-- =============================================
-- Tabela: provider_services
-- =============================================
CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, service_id)
);

CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_service ON provider_services(service_id);

-- =============================================
-- Tabela: provider_prices
-- =============================================
CREATE TABLE provider_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  variant_name VARCHAR(255),
  price_without_vat DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_prices_provider ON provider_prices(provider_id);
CREATE INDEX idx_provider_prices_service ON provider_prices(service_id);
CREATE INDEX idx_provider_prices_valid ON provider_prices(valid_from, valid_until);

-- =============================================
-- Tabela: provider_price_snapshots
-- =============================================
CREATE TABLE provider_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  snapshot_name VARCHAR(255),
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_price_snapshots_provider ON provider_price_snapshots(provider_id);
CREATE INDEX idx_provider_price_snapshots_created_at ON provider_price_snapshots(created_at DESC);

-- =============================================
-- Tabela: alerts
-- =============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  trigger_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_provider ON alerts(provider_id);
CREATE INDEX idx_alerts_task ON alerts(task_id);
CREATE INDEX idx_alerts_unread ON alerts(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_alerts_trigger ON alerts(trigger_at);

-- =============================================
-- Tabela: settings
-- =============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: settings_log
-- =============================================
CREATE TABLE settings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_log_key ON settings_log(setting_key);
CREATE INDEX idx_settings_log_changed_at ON settings_log(changed_at DESC);

-- =============================================
-- Triggers: updated_at automático
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stage_definitions_updated_at BEFORE UPDATE ON stage_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_task_definitions_updated_at BEFORE UPDATE ON task_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_onboarding_cards_updated_at BEFORE UPDATE ON onboarding_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reference_prices_updated_at BEFORE UPDATE ON reference_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_provider_prices_updated_at BEFORE UPDATE ON provider_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Triggers: Log automático de alterações
-- =============================================
CREATE OR REPLACE FUNCTION log_provider_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
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

CREATE TRIGGER log_provider_status AFTER UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION log_provider_status_change();
