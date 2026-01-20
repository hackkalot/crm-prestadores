-- Migration: Rename angariacao tables to cleaner names
-- angariacao_reference_prices -> service_prices
-- angariacao_materials -> material_catalog
-- Date: 2026-01-20

-- 1. Rename angariacao_reference_prices to service_prices
ALTER TABLE IF EXISTS angariacao_reference_prices RENAME TO service_prices;

-- 2. Rename angariacao_materials to material_catalog
ALTER TABLE IF EXISTS angariacao_materials RENAME TO material_catalog;

-- 3. Update index names for service_prices (using IF EXISTS)
ALTER INDEX IF EXISTS idx_angariacao_ref_prices_cluster RENAME TO idx_service_prices_cluster;
ALTER INDEX IF EXISTS idx_angariacao_ref_prices_service_name RENAME TO idx_service_prices_service_name;
ALTER INDEX IF EXISTS idx_angariacao_ref_prices_service_group RENAME TO idx_service_prices_service_group;
ALTER INDEX IF EXISTS idx_angariacao_ref_prices_is_active RENAME TO idx_service_prices_is_active;

-- 4. Update index names for material_catalog (using IF EXISTS)
ALTER INDEX IF EXISTS idx_angariacao_materials_categoria RENAME TO idx_material_catalog_categoria;
ALTER INDEX IF EXISTS idx_angariacao_materials_is_active RENAME TO idx_material_catalog_is_active;

-- 5. Recreate RLS policies for service_prices with new names
-- Drop old policies if they exist (ignore errors if they don't)
DO $$
BEGIN
  -- Try to drop old policy names
  BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to read angariacao_reference_prices" ON service_prices;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Allow service_role to manage angariacao_reference_prices" ON service_prices;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Create policies with new names if they don't exist
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_prices' AND policyname = 'Allow authenticated users to read service_prices') THEN
    CREATE POLICY "Allow authenticated users to read service_prices" ON service_prices
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_prices' AND policyname = 'Allow service_role to manage service_prices') THEN
    CREATE POLICY "Allow service_role to manage service_prices" ON service_prices
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Recreate RLS policies for material_catalog with new names
DO $$
BEGIN
  -- Try to drop old policy names
  BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to read angariacao_materials" ON material_catalog;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Allow service_role to manage angariacao_materials" ON material_catalog;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Create policies with new names if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'material_catalog' AND policyname = 'Allow authenticated users to read material_catalog') THEN
    CREATE POLICY "Allow authenticated users to read material_catalog" ON material_catalog
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'material_catalog' AND policyname = 'Allow service_role to manage material_catalog') THEN
    CREATE POLICY "Allow service_role to manage material_catalog" ON material_catalog
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Note: Foreign keys referencing these tables (e.g., provider_prices.reference_price_id)
-- will automatically update as PostgreSQL tracks by OID, not by name
