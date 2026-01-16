-- Optimize coverage function for better performance

-- 1. Add indexes to improve JOIN performance
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_town_date ON service_requests(client_town, created_at) WHERE client_town IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_category_service ON service_requests(category, service);
CREATE INDEX IF NOT EXISTS idx_service_mapping_taxonomy_verified ON service_mapping(taxonomy_service_id, verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status) WHERE status = 'ativo';

-- 2. Optimize the function with materialized subquery
CREATE OR REPLACE FUNCTION get_provider_coverage_by_service(period_months INTEGER DEFAULT 1)
RETURNS TABLE (
  taxonomy_service_id UUID,
  category TEXT,
  service TEXT,
  district TEXT,
  municipality TEXT,
  request_count BIGINT,
  provider_count BIGINT,
  provider_ids UUID[],
  provider_names TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE;
BEGIN
  -- Calculate start date once
  start_date := CURRENT_DATE - make_interval(months => period_months);

  RETURN QUERY
  WITH active_providers AS (
    -- Materialize active providers once
    SELECT
      p.id,
      p.name,
      p.services
    FROM providers p
    WHERE p.status = 'ativo'
  ),
  request_counts AS (
    -- Pre-aggregate request counts by location and service
    SELECT
      st.id AS taxonomy_service_id,
      st.category,
      st.service,
      sr.client_district,
      sr.client_town,
      COUNT(DISTINCT sr.id) AS request_count
    FROM service_taxonomy st
    INNER JOIN service_requests sr
      ON sr.category = st.category
      AND sr.service = st.service
      AND sr.client_town IS NOT NULL
      AND sr.created_at >= start_date
    GROUP BY st.id, st.category, st.service, sr.client_district, sr.client_town
    HAVING COUNT(DISTINCT sr.id) > 0
  )
  SELECT
    rc.taxonomy_service_id,
    rc.category::TEXT,
    rc.service::TEXT,
    rc.client_district::TEXT AS district,
    rc.client_town::TEXT AS municipality,
    rc.request_count,

    -- Count providers for this service
    COUNT(DISTINCT CASE
      WHEN ap.id IS NOT NULL
      THEN ap.id
    END) AS provider_count,

    ARRAY_AGG(DISTINCT ap.id) FILTER (WHERE ap.id IS NOT NULL) AS provider_ids,
    ARRAY_AGG(DISTINCT ap.name) FILTER (WHERE ap.id IS NOT NULL)::TEXT[] AS provider_names

  FROM request_counts rc
  LEFT JOIN service_mapping sm
    ON sm.taxonomy_service_id = rc.taxonomy_service_id
    AND sm.verified = true
  LEFT JOIN active_providers ap
    ON ap.services::text ILIKE '%' || sm.provider_service_name || '%'

  GROUP BY rc.taxonomy_service_id, rc.category, rc.service, rc.client_district, rc.client_town, rc.request_count;
END;
$$;

-- Comments
COMMENT ON FUNCTION get_provider_coverage_by_service IS 'Retorna cobertura de prestadores por serviço e concelho, com período configurável em meses (otimizado)';
