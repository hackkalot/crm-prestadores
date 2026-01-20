-- Migration: Add forms data fields to providers table
-- This allows editing form data directly on providers (live data)
-- while keeping provider_forms_data as a read-only submission snapshot

-- Add documentation fields
ALTER TABLE providers ADD COLUMN IF NOT EXISTS has_activity_declaration boolean DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS has_liability_insurance boolean DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS has_work_accidents_insurance boolean DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS works_with_platforms text[] DEFAULT '{}';

-- Add availability fields
ALTER TABLE providers ADD COLUMN IF NOT EXISTS available_weekdays text[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS work_hours_start text;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS work_hours_end text;

-- Add resources fields
ALTER TABLE providers ADD COLUMN IF NOT EXISTS has_computer boolean DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS own_equipment text[] DEFAULT '{}';

-- Copy existing data from provider_forms_data to providers
UPDATE providers p
SET
  has_activity_declaration = COALESCE(pfd.has_activity_declaration, false),
  has_liability_insurance = COALESCE(pfd.has_liability_insurance, false),
  has_work_accidents_insurance = COALESCE(pfd.has_work_accidents_insurance, false),
  certifications = COALESCE(pfd.certifications, '{}'),
  works_with_platforms = COALESCE(pfd.works_with_platforms, '{}'),
  available_weekdays = COALESCE(pfd.available_weekdays, '{}'),
  work_hours_start = pfd.work_hours_start,
  work_hours_end = pfd.work_hours_end,
  has_computer = COALESCE(pfd.has_computer, false),
  own_equipment = COALESCE(pfd.own_equipment, '{}'),
  -- Also ensure has_own_transport is synced (already exists but may not be populated)
  has_own_transport = COALESCE(pfd.has_transport, p.has_own_transport, false)
FROM provider_forms_data pfd
WHERE p.id = pfd.provider_id;

-- Add comment explaining the data model
COMMENT ON COLUMN providers.has_activity_declaration IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.has_liability_insurance IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.has_work_accidents_insurance IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.certifications IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.works_with_platforms IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.available_weekdays IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.work_hours_start IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.work_hours_end IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.has_computer IS 'Editable form field - copied from provider_forms_data on submission';
COMMENT ON COLUMN providers.own_equipment IS 'Editable form field - copied from provider_forms_data on submission';
