-- Clean users table while keeping auth.users intact
-- This allows users to login, and the trigger will recreate their profile

-- Step 1: Remove all user references from other tables (same as migration 00011)
UPDATE providers
SET
  relationship_owner_id = NULL,
  abandoned_by = NULL
WHERE relationship_owner_id IS NOT NULL
   OR abandoned_by IS NOT NULL;

UPDATE task_definitions
SET default_owner_id = NULL
WHERE default_owner_id IS NOT NULL;

UPDATE settings
SET updated_by = NULL
WHERE updated_by IS NOT NULL;

-- Step 2: Delete all related data that references users
DELETE FROM alerts;
DELETE FROM notes;
DELETE FROM priority_assignments;
DELETE FROM priority_progress_log;
DELETE FROM priorities;
DELETE FROM onboarding_tasks;
DELETE FROM history_log;
DELETE FROM provider_price_snapshots;
DELETE FROM onboarding_cards;
DELETE FROM settings_log;
DELETE FROM provider_documents;

-- Step 3: Delete all users from application table
-- Note: This does NOT delete from auth.users
-- Users can still login, and the trigger will recreate their profile
DELETE FROM users;

-- Add comment
COMMENT ON TABLE users IS 'Users table cleaned on 2026-01-08 - auth.users intact, profiles will be recreated on login';
