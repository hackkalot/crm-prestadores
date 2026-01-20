-- Migration: Remove owner_id from onboarding_tasks
-- This field is no longer used - alerts now use provider.relationship_owner_id
-- Date: 2026-01-20

-- 1. Drop the foreign key constraint first
ALTER TABLE onboarding_tasks DROP CONSTRAINT IF EXISTS onboarding_tasks_owner_id_fkey;

-- 2. Drop the owner_id column
ALTER TABLE onboarding_tasks DROP COLUMN IF EXISTS owner_id;

-- Note: All alert generation now uses provider.relationship_owner_id as the recipient
-- See: src/lib/alerts/actions.ts
