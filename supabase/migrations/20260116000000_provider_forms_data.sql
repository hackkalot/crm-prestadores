-- Criar tabela para dados do forms de serviços
CREATE TABLE IF NOT EXISTS provider_forms_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) NOT NULL UNIQUE,

  -- Documentação
  has_activity_declaration BOOLEAN DEFAULT false,
  has_liability_insurance BOOLEAN DEFAULT false,
  has_work_accidents_insurance BOOLEAN DEFAULT false,
  certifications TEXT[],
  works_with_platforms TEXT[],

  -- Disponibilidade
  available_weekdays TEXT[], -- ["monday", "tuesday", ...]
  work_hours_start TIME,
  work_hours_end TIME,
  num_technicians INTEGER,

  -- Recursos
  has_transport BOOLEAN DEFAULT false,
  has_computer BOOLEAN DEFAULT false,
  own_equipment TEXT[],

  -- Serviços selecionados (IDs de angariacao_reference_prices)
  selected_services UUID[],

  -- Cobertura geográfica
  coverage_municipalities TEXT[],

  -- Metadata
  submitted_at TIMESTAMPTZ,
  submitted_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_provider_forms_data_provider ON provider_forms_data(provider_id);
CREATE INDEX idx_provider_forms_data_submitted ON provider_forms_data(submitted_at);
CREATE INDEX idx_provider_forms_data_services ON provider_forms_data USING GIN(selected_services);
CREATE INDEX idx_provider_forms_data_municipalities ON provider_forms_data USING GIN(coverage_municipalities);

-- RLS policies
ALTER TABLE provider_forms_data ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e editar tudo
CREATE POLICY "Admins can view all forms data"
  ON provider_forms_data FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert forms data"
  ON provider_forms_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update forms data"
  ON provider_forms_data FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Permitir acesso público para submit (via service role)
CREATE POLICY "Service role can insert forms"
  ON provider_forms_data FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE provider_forms_data IS 'Dados capturados no forms de seleção de serviços do prestador';
COMMENT ON COLUMN provider_forms_data.selected_services IS 'Array de UUIDs referenciando angariacao_reference_prices';
COMMENT ON COLUMN provider_forms_data.coverage_municipalities IS 'Lista de concelhos onde o prestador atua';
