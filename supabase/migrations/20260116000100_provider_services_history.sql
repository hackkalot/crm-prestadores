-- Criar tabela para histórico de alterações de serviços
CREATE TABLE IF NOT EXISTS provider_services_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) NOT NULL,

  -- Dados antes e depois
  services_before TEXT[], -- Serviços antigos (providers.services)
  services_after UUID[], -- Serviços novos (angariacao_reference_prices IDs)

  -- Metadata
  source TEXT NOT NULL, -- 'forms_submission', 'manual_edit', 'import', etc.
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Índices
CREATE INDEX idx_provider_services_history_provider ON provider_services_history(provider_id);
CREATE INDEX idx_provider_services_history_date ON provider_services_history(changed_at DESC);
CREATE INDEX idx_provider_services_history_source ON provider_services_history(source);

-- RLS policies
ALTER TABLE provider_services_history ENABLE ROW LEVEL SECURITY;

-- Admins e RMs podem ver histórico
CREATE POLICY "Authenticated users can view services history"
  ON provider_services_history FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Admins can insert services history"
  ON provider_services_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Service role pode inserir (via forms)
CREATE POLICY "Service role can insert history"
  ON provider_services_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE provider_services_history IS 'Histórico de alterações dos serviços do prestador';
COMMENT ON COLUMN provider_services_history.services_before IS 'Serviços antigos (formato texto livre)';
COMMENT ON COLUMN provider_services_history.services_after IS 'Serviços novos (IDs estruturados)';
COMMENT ON COLUMN provider_services_history.source IS 'Origem da alteração';
