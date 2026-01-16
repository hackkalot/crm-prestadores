-- Alterar configurações de cobertura para usar % de capacidade em vez de números fixos
-- NOTA: As configurações de cobertura são guardadas em formato key-value na tabela settings
-- Ver migration 20260114200000_ensure_coverage_settings.sql

-- Atualizar comentário da view
COMMENT ON VIEW provider_coverage_by_service IS 'Cobertura de prestadores por serviço e concelho, com contagem de pedidos para cálculo de capacidade';
COMMENT ON VIEW municipality_coverage_overview IS 'Overview de cobertura por concelho (cálculo de capacidade: (prestadores × requests_per_provider) / pedidos × 100%)';
