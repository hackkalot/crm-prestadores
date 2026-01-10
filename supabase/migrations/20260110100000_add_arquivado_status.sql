-- =============================================
-- Add 'arquivado' status to provider_status enum
-- This status is for providers who were previously active
-- but requested to be archived from the FIXO network
-- =============================================

-- Add the new value to the enum
ALTER TYPE provider_status ADD VALUE IF NOT EXISTS 'arquivado';

-- Add archived_at column to track when a provider was archived
ALTER TABLE providers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Comment explaining the status
COMMENT ON COLUMN providers.archived_at IS 'Timestamp when the provider was archived (requested removal from FIXO network)';
