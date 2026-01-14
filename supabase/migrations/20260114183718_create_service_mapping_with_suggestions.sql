-- Sistema de mapeamento de serviços com feedback loop
-- Permite aprendizagem contínua através de validação humana

-- 1. Tabela principal de mapeamento (matches confirmados)
CREATE TABLE IF NOT EXISTS service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_name TEXT NOT NULL,
  taxonomy_service_id UUID NOT NULL REFERENCES service_taxonomy(id) ON DELETE CASCADE,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  match_type TEXT CHECK (match_type IN ('exact', 'high', 'medium', 'low', 'manual')),

  -- Verificação humana
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_service_name, taxonomy_service_id)
);

-- 2. Tabela de sugestões pendentes (matches incertos que precisam review)
CREATE TABLE IF NOT EXISTS service_mapping_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_name TEXT NOT NULL,

  -- Top 3 sugestões do algoritmo
  suggested_taxonomy_id_1 UUID REFERENCES service_taxonomy(id) ON DELETE CASCADE,
  suggested_score_1 INTEGER,
  suggested_taxonomy_id_2 UUID REFERENCES service_taxonomy(id) ON DELETE CASCADE,
  suggested_score_2 INTEGER,
  suggested_taxonomy_id_3 UUID REFERENCES service_taxonomy(id) ON DELETE CASCADE,
  suggested_score_3 INTEGER,

  -- Decisão do admin
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_new_taxonomy')),
  approved_taxonomy_id UUID REFERENCES service_taxonomy(id) ON DELETE SET NULL,

  -- Feedback para melhorar algoritmo
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_service_name)
);

-- 3. Histórico de feedback (para treinar algoritmo)
CREATE TABLE IF NOT EXISTS service_mapping_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_name TEXT NOT NULL,
  suggested_taxonomy_id UUID REFERENCES service_taxonomy(id) ON DELETE CASCADE,
  actual_taxonomy_id UUID REFERENCES service_taxonomy(id) ON DELETE CASCADE,

  -- Métricas para aprendizagem
  algorithm_score INTEGER,
  was_correct BOOLEAN, -- Se sugestão estava certa
  user_id UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_service_mapping_provider_service ON service_mapping(provider_service_name);
CREATE INDEX IF NOT EXISTS idx_service_mapping_taxonomy_service ON service_mapping(taxonomy_service_id);
CREATE INDEX IF NOT EXISTS idx_service_mapping_verified ON service_mapping(verified);

CREATE INDEX IF NOT EXISTS idx_service_mapping_suggestions_status ON service_mapping_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_service_mapping_suggestions_pending ON service_mapping_suggestions(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_service_mapping_feedback_was_correct ON service_mapping_feedback(was_correct);

-- View para facilitar queries de cobertura por concelho
CREATE OR REPLACE VIEW provider_coverage_by_service AS
SELECT
  st.id AS taxonomy_service_id,
  st.category,
  st.service,
  sr.client_district AS district,
  sr.client_town AS municipality,
  COUNT(DISTINCT p.id) AS provider_count,
  ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) AS provider_ids,
  ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) AS provider_names
FROM service_taxonomy st
LEFT JOIN service_requests sr
  ON sr.category = st.category
  AND sr.service = st.service
LEFT JOIN service_mapping sm
  ON sm.taxonomy_service_id = st.id
  AND sm.verified = true
LEFT JOIN providers p
  ON p.status = 'ativo'
  AND (
    -- Match exato no campo services (se for texto)
    p.services::text ILIKE '%' || sm.provider_service_name || '%'
  )
WHERE sr.client_town IS NOT NULL
GROUP BY st.id, st.category, st.service, sr.client_district, sr.client_town;

-- Comentários
COMMENT ON TABLE service_mapping IS 'Mapeamento verificado entre serviços dos prestadores e taxonomia unificada';
COMMENT ON TABLE service_mapping_suggestions IS 'Sugestões de mapeamento pendentes de revisão humana (feedback loop)';
COMMENT ON TABLE service_mapping_feedback IS 'Histórico de feedback para treinar algoritmo de matching';

COMMENT ON COLUMN service_mapping.verified IS 'Se o mapeamento foi verificado por um utilizador';
COMMENT ON COLUMN service_mapping_suggestions.status IS 'pending: aguarda review | approved: aceite | rejected: rejeitado | needs_new_taxonomy: criar novo serviço';
COMMENT ON VIEW provider_coverage_by_service IS 'Cobertura de prestadores por serviço e concelho (para mapa da rede)';
