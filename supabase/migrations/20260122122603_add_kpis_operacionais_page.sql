-- Add kpis_operacionais page and move analytics to gestao section

-- Insert new kpis_operacionais page in rede section
INSERT INTO pages (key, name, path, section, display_order, is_active) VALUES
('kpis_operacionais', 'KPIs Operacionais', '/kpis-operacionais', 'rede', 3, TRUE)
ON CONFLICT (key) DO NOTHING;

-- Update analytics to be in gestao section (after prioridades)
UPDATE pages
SET section = 'gestao', display_order = 2
WHERE key = 'analytics';

-- Update display_order for other rede pages (shift after kpis_operacionais)
UPDATE pages SET display_order = 4 WHERE key = 'pedidos';
UPDATE pages SET display_order = 5 WHERE key = 'alocacoes';
UPDATE pages SET display_order = 6 WHERE key = 'faturacao';
UPDATE pages SET display_order = 7 WHERE key = 'reports';

-- Add default permissions for kpis_operacionais (same as analytics - admin only by default)
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, (r.name = 'admin')
FROM roles r
CROSS JOIN pages p
WHERE p.key = 'kpis_operacionais'
ON CONFLICT (role_id, page_id) DO NOTHING;
