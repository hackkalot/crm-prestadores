-- Service Mapping gerado automaticamente via fuzzy matching
-- 88 matches automáticos (exact + high confidence >= 85%)
-- Gerado em 2026-01-14T18:26:02.349Z

-- Criar tabela de mapeamento (se não existir)
CREATE TABLE IF NOT EXISTS service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_name TEXT NOT NULL,
  taxonomy_service_id UUID NOT NULL REFERENCES service_taxonomy(id),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  match_type TEXT CHECK (match_type IN ('exact', 'high', 'medium', 'low', 'manual')),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_service_name, taxonomy_service_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_service_mapping_provider_service ON service_mapping(provider_service_name);
CREATE INDEX IF NOT EXISTS idx_service_mapping_taxonomy_service ON service_mapping(taxonomy_service_id);
CREATE INDEX IF NOT EXISTS idx_service_mapping_verified ON service_mapping(verified);

-- Inserir matches automáticos
INSERT INTO service_mapping (provider_service_name, taxonomy_service_id, confidence_score, match_type)
VALUES
  ('Limpeza da casa', '0220012a-6aa9-49f1-8e1d-06b041a270eb', 100, 'exact'),
  ('Engomadoria com recolha', '37d96757-ec2f-4b2d-a238-5761e97aaaab', 100, 'exact'),
  ('Engomadoria com recolha de camisas e calças', '37d96757-ec2f-4b2d-a238-5761e97aaaab', 100, 'exact'),
  ('Limpeza profunda', '006946ed-55ac-4f55-97a6-a2c742493914', 100, 'exact'),
  ('Engomadoria com recolha de lençóis e toalhas', '37d96757-ec2f-4b2d-a238-5761e97aaaab', 100, 'exact'),
  ('Instalação de eletrodomésticos', '850ecfd7-1f87-461e-8ef6-737771ddbc6e', 100, 'exact'),
  ('Instalação de candeeiros', 'f6ae9b8e-439d-423e-bb92-adcc5c39bbf4', 100, 'exact'),
  ('Lavandaria e engomadoria com recolha', '37d96757-ec2f-4b2d-a238-5761e97aaaab', 100, 'exact'),
  ('Lavandaria com recolha', '37ad142a-cfd0-45f8-9f70-8f92ca15f3ae', 100, 'exact'),
  ('Instalação de interruptores e tomadas', '21d63a12-0ddd-4a92-85ec-6e952c0ba3f4', 100, 'exact'),
  ('Reparação de eletrodomésticos', '6d9da7f7-94e5-47db-8378-ffc6d02944fe', 100, 'exact'),
  ('Reparação de máquina de lavar roupa', 'e40c1cd5-9366-4020-8aad-0414fada9e85', 100, 'exact'),
  ('Reparação de máquina de lavar loiça', 'ce96d57c-34b8-4413-bc02-24a81d51ec15', 100, 'exact'),
  ('Limpeza de humidade', 'daaf6de1-7a16-4b89-9150-14fb9c7e4f58', 100, 'exact'),
  ('Limpeza da casa com engomadoria', '0220012a-6aa9-49f1-8e1d-06b041a270eb', 100, 'exact'),
  ('Substituição de torneiras', 'f39c8af4-ef6d-4193-8414-235555350194', 100, 'exact'),
  ('Limpeza de vidros e janelas', '950d5093-3f65-4398-9d98-70a04a89431b', 100, 'exact'),
  ('Engomadoria em casa', 'a77cddd2-55b0-4c24-a274-51641e4e160c', 100, 'exact'),
  ('Aplicação de juntas de silicone', 'a1fe6368-f979-4b80-910f-7c1b0c25e32a', 100, 'exact'),
  ('Reparação de autoclismo', 'a95aa58f-40b9-4c48-9dcc-4405014b44e7', 100, 'exact'),
  ('Canalizador', '1d98c663-491e-4536-8a13-ec376f042322', 100, 'exact'),
  ('Handyman - Faz tudo em casa', '76706a16-1bdb-4124-8894-7a4dada1af9b', 100, 'exact'),
  ('Falhas de energia elétrica', 'a178d6dd-23b6-4985-80f9-2811ca728f9b', 100, 'exact'),
  ('Eletricista', '18ccf94e-0659-4516-af01-2f555a553d1c', 100, 'exact'),
  ('Limpeza de sofás', '663174be-24a1-4dfa-b5bf-086fe301e1b6', 100, 'exact'),
  ('Instalação de máquina de lavar loiça', '7b0eacdf-f1f8-4ca4-ae8a-1bea75333946', 100, 'exact'),
  ('Instalação de forno elétrico', '2bfea591-0573-47ac-8b3b-06bcc2fe5949', 100, 'exact'),
  ('Reparação de frigorífico', '064168ad-cafe-4946-a47d-07b90f8a6bb8', 100, 'exact'),
  ('Limpeza de colchões', '490b9d3f-f079-4e6e-8170-c2e03d4d6893', 100, 'exact'),
  ('Limpeza de tapetes em casa', '65c17fe7-67ec-4968-a4ef-dcb81ea9eae4', 100, 'exact'),
  ('Fixação à parede', '1d90db73-f1ff-4641-b824-2f4bd622b729', 100, 'exact'),
  ('Reparação de estores e persianas', 'af553bb0-f668-482e-830a-84d214775582', 100, 'exact'),
  ('Instalação e substituição de sanita e autoclismo', '8218689b-17b4-4121-9eeb-c7d9d30408db', 100, 'exact'),
  ('Limpeza profunda de cozinha e casas de banho', '006946ed-55ac-4f55-97a6-a2c742493914', 100, 'exact'),
  ('Eletricista por Orçamento', '18ccf94e-0659-4516-af01-2f555a553d1c', 100, 'exact'),
  ('Limpeza pós-obra', '42fef37c-ea1e-4baa-8fe2-1af600d25d4b', 100, 'exact'),
  ('Instalação de estendais', 'bb5ae37e-b24f-4fdf-b9ae-229179f6e787', 100, 'exact'),
  ('Reparação de estendais', '5054ed33-d79f-4e5a-ad96-483168c9ab84', 100, 'exact'),
  ('Limpeza de cadeiras e almofadas', '3ed927c4-d78b-408d-9802-9132ab7c015e', 100, 'exact'),
  ('Substituição de dobradiças', '46b825c2-3cd7-478a-8ff7-1aad8c1eaefd', 100, 'exact'),
  ('Reparação urgente de eletrodomésticos', '6d9da7f7-94e5-47db-8378-ffc6d02944fe', 100, 'exact'),
  ('Substituição de fechaduras', '7426ce4d-a719-43df-a137-227dc2cd49dd', 100, 'exact'),
  ('Reparação de eletrodomésticos a gás', '6d9da7f7-94e5-47db-8378-ffc6d02944fe', 100, 'exact'),
  ('Limpeza de escritórios', '827e4216-a0bd-45af-b2d4-ca502f5c11ae', 100, 'exact'),
  ('Impermeabilização de sofás', 'c0f3f91f-0073-4316-80be-037d3f1e4654', 100, 'exact'),
  ('Instalação e substituição de chuveiro e coluna de duche', '2db4b5cf-ebe6-4e4b-932b-8bf952338bdc', 100, 'exact'),
  ('Limpeza de tapetes com recolha', 'f9fa5839-3f3e-4e51-9021-4687da5f753e', 100, 'exact'),
  ('Limpeza de bares e restaurantes', 'b8418958-bb92-4bc0-abd7-9320266784c6', 100, 'exact'),
  ('Instalação e substituição de eletrodomésticos a gás', '850ecfd7-1f87-461e-8ef6-737771ddbc6e', 100, 'exact'),
  ('Engomadoria com entrega rápida', '5b3942d3-c390-4fb2-a8a1-284ee6fca742', 100, 'exact'),
  ('Fugas de gás', '36030103-5b2c-42c7-bff3-04789c4a6670', 100, 'exact'),
  ('Instalação de estores e persianas exteriores', 'c092224e-2a0e-4ef2-81cc-8fbb4d193e5a', 100, 'exact'),
  ('Limpeza doméstica PLUS', 'cee1d136-db41-43d6-a72c-01b41ed08635', 100, 'exact'),
  ('Limpeza da casa + limpeza de frigorífico grátis', '0220012a-6aa9-49f1-8e1d-06b041a270eb', 100, 'exact'),
  ('Limpeza da casa + limpeza de forno grátis', '0220012a-6aa9-49f1-8e1d-06b041a270eb', 100, 'exact'),
  ('Aplicação de papel de parede', '3f8d89a3-1cb5-4fd0-9c8c-9a9bd4ee6ce8', 100, 'exact'),
  ('Instalação de estores e persianas', 'c092224e-2a0e-4ef2-81cc-8fbb4d193e5a', 100, 'exact'),
  ('Limpeza de cabeceira de cama', '8edf8b60-c547-4977-91e2-dbc62d8a4a97', 100, 'exact'),
  ('Instalação de termoacumulador', '45aa7c06-2949-46ad-8845-c707e3f6329f', 100, 'exact'),
  ('Montagem de móveis', '61ed75c4-16d9-4dcd-8b0f-545b73a49119', 100, 'exact'),
  ('Pintura de interiores', '698f6eec-e0e8-4958-bc0c-3cf7df42c266', 100, 'exact'),
  ('Instalação de estores interiores', '43fa11fb-1f07-4f58-a6b4-9ee82499a112', 100, 'exact'),
  ('Engomadoria com Entrega Rápida', '5b3942d3-c390-4fb2-a8a1-284ee6fca742', 100, 'exact'),
  ('Limpeza de cama', '8edf8b60-c547-4977-91e2-dbc62d8a4a97', 100, 'exact'),
  ('Controlo de pragas', 'c25971e6-ebd9-4acd-8d6d-c0cfe6e0ac36', 100, 'exact'),
  ('Desinfestação de ratos', 'aa0c4e2b-0c51-4cba-9236-d82dcccc5c08', 100, 'exact'),
  ('Desinfestação de baratas', '50c880a2-044b-400a-b7e6-90af763c5de2', 100, 'exact'),
  ('Desinfestação de pulgas', 'e17b798c-770b-40cb-9972-8aa5563ff949', 100, 'exact'),
  ('Desinfestação de percevejos', '98db09be-c10c-4429-9e47-ef8bd0126856', 100, 'exact'),
  ('Reparação de estores, persianas e portadas', 'af553bb0-f668-482e-830a-84d214775582', 100, 'exact'),
  ('Limpeza comercial (lojas & vitrines)', '15c8b3e6-b163-43c5-b547-24c65653beb4', 100, 'exact'),
  ('Manutenção de termoacumulador', '659bbe2c-bbac-42f0-b413-ae82afa82e4e', 100, 'exact'),
  ('Envernizamento de pavimentos', 'bce76eff-0fb7-4f2c-a4ac-049b538898ab', 100, 'exact'),
  ('Limpeza de ar condicionado', 'a8fe1d66-d624-4925-9f82-6983a58054dc', 100, 'exact'),
  ('Reparação de ar condicionado', 'd77967ae-2b95-4b11-90aa-5acef9628254', 100, 'exact'),
  ('Certificação energética', 'ff881214-ddaf-46e4-b83f-21c123ce2104', 100, 'exact'),
  ('Certificação energética para empresas', 'ff881214-ddaf-46e4-b83f-21c123ce2104', 100, 'exact'),
  ('Limpeza de chaminés', '3d651618-2363-49cf-b902-6a54630155bb', 100, 'exact'),
  ('Enfermagem ao domicílio', 'f7289ddc-5d6f-42ff-ae9b-387368f8078f', 100, 'exact'),
  ('Nutricionista ao domicílio', '9fcdb07c-dfe0-4aad-aaa8-9e7065f46370', 100, 'exact'),
  ('Personal trainer ao domicílio', 'afa0c281-b16a-4dc6-b3bf-261eae191d5f', 100, 'exact'),
  ('Limpeza de tapetes e cortinados', 'f9d18671-9c0c-48ea-b74a-05998e214fbf', 100, 'exact'),
  ('Limpeza de cortinados', 'f9d18671-9c0c-48ea-b74a-05998e214fbf', 100, 'exact'),
  ('Jardinagem de exteriores', '6d81abd9-ae18-4827-83a8-dbd06303a611', 100, 'exact'),
  ('Peritagem à casa', '4a317311-983e-44b4-8628-eaedf8c117b4', 100, 'exact'),
  ('Limpeza de azulejos', 'a0c340fe-93ea-477e-891a-5c97cf5be2e5', 100, 'exact'),
  ('Massagem ao domicílio', '61c238e9-7dd1-4a75-b397-3a40a13dda2f', 100, 'exact'),
  ('Instalação de estores, persianas e portadas', 'c092224e-2a0e-4ef2-81cc-8fbb4d193e5a', 88, 'high');
ON CONFLICT (provider_service_name, taxonomy_service_id)
DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  match_type = EXCLUDED.match_type,
  updated_at = NOW();

-- Comentários
COMMENT ON TABLE service_mapping IS 'Mapeamento entre serviços dos prestadores e taxonomia unificada';
COMMENT ON COLUMN service_mapping.provider_service_name IS 'Nome do serviço como aparece nos prestadores';
COMMENT ON COLUMN service_mapping.taxonomy_service_id IS 'Referência para service_taxonomy';
COMMENT ON COLUMN service_mapping.confidence_score IS 'Score de confiança do match (0-100)';
COMMENT ON COLUMN service_mapping.match_type IS 'Tipo de match: exact, high, medium, low, manual';
COMMENT ON COLUMN service_mapping.verified IS 'Se o mapeamento foi verificado por um utilizador';
