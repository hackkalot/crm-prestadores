-- Modificar provider_prices para usar angariacao_reference_prices
-- Drop tabela antiga se existir (estava vazia)
DROP TABLE IF EXISTS provider_prices CASCADE;

-- Criar nova estrutura
CREATE TABLE provider_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) NOT NULL,
  reference_price_id UUID REFERENCES angariacao_reference_prices(id) NOT NULL,

  -- Preço customizado (NULL = usar preço de referência)
  custom_price_without_vat DECIMAL(10,2),

  -- Seleção para PDF
  is_selected_for_proposal BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: único por prestador + serviço de referência
  UNIQUE(provider_id, reference_price_id)
);

-- Índices
CREATE INDEX idx_provider_prices_provider ON provider_prices(provider_id);
CREATE INDEX idx_provider_prices_reference ON provider_prices(reference_price_id);
CREATE INDEX idx_provider_prices_selected ON provider_prices(provider_id, is_selected_for_proposal) WHERE is_selected_for_proposal = true;

-- RLS policies
ALTER TABLE provider_prices ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem ver
CREATE POLICY "Authenticated users can view provider prices"
  ON provider_prices FOR SELECT
  TO authenticated
  USING (true);

-- Admins e RMs podem inserir/atualizar
CREATE POLICY "Admins and RMs can modify provider prices"
  ON provider_prices FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'relationship_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'relationship_manager'));

-- Comentários
COMMENT ON TABLE provider_prices IS 'Preços personalizados e seleções para proposta de cada prestador';
COMMENT ON COLUMN provider_prices.custom_price_without_vat IS 'Preço customizado sem IVA. NULL = usar preço de referência';
COMMENT ON COLUMN provider_prices.is_selected_for_proposal IS 'Se TRUE, incluir este serviço na proposta/PDF';
