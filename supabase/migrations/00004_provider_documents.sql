-- Tabela para documentos de prestadores
CREATE TABLE IF NOT EXISTS provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  document_type TEXT, -- contrato, identificacao, certificado, seguro, comprovativo, outro
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_provider_documents_provider_id ON provider_documents(provider_id);
CREATE INDEX idx_provider_documents_document_type ON provider_documents(document_type);
CREATE INDEX idx_provider_documents_created_at ON provider_documents(created_at DESC);

-- RLS
ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura a utilizadores autenticados
CREATE POLICY "Users can view provider documents"
  ON provider_documents FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserção a utilizadores autenticados
CREATE POLICY "Users can upload provider documents"
  ON provider_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir eliminação a utilizadores autenticados
CREATE POLICY "Users can delete provider documents"
  ON provider_documents FOR DELETE
  TO authenticated
  USING (true);

-- Criar bucket de storage para documentos (executar no Supabase Dashboard ou via API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('provider-documents', 'provider-documents', true)
-- ON CONFLICT (id) DO NOTHING;
