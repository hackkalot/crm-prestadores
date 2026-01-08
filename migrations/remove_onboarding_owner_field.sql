-- Migration: Remove owner_id field from onboarding_cards table
-- Date: 2026-01-08
-- Description: Remove the redundant owner_id field from onboarding_cards.
--              We only use providers.relationship_owner_id as the single source of truth.

-- Drop the foreign key constraint first (if exists)
ALTER TABLE onboarding_cards
DROP CONSTRAINT IF EXISTS onboarding_cards_owner_id_fkey;

-- Drop the owner_id column
ALTER TABLE onboarding_cards
DROP COLUMN IF EXISTS owner_id;

-- Add comment to document the change
COMMENT ON TABLE onboarding_cards IS 'Onboarding cards for providers. Owner information is managed via providers.relationship_owner_id';
