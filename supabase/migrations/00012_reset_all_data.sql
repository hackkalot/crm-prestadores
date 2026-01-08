-- Reset all data tables (keeping users)
-- This migration cleans all business data while preserving user accounts

-- Delete all data in correct order (respecting foreign key constraints)

-- Step 1: Delete all alerts and notifications
DELETE FROM alerts;

-- Step 2: Delete all notes
DELETE FROM notes;

-- Step 3: Delete all priorities and related data
DELETE FROM priority_assignments;
DELETE FROM priority_progress_log;
DELETE FROM priorities;

-- Step 4: Delete all onboarding data
DELETE FROM onboarding_tasks;
DELETE FROM onboarding_cards;

-- Step 5: Delete all provider-related data
DELETE FROM provider_documents;
DELETE FROM provider_price_snapshots;
DELETE FROM history_log;

-- Step 6: Delete all application history
DELETE FROM application_history;

-- Step 7: Delete all provider services and prices
DELETE FROM provider_services;
DELETE FROM provider_prices;

-- Step 8: Delete all providers (prestadores)
-- This is the main table - deleting it will clean most references
DELETE FROM providers;

-- Step 9: Reset task definitions (remove owners but keep definitions)
UPDATE task_definitions
SET default_owner_id = NULL
WHERE default_owner_id IS NOT NULL;

-- Step 10: Clean settings log
DELETE FROM settings_log;

-- Add comment
COMMENT ON TABLE providers IS 'Providers table reset on 2026-01-08 - ready for new dummy data';
COMMENT ON TABLE application_history IS 'Application history table reset on 2026-01-08 - ready for new dummy data';
