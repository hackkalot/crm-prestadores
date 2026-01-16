-- Ensure coverage settings exist in key-value format (idempotent)

-- Insert coverage settings as a JSON value if it doesn't exist
INSERT INTO settings (
  id,
  key,
  value,
  description
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  'coverage_thresholds',
  jsonb_build_object(
    'requests_per_provider', 20,
    'capacity_good_min', 100,
    'capacity_low_min', 50,
    'analysis_period_months', 1
  ),
  'Configurações de thresholds de cobertura da rede'
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE key = 'coverage_thresholds'
);
