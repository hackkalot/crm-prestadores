-- Tabela de preços de referência para angariação
-- Fonte: PreçosAngariação_Tabela Resumo.xlsx

-- =============================================================================
-- TABELA 1: Preços de Serviços de Angariação
-- =============================================================================
CREATE TABLE IF NOT EXISTS angariacao_reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do serviço
  service_name TEXT NOT NULL,           -- "Limpeza da casa", "Canalizador"
  cluster TEXT NOT NULL,                 -- "Casa", "Saúde e bem estar", "Empresas", "Luxo", "Pete"
  service_group TEXT,                    -- "Limpezas domésticas", "Ar condicionado", etc.

  -- Variante
  unit_description TEXT NOT NULL,        -- "Por hora", "T0-T2", "1ª instalação"
  typology TEXT,                         -- "Baratas, formigas..." ou null

  -- IVA
  vat_rate DECIMAL(5,2) NOT NULL,        -- 0, 6, 23

  -- Data de lançamento do serviço
  launch_date DATE,

  -- Preços (podem ser null dependendo do tipo de serviço)
  price_base DECIMAL(10,2),              -- Valor s/ IVA (principal)
  price_new_visit DECIMAL(10,2),         -- Novas visitas
  price_extra_night DECIMAL(10,2),       -- Noites seguintes
  price_hour_no_materials DECIMAL(10,2), -- Por hora sem materiais
  price_hour_with_materials DECIMAL(10,2), -- Por hora com materiais
  price_cleaning DECIMAL(10,2),          -- Só limpeza
  price_cleaning_treatments DECIMAL(10,2), -- Limpeza + tratamentos
  price_cleaning_imper DECIMAL(10,2),    -- Limpeza + impermeabilização
  price_cleaning_imper_treatments DECIMAL(10,2), -- Limpeza + imper. + tratamentos

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único funcional para unicidade (permite NULL em typology)
CREATE UNIQUE INDEX IF NOT EXISTS angariacao_reference_prices_unique_idx
  ON angariacao_reference_prices(service_name, unit_description, COALESCE(typology, ''));

-- Índices para pesquisa
CREATE INDEX IF NOT EXISTS idx_angariacao_prices_service ON angariacao_reference_prices(service_name);
CREATE INDEX IF NOT EXISTS idx_angariacao_prices_cluster ON angariacao_reference_prices(cluster);
CREATE INDEX IF NOT EXISTS idx_angariacao_prices_group ON angariacao_reference_prices(service_group);
CREATE INDEX IF NOT EXISTS idx_angariacao_prices_active ON angariacao_reference_prices(is_active);

-- =============================================================================
-- TABELA 2: Materiais de Canalizador
-- =============================================================================
CREATE TABLE IF NOT EXISTS angariacao_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  material_name TEXT NOT NULL UNIQUE,    -- "Emboque de sanita normal"
  category TEXT DEFAULT 'Canalizador',   -- Categoria do material

  -- Preço
  price_without_vat DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_angariacao_materials_category ON angariacao_materials(category);
CREATE INDEX IF NOT EXISTS idx_angariacao_materials_active ON angariacao_materials(is_active);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Habilitar RLS
ALTER TABLE angariacao_reference_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE angariacao_materials ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura para authenticated users
CREATE POLICY "Allow read angariacao_reference_prices for authenticated"
  ON angariacao_reference_prices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read angariacao_materials for authenticated"
  ON angariacao_materials
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas de escrita apenas para service_role
CREATE POLICY "Allow all for service_role on angariacao_reference_prices"
  ON angariacao_reference_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for service_role on angariacao_materials"
  ON angariacao_materials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Comentários
-- =============================================================================
COMMENT ON TABLE angariacao_reference_prices IS 'Preços de referência para serviços de angariação - importados do Excel PreçosAngariação_Tabela Resumo.xlsx';
COMMENT ON TABLE angariacao_materials IS 'Materiais de canalizador com preços - importados do Excel PreçosAngariação_Tabela Resumo.xlsx';

COMMENT ON COLUMN angariacao_reference_prices.cluster IS 'Cluster: Casa, Saúde e bem estar, Empresas, Luxo, Pete';
COMMENT ON COLUMN angariacao_reference_prices.service_group IS 'Grupo interno: Limpezas domésticas, Ar condicionado, etc.';
COMMENT ON COLUMN angariacao_reference_prices.unit_description IS 'Unidade/variante: Por hora, T0-T2, 1ª instalação, etc.';
COMMENT ON COLUMN angariacao_reference_prices.typology IS 'Tipologia específica (ex: tipo de praga para controlo de pragas)';
