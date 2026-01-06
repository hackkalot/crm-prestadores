-- Criar bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir upload por utilizadores autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated uploads"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'provider-documents');
  END IF;
END $$;

-- Permitir leitura pública
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow public read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'provider-documents');
  END IF;
END $$;

-- Permitir delete por utilizadores autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'provider-documents');
  END IF;
END $$;
