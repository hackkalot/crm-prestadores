-- Criar tabela de taxonomia de serviços
-- Baseada nos serviços existentes em service_requests (84 serviços em 8 categorias)

-- Ativar extensão UUID (se não estiver ativada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS service_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  service TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, service)
);

-- Inserir dados extraídos de service_requests
INSERT INTO service_taxonomy (category, service) VALUES
  ('Empresas', 'Limpeza de escritórios'),
  ('Empresas', 'Limpeza comercial (lojas & vitrines)'),
  ('Empresas', 'Limpeza de bares e restaurantes'),
  ('Engomadoria e lavandaria', 'Engomadoria com recolha'),
  ('Engomadoria e lavandaria', 'Lavandaria e engomadoria com recolha'),
  ('Engomadoria e lavandaria', 'Engomadoria em casa'),
  ('Engomadoria e lavandaria', 'Lavandaria com recolha'),
  ('Engomadoria e lavandaria', 'Engomadoria com recolha de camisas e calças'),
  ('Engomadoria e lavandaria', 'Engomadoria com recolha de lençóis e toalhas'),
  ('Engomadoria e lavandaria', 'Engomadoria com entrega rápida'),
  ('Instalação e reparação', 'Reparação de eletrodomésticos'),
  ('Instalação e reparação', 'Canalizador'),
  ('Instalação e reparação', 'Reparação de máquina de lavar roupa'),
  ('Instalação e reparação', 'Eletricista'),
  ('Instalação e reparação', 'Reparação de estores e persianas'),
  ('Instalação e reparação', 'Reparação de máquina de lavar loiça'),
  ('Instalação e reparação', 'Instalação de candeeiros'),
  ('Instalação e reparação', 'Reparação de autoclismo'),
  ('Instalação e reparação', 'Handyman - Faz tudo em casa'),
  ('Instalação e reparação', 'Reparação de frigorífico'),
  ('Instalação e reparação', 'Instalação de eletrodomésticos'),
  ('Instalação e reparação', 'Reparação de eletrodomésticos a gás'),
  ('Instalação e reparação', 'Substituição de torneiras'),
  ('Instalação e reparação', 'Aplicação de juntas de silicone'),
  ('Instalação e reparação', 'Reparação de ar condicionado'),
  ('Instalação e reparação', 'Substituição de fechaduras'),
  ('Instalação e reparação', 'Falhas de energia elétrica'),
  ('Instalação e reparação', 'Instalação e substituição de eletrodomésticos a gás'),
  ('Instalação e reparação', 'Instalação de interruptores e tomadas'),
  ('Instalação e reparação', 'Eletricista por Orçamento'),
  ('Instalação e reparação', 'Reparação urgente de eletrodomésticos'),
  ('Instalação e reparação', 'Instalação de estores interiores'),
  ('Instalação e reparação', 'Fugas de gás'),
  ('Instalação e reparação', 'Reparação de estendais'),
  ('Instalação e reparação', 'Instalação e substituição de chuveiro e coluna de duche'),
  ('Instalação e reparação', 'Instalação de máquina de lavar loiça'),
  ('Instalação e reparação', 'Instalação e substituição de sanita e autoclismo'),
  ('Instalação e reparação', 'Manutenção de termoacumulador'),
  ('Instalação e reparação', 'Peritagem à casa'),
  ('Instalação e reparação', 'Instalação de estendais'),
  ('Instalação e reparação', 'Instalação de termoacumulador'),
  ('Instalação e reparação', 'Instalação de forno elétrico'),
  ('Instalação e reparação', 'Instalação de estores e persianas exteriores'),
  ('Jardinagem', 'Jardinagem de exteriores'),
  ('Remodelação e decoração', 'Fixação à parede'),
  ('Remodelação e decoração', 'Montagem de móveis'),
  ('Remodelação e decoração', 'Pintura de interiores'),
  ('Remodelação e decoração', 'Aplicação de papel de parede'),
  ('Remodelação e decoração', 'Substituição de dobradiças'),
  ('Remodelação e decoração', 'Envernizamento de pavimentos'),
  ('Saúde e bem-estar', 'Massagem ao domicílio'),
  ('Saúde e bem-estar', 'Osteopata ao domicílio'),
  ('Saúde e bem-estar', 'Nutricionista ao domicílio'),
  ('Saúde e bem-estar', 'Enfermagem ao domicílio'),
  ('Saúde e bem-estar', 'Personal trainer ao domicílio'),
  ('Serviços de limpeza', 'Limpeza da casa'),
  ('Serviços de limpeza', 'Limpeza profunda'),
  ('Serviços de limpeza', 'Limpeza da casa com engomadoria'),
  ('Serviços de limpeza', 'Limpeza de sofás'),
  ('Serviços de limpeza', 'Limpeza de tapetes com recolha'),
  ('Serviços de limpeza', 'Limpeza de humidade'),
  ('Serviços de limpeza', 'Limpeza de tapetes em casa'),
  ('Serviços de limpeza', 'Limpeza de vidros e janelas'),
  ('Serviços de limpeza', 'Limpeza de colchões'),
  ('Serviços de limpeza', 'Limpeza pós-obra'),
  ('Serviços de limpeza', 'Limpeza profunda de cozinha e casas de banho'),
  ('Serviços de limpeza', 'Impermeabilização de sofás'),
  ('Serviços de limpeza', 'Limpeza de ar condicionado'),
  ('Serviços de limpeza', 'Limpeza de chaminés'),
  ('Serviços de limpeza', 'Limpeza doméstica PLUS'),
  ('Serviços de limpeza', 'Limpeza da casa + limpeza de frigorífico grátis'),
  ('Serviços de limpeza', 'Limpeza de cadeiras e almofadas'),
  ('Serviços de limpeza', 'Limpeza da casa + limpeza de forno grátis'),
  ('Serviços de limpeza', 'Desinfestação de baratas'),
  ('Serviços de limpeza', 'Limpeza de cortinados'),
  ('Serviços de limpeza', 'Controlo de pragas'),
  ('Serviços de limpeza', 'Desinfestação de percevejos'),
  ('Serviços de limpeza', 'Limpeza de cabeceira de cama'),
  ('Serviços de limpeza', 'Limpeza de cama'),
  ('Serviços de limpeza', 'Desinfestação de pulgas'),
  ('Serviços de limpeza', 'Limpeza de azulejos'),
  ('Serviços de limpeza', 'Desinfestação de ratos'),
  ('Serviços de limpeza', 'Limpeza comercial (lojas & vitrines)'),
  ('Serviços energéticos', 'Certificação energética')
ON CONFLICT (category, service) DO NOTHING;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_taxonomy_category ON service_taxonomy(category);
CREATE INDEX IF NOT EXISTS idx_service_taxonomy_active ON service_taxonomy(active) WHERE active = true;

-- Comentários
COMMENT ON TABLE service_taxonomy IS 'Taxonomia unificada de serviços baseada em service_requests históricos (84 serviços em 8 categorias)';
COMMENT ON COLUMN service_taxonomy.category IS 'Categoria do serviço (ex: Serviços de limpeza, Instalação e reparação)';
COMMENT ON COLUMN service_taxonomy.service IS 'Nome específico do serviço (ex: Limpeza da casa, Canalizador)';
COMMENT ON COLUMN service_taxonomy.active IS 'Se o serviço está ativo/disponível para mapeamento';
