-- =============================================
-- Add backoffice fields to providers table
-- These fields sync from the FIXO backoffice system
-- =============================================

-- Core backoffice identifier
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_provider_id INTEGER;

-- Backoffice authentication/status
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_password_defined BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_last_login TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_status VARCHAR(50);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_status_updated_at TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_status_updated_by INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_do_recurrence BOOLEAN DEFAULT FALSE;

-- Categories and coverage (complement existing fields)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE providers ADD COLUMN IF NOT EXISTS counties TEXT[];

-- Request statistics from backoffice
ALTER TABLE providers ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS active_requests INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS cancelled_requests INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS completed_requests INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS requests_received INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS requests_accepted INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS requests_expired INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS requests_rejected INTEGER DEFAULT 0;

-- Ratings
ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_rating DECIMAL(4,2);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS technician_rating DECIMAL(4,2);

-- Backoffice audit fields
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_created_at TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_created_by INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_updated_at TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_updated_by INTEGER;

-- Last sync timestamp
ALTER TABLE providers ADD COLUMN IF NOT EXISTS backoffice_synced_at TIMESTAMPTZ;

-- =============================================
-- Indexes
-- =============================================

-- Unique index for backoffice ID (only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_backoffice_id
ON providers(backoffice_provider_id)
WHERE backoffice_provider_id IS NOT NULL;

-- Index for backoffice status queries
CREATE INDEX IF NOT EXISTS idx_providers_backoffice_status
ON providers(backoffice_status);

-- Index for active providers
CREATE INDEX IF NOT EXISTS idx_providers_backoffice_is_active
ON providers(backoffice_is_active);

-- GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_providers_categories ON providers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_providers_counties ON providers USING GIN(counties);

-- =============================================
-- Comments
-- =============================================
COMMENT ON COLUMN providers.backoffice_provider_id IS 'USER_ID from the FIXO backoffice system';
COMMENT ON COLUMN providers.backoffice_status IS 'Provider status in backoffice: Ativo, Inativo, Arquivado';
COMMENT ON COLUMN providers.total_requests IS 'Total service requests assigned to this provider (from backoffice)';
COMMENT ON COLUMN providers.completed_requests IS 'Completed service requests (from backoffice)';
COMMENT ON COLUMN providers.service_rating IS 'Average service rating (0-5 scale, from backoffice)';
COMMENT ON COLUMN providers.technician_rating IS 'Average technician rating (0-5 scale, from backoffice)';
COMMENT ON COLUMN providers.backoffice_synced_at IS 'Last time this provider was synced from backoffice';
