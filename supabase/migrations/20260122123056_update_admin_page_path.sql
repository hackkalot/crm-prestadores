-- Update admin page path to /admin/gestao-sistema
UPDATE pages
SET path = '/admin/gestao-sistema'
WHERE key = 'admin_utilizadores';
