-- Migration: Create priorities system
-- Description: Creates tables and enums for priority/KPI tracking system

-- Priority type enum
CREATE TYPE priority_type AS ENUM (
  'ativar_prestadores',
  'concluir_onboardings',
  'outro'
);

-- Priority urgency enum
CREATE TYPE priority_urgency AS ENUM (
  'baixa',
  'media',
  'alta',
  'urgente'
);

-- Priority status enum
CREATE TYPE priority_status AS ENUM (
  'ativa',
  'concluida',
  'cancelada'
);

-- Main priorities table
CREATE TABLE priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type and criteria
  type priority_type NOT NULL,
  criteria JSONB DEFAULT '{}',  -- Structured: { services: [], districts: [], entity_types: [], provider_status: [] }

  -- Target and progress
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  current_active_count INTEGER DEFAULT 0,  -- For tracking currently active (can decrease if suspended)
  unit VARCHAR(50) DEFAULT 'prestadores',

  -- Temporal
  deadline TIMESTAMPTZ,
  urgency priority_urgency NOT NULL DEFAULT 'media',

  -- Status
  status priority_status NOT NULL DEFAULT 'ativa',

  -- Tracking
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,
  was_successful BOOLEAN,  -- Did they hit target?
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,  -- Soft delete
  deleted_by UUID REFERENCES users(id),

  -- Baseline snapshot (counts at creation time)
  baseline_provider_count INTEGER,
  baseline_onboarding_count INTEGER,
  calculation_metadata JSONB,  -- Stores filters/criteria used for audit

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Priority assignments (many-to-many: priority <-> users)
CREATE TABLE priority_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id UUID NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(priority_id, user_id)
);

-- Priority progress tracking (for manual updates and audit)
CREATE TABLE priority_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id UUID NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
  old_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  change_reason VARCHAR(50),  -- 'provider_activated', 'manual_update', 'recalculation', 'onboarding_completed'
  provider_id UUID REFERENCES providers(id),  -- If triggered by specific provider
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id),
  note TEXT
);

-- Indexes for priorities
CREATE INDEX idx_priorities_status ON priorities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_priorities_created_by ON priorities(created_by);
CREATE INDEX idx_priorities_type ON priorities(type);
CREATE INDEX idx_priorities_deadline ON priorities(deadline) WHERE deadline IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_priorities_deleted ON priorities(deleted_at);  -- For soft delete filtering
CREATE INDEX idx_priorities_criteria_gin ON priorities USING GIN (criteria);  -- JSONB index for criteria filtering

-- Indexes for assignments
CREATE INDEX idx_priority_assignments_user ON priority_assignments(user_id);
CREATE INDEX idx_priority_assignments_priority ON priority_assignments(priority_id);

-- Indexes for progress log
CREATE INDEX idx_priority_progress_log_priority ON priority_progress_log(priority_id);
CREATE INDEX idx_priority_progress_log_provider ON priority_progress_log(provider_id) WHERE provider_id IS NOT NULL;

-- Critical indexes for auto-calculation performance
CREATE INDEX idx_providers_activated_at ON providers(activated_at) WHERE activated_at IS NOT NULL;
CREATE INDEX idx_providers_status_activated ON providers(status, activated_at);
CREATE INDEX idx_onboarding_cards_completed ON onboarding_cards(completed_at) WHERE completed_at IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_priorities_updated_at
  BEFORE UPDATE ON priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE priorities IS 'Priority/KPI tracking for managers to set and monitor goals';
COMMENT ON TABLE priority_assignments IS 'Many-to-many relationship between priorities and assigned users';
COMMENT ON TABLE priority_progress_log IS 'Audit log of priority progress changes';

COMMENT ON COLUMN priorities.criteria IS 'JSONB structure: { services?: string[], districts?: string[], entity_types?: string[], provider_status?: string[] }';
COMMENT ON COLUMN priorities.current_value IS 'Total activations/completions (never decreases even if provider suspended)';
COMMENT ON COLUMN priorities.current_active_count IS 'Currently active count (can decrease if providers suspended)';
COMMENT ON COLUMN priorities.baseline_provider_count IS 'Snapshot of provider count at priority creation time';
COMMENT ON COLUMN priorities.baseline_onboarding_count IS 'Snapshot of onboarding count at priority creation time';
