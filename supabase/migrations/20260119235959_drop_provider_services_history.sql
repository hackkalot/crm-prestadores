-- Drop provider_services_history table
-- This table was redundant because:
-- 1. provider_forms_data already stores complete snapshots of each submission
-- 2. history_log with event_type='forms_submission' tracks changes
-- The table had INSERT operations but was never read (0 SELECTs)

-- Drop policies first
DROP POLICY IF EXISTS "Authenticated users can view services history" ON provider_services_history;
DROP POLICY IF EXISTS "Admins can insert services history" ON provider_services_history;
DROP POLICY IF EXISTS "Service role can insert history" ON provider_services_history;

-- Drop indices
DROP INDEX IF EXISTS idx_provider_services_history_provider;
DROP INDEX IF EXISTS idx_provider_services_history_date;
DROP INDEX IF EXISTS idx_provider_services_history_source;

-- Drop the table
DROP TABLE IF EXISTS provider_services_history;
