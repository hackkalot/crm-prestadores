-- Use exact service name matching instead of ILIKE
-- Since providers.services is a JSON array with exact service names,
-- we can use the @> (contains) operator for precise matching

-- Drop existing function and view
DROP VIEW IF EXISTS provider_coverage_by_service CASCADE;
DROP FUNCTION IF EXISTS get_provider_coverage_by_service(INTEGER) CASCADE;

-- Create function with exact service matching
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
BEGIN
  RETURN QUERY
  SELECT
    st.id AS taxonomy_service_id,
    st.category::TEXT,
    st.service::TEXT,
    sr.client_district::TEXT AS district,
    sr.client_town::TEXT AS municipality,

    -- Contagem de pedidos (usando período configurável)
    COUNT(DISTINCT sr.id) AS request_count,

    -- Contagem de prestadores através do mapeamento
    COUNT(DISTINCT CASE
      WHEN p.id IS NOT NULL AND p.status = 'ativo'
      THEN p.id
    END) AS provider_count,

    ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL AND p.status = 'ativo') AS provider_ids,
    ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL AND p.status = 'ativo')::TEXT[] AS provider_names

  FROM service_taxonomy st
  INNER JOIN service_requests sr
    ON sr.category = st.category
    AND sr.service = st.service
  LEFT JOIN service_mapping sm
    ON sm.taxonomy_service_id = st.id
    AND sm.verified = true
  LEFT JOIN providers p
    ON p.status = 'ativo'
    -- Exact match: check if services array contains the exact service name
    AND p.services @> to_jsonb(ARRAY[sm.provider_service_name])
    -- Filter by district coverage
    AND sr.client_district = ANY(p.districts)

  WHERE sr.client_town IS NOT NULL
    -- Usar período dinâmico baseado no parâmetro
    AND sr.created_at >= (CURRENT_DATE - make_interval(months => period_months))

  GROUP BY st.id, st.category, st.service, sr.client_district, sr.client_town
  HAVING COUNT(DISTINCT sr.id) > 0; -- Apenas concelhos com pedidos
END;
$$;

-- Create view that uses default period (1 month) for backward compatibility
CREATE OR REPLACE VIEW provider_coverage_by_service AS
SELECT * FROM get_provider_coverage_by_service(1);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_provider_coverage_by_service TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_coverage_by_service TO service_role;

-- Comments
COMMENT ON FUNCTION get_provider_coverage_by_service IS 'Retorna cobertura de prestadores por serviço e concelho. Usa correspondência exata de serviços e filtra por distrito.';
COMMENT ON VIEW provider_coverage_by_service IS 'Cobertura de prestadores por serviço e concelho (default: último mês)';
