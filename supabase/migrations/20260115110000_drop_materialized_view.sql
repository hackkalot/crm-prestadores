-- Drop unused materialized view
-- The function get_provider_coverage_by_service now queries tables directly
-- The materialized view is no longer used and just takes up space

DROP MATERIALIZED VIEW IF EXISTS provider_coverage_by_service_materialized CASCADE;
