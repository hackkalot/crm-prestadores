-- Migration: Drop legacy pricing tables
-- These tables have been replaced by angariacao_reference_prices and are no longer in use
-- Date: 2026-01-20

-- Drop in correct order (respecting foreign keys)

-- 1. Drop reference_prices first (depends on services)
DROP TABLE IF EXISTS reference_prices CASCADE;

-- 2. Drop services (depends on service_categories)
DROP TABLE IF EXISTS services CASCADE;

-- 3. Drop service_categories
DROP TABLE IF EXISTS service_categories CASCADE;

-- Note: provider_prices was already restructured in migration 20260116000300
-- to reference angariacao_reference_prices instead of services
