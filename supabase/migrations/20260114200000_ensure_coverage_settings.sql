-- Ensure coverage settings columns exist (idempotent)

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add coverage_requests_per_provider
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings'
        AND column_name = 'coverage_requests_per_provider'
    ) THEN
        ALTER TABLE settings ADD COLUMN coverage_requests_per_provider INTEGER DEFAULT 20;
    END IF;

    -- Add coverage_capacity_good_min
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings'
        AND column_name = 'coverage_capacity_good_min'
    ) THEN
        ALTER TABLE settings ADD COLUMN coverage_capacity_good_min INTEGER DEFAULT 100;
    END IF;

    -- Add coverage_capacity_low_min
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings'
        AND column_name = 'coverage_capacity_low_min'
    ) THEN
        ALTER TABLE settings ADD COLUMN coverage_capacity_low_min INTEGER DEFAULT 50;
    END IF;

    -- Add coverage_analysis_period_months if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings'
        AND column_name = 'coverage_analysis_period_months'
    ) THEN
        ALTER TABLE settings ADD COLUMN coverage_analysis_period_months INTEGER DEFAULT 1;
    END IF;
END $$;

-- Update default settings row with default values if not set
UPDATE settings
SET
    coverage_requests_per_provider = COALESCE(coverage_requests_per_provider, 20),
    coverage_capacity_good_min = COALESCE(coverage_capacity_good_min, 100),
    coverage_capacity_low_min = COALESCE(coverage_capacity_low_min, 50),
    coverage_analysis_period_months = COALESCE(coverage_analysis_period_months, 1)
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Add comments
COMMENT ON COLUMN settings.coverage_requests_per_provider IS 'Número de pedidos que 1 prestador consegue cobrir por período (default: 20)';
COMMENT ON COLUMN settings.coverage_capacity_good_min IS '% mínima de capacidade para boa cobertura (default: 100%)';
COMMENT ON COLUMN settings.coverage_capacity_low_min IS '% mínima de capacidade para baixa cobertura (default: 50%)';
COMMENT ON COLUMN settings.coverage_analysis_period_months IS 'Número de meses a considerar para análise de pedidos (default: 1 - mês atual)';
