-- Migration: Refactor provider_prices to provider_custom_prices
-- Purpose: Only store custom prices (different from reference), not selections
-- Selections are now handled in client state only

-- Step 1: Create new table with simplified structure
CREATE TABLE IF NOT EXISTS provider_custom_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  reference_price_id UUID NOT NULL REFERENCES service_prices(id) ON DELETE CASCADE,
  custom_price_without_vat NUMERIC(10,2) NOT NULL, -- Now required, not nullable
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(provider_id, reference_price_id)
);

-- Step 2: Migrate data - only records with actual custom prices
INSERT INTO provider_custom_prices (
  id,
  provider_id,
  reference_price_id,
  custom_price_without_vat,
  notes,
  created_at,
  created_by,
  updated_at,
  updated_by
)
SELECT
  id,
  provider_id,
  reference_price_id,
  custom_price_without_vat,
  notes,
  created_at,
  created_by,
  updated_at,
  updated_by
FROM provider_prices
WHERE custom_price_without_vat IS NOT NULL;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_provider_custom_prices_provider_id
  ON provider_custom_prices(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_custom_prices_reference_price_id
  ON provider_custom_prices(reference_price_id);

-- Step 4: Enable RLS
ALTER TABLE provider_custom_prices ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (same as the old table)
CREATE POLICY "Allow authenticated users to read provider_custom_prices"
  ON provider_custom_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert provider_custom_prices"
  ON provider_custom_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update provider_custom_prices"
  ON provider_custom_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete provider_custom_prices"
  ON provider_custom_prices FOR DELETE
  TO authenticated
  USING (true);

-- Step 6: Drop old table
DROP TABLE IF EXISTS provider_prices;

-- Step 7: Add comment for documentation
COMMENT ON TABLE provider_custom_prices IS 'Stores only custom prices for providers. If no record exists, the reference price is used.';
