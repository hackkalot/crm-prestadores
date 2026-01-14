-- Migration: Increase VARCHAR limits for service_requests fields
-- Date: 2026-01-14
-- Reason: Fix "value too long for type character varying(20)" error in batch imports

-- Increase limits for potentially long fields
ALTER TABLE service_requests
  ALTER COLUMN request_code TYPE VARCHAR(50),
  ALTER COLUMN fid_id TYPE VARCHAR(50),
  ALTER COLUMN user_id TYPE VARCHAR(50),
  ALTER COLUMN created_by TYPE VARCHAR(50),
  ALTER COLUMN updated_by TYPE VARCHAR(50),
  ALTER COLUMN zip_code TYPE VARCHAR(30),
  ALTER COLUMN assigned_provider_id TYPE VARCHAR(50),
  ALTER COLUMN status_updated_by TYPE VARCHAR(50),
  ALTER COLUMN recurrence_code TYPE VARCHAR(50);

-- Add comment
COMMENT ON TABLE service_requests IS 'Service requests imported from FIXO backoffice export (updated VARCHAR limits 2026-01-14)';
