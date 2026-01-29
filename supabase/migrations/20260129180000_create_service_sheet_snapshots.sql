-- =============================================
-- Tabela: provider_service_sheet_snapshots
-- Guarda histórico de fichas de serviço geradas
-- =============================================
CREATE TABLE IF NOT EXISTS provider_service_sheet_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  snapshot_name VARCHAR(255),
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_sheet_snapshots_provider ON provider_service_sheet_snapshots(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_sheet_snapshots_created_at ON provider_service_sheet_snapshots(created_at DESC);

-- RLS
ALTER TABLE provider_service_sheet_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Allow read for authenticated" ON provider_service_sheet_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated" ON provider_service_sheet_snapshots
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON provider_service_sheet_snapshots
  FOR ALL TO service_role USING (true);
