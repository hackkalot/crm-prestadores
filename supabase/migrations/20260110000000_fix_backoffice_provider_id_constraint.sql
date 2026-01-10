-- =============================================
-- Fix backoffice_provider_id constraint for upsert
-- The partial index doesn't work for ON CONFLICT, need a proper unique constraint
-- =============================================

-- Drop the partial index
DROP INDEX IF EXISTS idx_providers_backoffice_id;

-- Create a proper unique constraint (allows NULLs, which are not considered duplicates in PostgreSQL)
ALTER TABLE providers ADD CONSTRAINT providers_backoffice_provider_id_unique UNIQUE (backoffice_provider_id);
