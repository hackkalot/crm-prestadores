-- =============================================
-- Seed Data: Etapas e Tarefas de Onboarding
-- =============================================

-- Etapas do Kanban
INSERT INTO stage_definitions (stage_number, name, display_order) VALUES
('1', 'POR CONTACTAR', 1),
('2', 'CONTACTADOS / AGUARDA INFO', 2),
('3', 'AGUARDA REUNIAO', 3),
('3A', 'REUNIAO MARCADA', 4),
('4', 'APRESENTAR AO COMITE (RICARDO)', 5),
('5', 'AGUARDA DOCUMENTACAO/APOLICE', 6),
('6', 'EM FORMACAO', 7),
('7', 'AGUARDA RESPOSTA QUIZ', 8),
('8', 'ENVIAR MATERIAIS', 9),
('9', 'CRIAR FICHA ERP', 10),
('10', 'ALINHAMENTO PRE-LAUNCH', 11),
('11', 'ACOMPANHAMENTO', 12);

-- Tarefas por etapa
-- Etapa 1: POR CONTACTAR
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 1, 'Enviar email #2 + anexo', 'Apos contacto enviar email no maximo 24h depois, caso nao seja possivel o contacto telefonico, enviar email. Ha template para email apos contacto e sem contacto. E enviado o formulario de informacoes.', 48, 24, 1
FROM stage_definitions WHERE stage_number = '1';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 2, 'Ligar', 'Enviar reminder automatico ao parceiro que ainda nao respondeu - Email reminder #2.2. Se prestador relevante - LIGAR. Se prestador nao responde passado x dias (a definir) passa a Abandonado com o motivo certo.', 48, 24, 2
FROM stage_definitions WHERE stage_number = '1';

-- Etapa 2: CONTACTADOS / AGUARDA INFO
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 3, 'Analisar resposta', 'Se interessado - avanca com tabela de custos. Se nao interessado - clicar em abandonado com o motivo correto.', 72, 48, 3
FROM stage_definitions WHERE stage_number = '2';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 4, 'Enviar precario', 'Email #3', NULL, NULL, 4
FROM stage_definitions WHERE stage_number = '2';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 5, 'Avaliar interesse do parceiro', 'Se o parceiro responder com interesse.', NULL, NULL, 5
FROM stage_definitions WHERE stage_number = '2';

-- Etapa 3: AGUARDA REUNIAO
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 6, 'Marcar reuniao Teams', 'Email #4', NULL, NULL, 6
FROM stage_definitions WHERE stage_number = '3';

-- Etapa 3A: REUNIAO MARCADA
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 7, 'Realizar reuniao', 'Script da reuniao', NULL, NULL, 7
FROM stage_definitions WHERE stage_number = '3A';

-- Etapa 4: APRESENTAR AO COMITE (RICARDO)
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 8, 'Decisao GO / NO GO', 'Se for NO GO vai para os abandonados.', NULL, NULL, 8
FROM stage_definitions WHERE stage_number = '4';

-- Etapa 5: AGUARDA DOCUMENTACAO/APOLICE
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 9, 'Pedir informacao final (documentacao)', 'Email #5', NULL, NULL, 9
FROM stage_definitions WHERE stage_number = '5';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 10, 'Receber informacao', NULL, NULL, NULL, 10
FROM stage_definitions WHERE stage_number = '5';

-- Etapa 6: EM FORMACAO
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 11, 'Criar prestador BO + colocar ficha', NULL, NULL, NULL, 11
FROM stage_definitions WHERE stage_number = '6';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 12, 'Enviar email de acesso a AP, formacao e merch', 'Enviar email #6', NULL, NULL, 12
FROM stage_definitions WHERE stage_number = '6';

-- Etapa 7: AGUARDA RESPOSTA QUIZ
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 13, 'Receber resposta do Quiz', 'Integrar no CRM', NULL, NULL, 13
FROM stage_definitions WHERE stage_number = '7';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 14, 'Receber pedido de merch', 'Integrar no CRM', NULL, NULL, 14
FROM stage_definitions WHERE stage_number = '7';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 15, 'Receber resposta ao email #6', 'Integrar no CRM', NULL, NULL, 15
FROM stage_definitions WHERE stage_number = '7';

-- Etapa 8: ENVIAR MATERIAIS
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 16, 'Enviar materiais', 'Enviar mail 6.2 (quizz materiais)', NULL, NULL, 16
FROM stage_definitions WHERE stage_number = '8';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 17, 'Confirmar rececao dos materiais', NULL, NULL, NULL, 17
FROM stage_definitions WHERE stage_number = '8';

-- Etapa 9: CRIAR FICHA ERP
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 18, 'Criar ficha ERP', NULL, NULL, NULL, 18
FROM stage_definitions WHERE stage_number = '9';

-- Etapa 10: ALINHAMENTO PRE-LAUNCH
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 19, 'Alinhamento da data de entrada + resposta a duvidas', 'A tarefa pode ser feita ao mesmo tempo da anterior, caso o prestador ligue.', NULL, NULL, 19
FROM stage_definitions WHERE stage_number = '10';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 20, 'Enviar email de launch', 'Email #8', NULL, NULL, 20
FROM stage_definitions WHERE stage_number = '10';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 21, 'Atribuir servicos, quotas e custos', NULL, NULL, NULL, 21
FROM stage_definitions WHERE stage_number = '10';

INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 22, 'Colocar data da entrada', NULL, NULL, NULL, 22
FROM stage_definitions WHERE stage_number = '10';

-- Etapa 11: ACOMPANHAMENTO
INSERT INTO task_definitions (stage_id, task_number, name, description, default_deadline_hours_normal, default_deadline_hours_urgent, display_order)
SELECT id, 23, 'Contacto pos-launch', '7 a 10 dias apos entrada na rede, contactar o prestador.', 240, 168, 23
FROM stage_definitions WHERE stage_number = '11';

-- =============================================
-- Seed Data: Configuracoes Globais
-- =============================================
INSERT INTO settings (key, value, description) VALUES
('alert_hours_before_deadline', '24', 'Horas antes do prazo para gerar alerta'),
('stalled_task_days', '3', 'Dias sem update para considerar tarefa parada'),
('price_deviation_threshold', '0.20', 'Percentagem de desvio de preco para alerta (20%)');
