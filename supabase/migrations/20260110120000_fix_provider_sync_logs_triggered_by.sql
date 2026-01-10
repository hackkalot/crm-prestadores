-- Fix sync logs tables to allow GitHub Actions triggers (no user)
-- Change triggered_by to nullable and add triggered_by_system column

-- =============================================
-- provider_sync_logs
-- =============================================

-- Drop the foreign key constraint and make nullable
ALTER TABLE provider_sync_logs
  ALTER COLUMN triggered_by DROP NOT NULL;

-- Add a column to track system triggers
ALTER TABLE provider_sync_logs
  ADD COLUMN IF NOT EXISTS triggered_by_system VARCHAR(50);

-- Update status check constraint to include 'pending'
ALTER TABLE provider_sync_logs
  DROP CONSTRAINT IF EXISTS provider_sync_logs_status_check;

ALTER TABLE provider_sync_logs
  ADD CONSTRAINT provider_sync_logs_status_check
  CHECK (status IN ('success', 'error', 'in_progress', 'pending'));

COMMENT ON COLUMN provider_sync_logs.triggered_by IS 'User who triggered the sync (NULL if triggered by system)';
COMMENT ON COLUMN provider_sync_logs.triggered_by_system IS 'System that triggered the sync (e.g., github-actions, cron)';

-- =============================================
-- sync_logs (service requests)
-- =============================================

-- Make triggered_by nullable (for scheduled runs)
ALTER TABLE sync_logs
  ALTER COLUMN triggered_by DROP NOT NULL;

-- Add a column to track system triggers
ALTER TABLE sync_logs
  ADD COLUMN IF NOT EXISTS triggered_by_system VARCHAR(50);

-- Update status check constraint to include 'pending'
ALTER TABLE sync_logs
  DROP CONSTRAINT IF EXISTS sync_logs_status_check;

ALTER TABLE sync_logs
  ADD CONSTRAINT sync_logs_status_check
  CHECK (status IN ('success', 'error', 'in_progress', 'pending'));

COMMENT ON COLUMN sync_logs.triggered_by IS 'User who triggered the sync (NULL if triggered by system)';
COMMENT ON COLUMN sync_logs.triggered_by_system IS 'System that triggered the sync (e.g., github-actions, cron)';
