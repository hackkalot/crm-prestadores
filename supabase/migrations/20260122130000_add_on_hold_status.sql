-- Add 'on_hold' status to provider_status enum
-- This allows RMs to pause the onboarding process at any time

ALTER TYPE provider_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'em_onboarding';
