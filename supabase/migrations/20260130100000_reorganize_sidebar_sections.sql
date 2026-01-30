-- Reorganize sidebar sections
-- Move pedidos, alocacoes, faturacao to 'dados' section
-- Move reports to 'gestao' section
-- Fix analytics name

-- Move pages to 'dados' section
UPDATE pages SET section = 'dados', display_order = 1 WHERE key = 'pedidos';
UPDATE pages SET section = 'dados', display_order = 2 WHERE key = 'alocacoes';
UPDATE pages SET section = 'dados', display_order = 3 WHERE key = 'faturacao';

-- Move reports to 'gestao' section
UPDATE pages SET section = 'gestao', display_order = 3 WHERE key = 'reports';

-- Fix analytics name (was incorrectly named 'KPIs Operacionais')
UPDATE pages SET name = 'Analytics', display_order = 1 WHERE key = 'analytics';

-- Reorder 'rede' section (only prestadores, rede, kpis_operacionais remain)
UPDATE pages SET display_order = 1 WHERE key = 'prestadores';
UPDATE pages SET display_order = 2 WHERE key = 'rede';
UPDATE pages SET display_order = 3 WHERE key = 'kpis_operacionais';

-- Reorder 'gestao' section
UPDATE pages SET display_order = 1 WHERE key = 'analytics';
UPDATE pages SET display_order = 2 WHERE key = 'reports';
UPDATE pages SET display_order = 3 WHERE key = 'prioridades';
