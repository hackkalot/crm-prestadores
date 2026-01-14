-- Alterar configurações de cobertura para usar % de capacidade em vez de números fixos

-- Remover colunas antigas
ALTER TABLE settings
DROP COLUMN IF EXISTS coverage_good_min_providers,
DROP COLUMN IF EXISTS coverage_low_min_providers;

-- Adicionar novas colunas baseadas em % de capacidade
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS coverage_requests_per_provider INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS coverage_capacity_good_min INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS coverage_capacity_low_min INTEGER DEFAULT 50;

-- Comentários
COMMENT ON COLUMN settings.coverage_requests_per_provider IS 'Número de pedidos que 1 prestador consegue cobrir por período (default: 20)';
COMMENT ON COLUMN settings.coverage_capacity_good_min IS '% mínima de capacidade para boa cobertura (default: 100%)';
COMMENT ON COLUMN settings.coverage_capacity_low_min IS '% mínima de capacidade para baixa cobertura (default: 50%)';
COMMENT ON COLUMN settings.coverage_analysis_period_months IS 'Número de meses a considerar para análise de pedidos (default: 1 - mês atual)';

-- Atualizar comentário da view
COMMENT ON VIEW provider_coverage_by_service IS 'Cobertura de prestadores por serviço e concelho, com contagem de pedidos para cálculo de capacidade';
COMMENT ON VIEW municipality_coverage_overview IS 'Overview de cobertura por concelho (cálculo de capacidade: (prestadores × requests_per_provider) / pedidos × 100%)';
