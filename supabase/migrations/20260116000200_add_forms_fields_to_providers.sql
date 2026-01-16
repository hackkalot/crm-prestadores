-- Adicionar campos relacionados ao forms no providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS forms_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forms_response_id TEXT,
  ADD COLUMN IF NOT EXISTS forms_token TEXT UNIQUE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_providers_forms_submitted ON providers(forms_submitted_at);
CREATE INDEX IF NOT EXISTS idx_providers_forms_token ON providers(forms_token);

-- Comentários
COMMENT ON COLUMN providers.forms_submitted_at IS 'Data de submissão do forms de serviços';
COMMENT ON COLUMN providers.forms_response_id IS 'ID da resposta do forms (para rastreamento)';
COMMENT ON COLUMN providers.forms_token IS 'Token único para acesso ao forms (encriptado)';
