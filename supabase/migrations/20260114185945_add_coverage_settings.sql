-- Adicionar configurações de thresholds de cobertura à tabela settings

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS coverage_good_min_providers INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS coverage_low_min_providers INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS coverage_analysis_period_months INTEGER DEFAULT 1;

-- Comentários
COMMENT ON COLUMN settings.coverage_good_min_providers IS 'Número mínimo de prestadores para considerar boa cobertura (default: 3)';
COMMENT ON COLUMN settings.coverage_low_min_providers IS 'Número mínimo de prestadores para considerar baixa cobertura (default: 1)';
COMMENT ON COLUMN settings.coverage_analysis_period_months IS 'Número de meses a considerar para análise de pedidos (default: 1 - mês atual)';

-- Atualizar view para incluir contagem de pedidos no período
DROP VIEW IF EXISTS provider_coverage_by_service;

CREATE OR REPLACE VIEW provider_coverage_by_service AS
SELECT
  st.id AS taxonomy_service_id,
  st.category,
  st.service,
  sr.client_district AS district,
  sr.client_town AS municipality,

  -- Contagem de pedidos (usando a data mais recente disponível)
  COUNT(DISTINCT sr.id) AS request_count,

  -- Contagem de prestadores através do mapeamento
  COUNT(DISTINCT CASE
    WHEN p.id IS NOT NULL AND p.status = 'ativo'
    THEN p.id
  END) AS provider_count,

  ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL AND p.status = 'ativo') AS provider_ids,
  ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL AND p.status = 'ativo') AS provider_names

FROM service_taxonomy st
INNER JOIN service_requests sr
  ON sr.category = st.category
  AND sr.service = st.service
LEFT JOIN service_mapping sm
  ON sm.taxonomy_service_id = st.id
  AND sm.verified = true
LEFT JOIN providers p
  ON p.status = 'ativo'
  AND p.services::text ILIKE '%' || sm.provider_service_name || '%'

WHERE sr.client_town IS NOT NULL
  -- Filtrar pedidos do último mês (pode ser ajustado via query parameter)
  AND sr.created_at >= (CURRENT_DATE - INTERVAL '1 month')

GROUP BY st.id, st.category, st.service, sr.client_district, sr.client_town
HAVING COUNT(DISTINCT sr.id) > 0; -- Apenas concelhos com pedidos

-- Criar view auxiliar para overview de concelhos
CREATE OR REPLACE VIEW municipality_coverage_overview AS
SELECT
  municipality,
  district,
  COUNT(DISTINCT taxonomy_service_id) AS total_services,
  SUM(request_count) AS total_requests,
  AVG(provider_count) AS avg_providers_per_service,

  -- Contagem por status (usando thresholds default)
  COUNT(DISTINCT taxonomy_service_id) FILTER (WHERE provider_count >= 3) AS services_good_coverage,
  COUNT(DISTINCT taxonomy_service_id) FILTER (WHERE provider_count >= 1 AND provider_count < 3) AS services_low_coverage,
  COUNT(DISTINCT taxonomy_service_id) FILTER (WHERE provider_count < 1) AS services_at_risk

FROM provider_coverage_by_service
GROUP BY municipality, district;

COMMENT ON VIEW provider_coverage_by_service IS 'Cobertura de prestadores por serviço e concelho, apenas concelhos com pedidos no período';
COMMENT ON VIEW municipality_coverage_overview IS 'Overview de cobertura por concelho com estatísticas agregadas';
