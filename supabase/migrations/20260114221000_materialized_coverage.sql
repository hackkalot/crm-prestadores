-- Create materialized view for coverage data (much faster)

-- Drop function-based approach
DROP VIEW IF EXISTS provider_coverage_by_service CASCADE;

-- Create materialized view that can be refreshed periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_coverage_by_service_materialized AS
WITH active_providers AS (
  SELECT
    p.id,
    p.name,
    p.services
  FROM providers p
  WHERE p.status = 'ativo'
),
request_data AS (
  SELECT
    st.id AS taxonomy_service_id,
    st.category,
    st.service,
    sr.client_district,
    sr.client_town,
    sr.id AS request_id,
    sr.created_at
  FROM service_taxonomy st
  INNER JOIN service_requests sr
    ON sr.category = st.category
    AND sr.service = st.service
    AND sr.client_town IS NOT NULL
)
SELECT
  rd.taxonomy_service_id,
  rd.category::TEXT,
  rd.service::TEXT,
  rd.client_district::TEXT AS district,
  rd.client_town::TEXT AS municipality,
  rd.created_at AS request_created_at,

  -- Provider data
  ARRAY_AGG(DISTINCT ap.id) FILTER (WHERE ap.id IS NOT NULL) AS provider_ids,
  ARRAY_AGG(DISTINCT ap.name) FILTER (WHERE ap.id IS NOT NULL)::TEXT[] AS provider_names

FROM request_data rd
LEFT JOIN service_mapping sm
  ON sm.taxonomy_service_id = rd.taxonomy_service_id
  AND sm.verified = true
LEFT JOIN active_providers ap
  ON ap.services::text ILIKE '%' || sm.provider_service_name || '%'

GROUP BY rd.taxonomy_service_id, rd.category, rd.service, rd.client_district, rd.client_town, rd.request_id, rd.created_at;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mat_cov_created_at ON provider_coverage_by_service_materialized(request_created_at);
CREATE INDEX IF NOT EXISTS idx_mat_cov_municipality ON provider_coverage_by_service_materialized(municipality);
CREATE INDEX IF NOT EXISTS idx_mat_cov_taxonomy ON provider_coverage_by_service_materialized(taxonomy_service_id);

-- Create fast function that queries materialized view
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
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    taxonomy_service_id,
    category,
    service,
    district,
    municipality,
    COUNT(DISTINCT request_created_at)::BIGINT AS request_count,
    COUNT(DISTINCT provider_id)::BIGINT AS provider_count,
    ARRAY_AGG(DISTINCT provider_id) FILTER (WHERE provider_id IS NOT NULL) AS provider_ids,
    ARRAY_AGG(DISTINCT provider_name) FILTER (WHERE provider_name IS NOT NULL)::TEXT[] AS provider_names
  FROM (
    SELECT
      m.taxonomy_service_id,
      m.category,
      m.service,
      m.district,
      m.municipality,
      m.request_created_at,
      unnest(m.provider_ids) AS provider_id,
      unnest(m.provider_names) AS provider_name
    FROM provider_coverage_by_service_materialized m
    WHERE m.request_created_at >= (CURRENT_DATE - make_interval(months => period_months))
  ) AS flattened
  GROUP BY taxonomy_service_id, category, service, district, municipality
  HAVING COUNT(DISTINCT request_created_at) > 0;
$$;

-- Create view for backward compatibility (1 month default)
CREATE OR REPLACE VIEW provider_coverage_by_service AS
SELECT * FROM get_provider_coverage_by_service(1);

-- Grant permissions
GRANT SELECT ON provider_coverage_by_service_materialized TO authenticated;
GRANT SELECT ON provider_coverage_by_service_materialized TO service_role;
GRANT EXECUTE ON FUNCTION get_provider_coverage_by_service TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_coverage_by_service TO service_role;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW provider_coverage_by_service_materialized;

-- Comments
COMMENT ON MATERIALIZED VIEW provider_coverage_by_service_materialized IS 'Materialized coverage data - refresh periodically for best performance';
COMMENT ON FUNCTION get_provider_coverage_by_service IS 'Fast coverage query using materialized view with configurable period';
