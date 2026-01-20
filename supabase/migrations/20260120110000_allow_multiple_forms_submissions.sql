-- Migration: Allow multiple forms submissions per provider
-- Instead of upsert (one submission), now we allow multiple submissions as historical snapshots

-- 1. Remove the UNIQUE constraint on provider_id
ALTER TABLE provider_forms_data DROP CONSTRAINT IF EXISTS provider_forms_data_provider_id_key;

-- 2. Add submission_number column to track submission order
ALTER TABLE provider_forms_data ADD COLUMN IF NOT EXISTS submission_number INTEGER DEFAULT 1;

-- 3. Create unique constraint on (provider_id, submission_number) for easier referencing
-- First, update existing records to have proper submission numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY provider_id ORDER BY submitted_at NULLS LAST, created_at) as rn
  FROM provider_forms_data
)
UPDATE provider_forms_data pfd
SET submission_number = numbered.rn
FROM numbered
WHERE pfd.id = numbered.id;

-- 4. Add index for querying submissions by provider ordered by date
CREATE INDEX IF NOT EXISTS idx_provider_forms_data_provider_submitted
ON provider_forms_data(provider_id, submitted_at DESC);

-- 5. Update comment to reflect new purpose
COMMENT ON TABLE provider_forms_data IS 'Historical snapshots of provider forms submissions. Each submission creates a new record. The providers table holds the editable/current values.';
COMMENT ON COLUMN provider_forms_data.submission_number IS 'Sequential number of this submission for the provider (1 = first, 2 = second, etc.)';
