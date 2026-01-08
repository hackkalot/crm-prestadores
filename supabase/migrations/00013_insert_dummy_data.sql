-- Insert dummy data for main tables
-- This creates realistic test data for providers in various statuses

-- Get RM user IDs (we'll assign providers to them)
DO $$
DECLARE
  rm1_id UUID;
  rm2_id UUID;
BEGIN
  -- Get the two RM users
  SELECT id INTO rm1_id FROM users WHERE email = 'ricardo.alves.andrade@fidelidade.pt';
  SELECT id INTO rm2_id FROM users WHERE email = 'yola.kiffen.rodrigues@fidelidade.pt';

  -- Insert 5 providers with status 'novo' (New applications)
  INSERT INTO providers (id, name, entity_type, nif, email, phone, districts, services, status, first_application_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'João Silva Técnico', 'tecnico', '123456789', 'joao.silva@email.pt', '912345678', ARRAY['Lisboa', 'Setúbal'], ARRAY['Canalizador', 'Eletricista'], 'novo', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
    (gen_random_uuid(), 'Maria Santos Limpezas', 'eni', '234567890', 'maria.santos@limpezas.pt', '923456789', ARRAY['Porto'], ARRAY['Limpeza'], 'novo', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),
    (gen_random_uuid(), 'TecnoFix Unipessoal', 'empresa', '345678901', 'info@tecnofix.pt', '934567890', ARRAY['Braga', 'Viana do Castelo'], ARRAY['Reparação de Eletrodomésticos', 'Eletricista'], 'novo', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
    (gen_random_uuid(), 'Ana Costa Pinturas', 'tecnico', '456789012', 'ana.costa@pinturas.pt', '945678901', ARRAY['Faro', 'Portimão'], ARRAY['Pintor'], 'novo', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW()),
    (gen_random_uuid(), 'Carlos Ferreira Climatização', 'tecnico', '567890123', 'carlos@climatizacao.pt', '956789012', ARRAY['Coimbra'], ARRAY['Técnico de Climatização'], 'novo', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW());

  -- Insert 8 providers with status 'em_onboarding' (assigned to RMs)
  INSERT INTO providers (id, name, entity_type, nif, email, phone, districts, services, status, relationship_owner_id, first_application_at, onboarding_started_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'Pedro Oliveira Canalizações', 'tecnico', '678901234', 'pedro@canalizacoes.pt', '967890123', ARRAY['Lisboa'], ARRAY['Canalizador'], 'em_onboarding', rm1_id, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '15 days', NOW()),
    (gen_random_uuid(), 'LimpaMais Lda', 'empresa', '789012345', 'geral@limpamais.pt', '978901234', ARRAY['Porto', 'Matosinhos'], ARRAY['Limpeza'], 'em_onboarding', rm1_id, NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 days', NOW()),
    (gen_random_uuid(), 'Rui Almeida Eletricista', 'tecnico', '890123456', 'rui@eletricista.pt', '989012345', ARRAY['Setúbal'], ARRAY['Eletricista'], 'em_onboarding', rm2_id, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '20 days', NOW()),
    (gen_random_uuid(), 'Sofia Martins Jardinagem', 'eni', '901234567', 'sofia@jardinagem.pt', '990123456', ARRAY['Cascais', 'Sintra'], ARRAY['Jardineiro'], 'em_onboarding', rm2_id, NOW() - INTERVAL '18 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '18 days', NOW()),
    (gen_random_uuid(), 'TechHome Services', 'empresa', '012345678', 'info@techhome.pt', '901234567', ARRAY['Lisboa', 'Amadora'], ARRAY['Eletricista', 'Canalizador', 'Pintor'], 'em_onboarding', rm1_id, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days', NOW()),
    (gen_random_uuid(), 'Manuel Rodrigues Serralheiro', 'tecnico', '123450987', 'manuel@serralharia.pt', '912340987', ARRAY['Braga'], ARRAY['Serralheiro'], 'em_onboarding', rm2_id, NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '14 days', NOW()),
    (gen_random_uuid(), 'Climatizar Portugal Lda', 'empresa', '234560987', 'contacto@climatizar.pt', '923450987', ARRAY['Aveiro', 'Viseu'], ARRAY['Técnico de Climatização'], 'em_onboarding', rm1_id, NOW() - INTERVAL '22 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '22 days', NOW()),
    (gen_random_uuid(), 'Isabel Pereira Decoradora', 'tecnico', '345670987', 'isabel@decoradora.pt', '934560987', ARRAY['Faro'], ARRAY['Pintor', 'Decorador'], 'em_onboarding', rm2_id, NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '16 days', NOW());

  -- Insert 15 providers with status 'ativo' (Active in network)
  INSERT INTO providers (id, name, entity_type, nif, email, phone, districts, services, status, relationship_owner_id, first_application_at, onboarding_started_at, activated_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'António Silva Canalizador', 'tecnico', '456780987', 'antonio@canalizador.pt', '945670987', ARRAY['Lisboa', 'Oeiras'], ARRAY['Canalizador'], 'ativo', rm1_id, NOW() - INTERVAL '90 days', NOW() - INTERVAL '85 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '90 days', NOW()),
    (gen_random_uuid(), 'CleanPro Serviços', 'empresa', '567890987', 'info@cleanpro.pt', '956780987', ARRAY['Porto'], ARRAY['Limpeza'], 'ativo', rm1_id, NOW() - INTERVAL '120 days', NOW() - INTERVAL '115 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '120 days', NOW()),
    (gen_random_uuid(), 'José Costa Eletricista', 'tecnico', '678900987', 'jose@eletricista.pt', '967890987', ARRAY['Braga', 'Guimarães'], ARRAY['Eletricista'], 'ativo', rm2_id, NOW() - INTERVAL '150 days', NOW() - INTERVAL '145 days', NOW() - INTERVAL '120 days', NOW() - INTERVAL '150 days', NOW()),
    (gen_random_uuid(), 'Mariana Lopes Pintora', 'tecnico', '789010987', 'mariana@pintora.pt', '978900987', ARRAY['Setúbal'], ARRAY['Pintor'], 'ativo', rm2_id, NOW() - INTERVAL '80 days', NOW() - INTERVAL '75 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '80 days', NOW()),
    (gen_random_uuid(), 'HomeRepair Solutions', 'empresa', '890120987', 'contact@homerepair.pt', '989010987', ARRAY['Lisboa', 'Cascais', 'Sintra'], ARRAY['Canalizador', 'Eletricista', 'Pintor', 'Carpinteiro'], 'ativo', rm1_id, NOW() - INTERVAL '200 days', NOW() - INTERVAL '195 days', NOW() - INTERVAL '170 days', NOW() - INTERVAL '200 days', NOW()),
    (gen_random_uuid(), 'Ricardo Fernandes Climatização', 'tecnico', '901230987', 'ricardo@climatizacao.pt', '990120987', ARRAY['Coimbra', 'Leiria'], ARRAY['Técnico de Climatização'], 'ativo', rm1_id, NOW() - INTERVAL '110 days', NOW() - INTERVAL '105 days', NOW() - INTERVAL '80 days', NOW() - INTERVAL '110 days', NOW()),
    (gen_random_uuid(), 'Paula Sousa Jardinagem', 'eni', '012340987', 'paula@jardinagem.pt', '901230987', ARRAY['Faro', 'Loulé'], ARRAY['Jardineiro'], 'ativo', rm2_id, NOW() - INTERVAL '95 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '65 days', NOW() - INTERVAL '95 days', NOW()),
    (gen_random_uuid(), 'TotalFix Manutenção', 'empresa', '123560987', 'info@totalfix.pt', '912350987', ARRAY['Porto', 'Vila Nova de Gaia'], ARRAY['Eletricista', 'Canalizador', 'Serralheiro'], 'ativo', rm1_id, NOW() - INTERVAL '180 days', NOW() - INTERVAL '175 days', NOW() - INTERVAL '150 days', NOW() - INTERVAL '180 days', NOW()),
    (gen_random_uuid(), 'Miguel Santos Carpinteiro', 'tecnico', '234670987', 'miguel@carpinteiro.pt', '923560987', ARRAY['Aveiro'], ARRAY['Carpinteiro'], 'ativo', rm2_id, NOW() - INTERVAL '130 days', NOW() - INTERVAL '125 days', NOW() - INTERVAL '100 days', NOW() - INTERVAL '130 days', NOW()),
    (gen_random_uuid(), 'CasaLimpa Serviços', 'empresa', '345780987', 'geral@casalimpa.pt', '934670987', ARRAY['Lisboa', 'Loures'], ARRAY['Limpeza'], 'ativo', rm1_id, NOW() - INTERVAL '160 days', NOW() - INTERVAL '155 days', NOW() - INTERVAL '130 days', NOW() - INTERVAL '160 days', NOW()),
    (gen_random_uuid(), 'Teresa Mendes Decoradora', 'tecnico', '456890987', 'teresa@decoradora.pt', '945780987', ARRAY['Porto'], ARRAY['Pintor', 'Decorador'], 'ativo', rm2_id, NOW() - INTERVAL '105 days', NOW() - INTERVAL '100 days', NOW() - INTERVAL '75 days', NOW() - INTERVAL '105 days', NOW()),
    (gen_random_uuid(), 'ElétricoPro Unipessoal', 'eni', '567900987', 'info@eletrico.pt', '956890987', ARRAY['Santarém'], ARRAY['Eletricista'], 'ativo', rm1_id, NOW() - INTERVAL '140 days', NOW() - INTERVAL '135 days', NOW() - INTERVAL '110 days', NOW() - INTERVAL '140 days', NOW()),
    (gen_random_uuid(), 'Bruno Carvalho Vidraceiro', 'tecnico', '678010987', 'bruno@vidraceiro.pt', '967900987', ARRAY['Setúbal', 'Palmela'], ARRAY['Vidraceiro'], 'ativo', rm2_id, NOW() - INTERVAL '75 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '75 days', NOW()),
    (gen_random_uuid(), 'QuickFix Services', 'empresa', '789120987', 'contact@quickfix.pt', '978010987', ARRAY['Braga', 'Barcelos'], ARRAY['Canalizador', 'Eletricista', 'Carpinteiro'], 'ativo', rm1_id, NOW() - INTERVAL '190 days', NOW() - INTERVAL '185 days', NOW() - INTERVAL '160 days', NOW() - INTERVAL '190 days', NOW()),
    (gen_random_uuid(), 'Catarina Nunes Esteticista', 'tecnico', '890230987', 'catarina@estetica.pt', '989120987', ARRAY['Lisboa'], ARRAY['Esteticista'], 'ativo', rm2_id, NOW() - INTERVAL '85 days', NOW() - INTERVAL '80 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '85 days', NOW());

  -- Insert 3 providers with status 'suspenso' (Suspended)
  INSERT INTO providers (id, name, entity_type, nif, email, phone, districts, services, status, relationship_owner_id, first_application_at, onboarding_started_at, activated_at, suspended_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'Vítor Reis Canalizador', 'tecnico', '901340987', 'vitor@canalizador.pt', '990230987', ARRAY['Porto'], ARRAY['Canalizador'], 'suspenso', rm1_id, NOW() - INTERVAL '180 days', NOW() - INTERVAL '175 days', NOW() - INTERVAL '150 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '180 days', NOW()),
    (gen_random_uuid(), 'ProClean Lda', 'empresa', '012450987', 'info@proclean.pt', '901340987', ARRAY['Lisboa'], ARRAY['Limpeza'], 'suspenso', rm2_id, NOW() - INTERVAL '200 days', NOW() - INTERVAL '195 days', NOW() - INTERVAL '170 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '200 days', NOW()),
    (gen_random_uuid(), 'Fernando Gomes Eletricista', 'tecnico', '123670987', 'fernando@eletricista.pt', '912450987', ARRAY['Faro'], ARRAY['Eletricista'], 'suspenso', rm1_id, NOW() - INTERVAL '120 days', NOW() - INTERVAL '115 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '120 days', NOW());

  -- Insert 2 providers with status 'abandonado' (Abandoned)
  INSERT INTO providers (id, name, entity_type, nif, email, phone, districts, services, status, abandonment_party, abandonment_reason, abandoned_at, first_application_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'Sara Pinto Limpezas', 'eni', '234780987', 'sara@limpezas.pt', '923670987', ARRAY['Coimbra'], ARRAY['Limpeza'], 'abandonado', 'prestador', 'Não tinha disponibilidade', NOW() - INTERVAL '30 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW()),
    (gen_random_uuid(), 'TechRapid Unipessoal', 'eni', '345890987', 'info@techrapid.pt', '934780987', ARRAY['Porto'], ARRAY['Reparação de Eletrodomésticos'], 'abandonado', 'fixo', 'Não cumpriu requisitos mínimos', NOW() - INTERVAL '20 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW());

END $$;

-- Add comment
COMMENT ON TABLE providers IS 'Dummy data inserted: 5 novo, 8 em_onboarding, 15 ativo, 3 suspenso, 2 abandonado = 33 total providers';
