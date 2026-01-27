-- Add Submissões page to the pages table
INSERT INTO pages (key, name, path, section, display_order) VALUES
  ('submissoes', 'Submissões', '/onboarding/submissoes', 'onboarding', 3)
ON CONFLICT (key) DO NOTHING;

-- Update display_order of subsequent pages in onboarding section
UPDATE pages SET display_order = 4 WHERE key = 'kpis';
UPDATE pages SET display_order = 5 WHERE key = 'agenda';

-- Grant access to all roles that have access to onboarding
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id,
  CASE
    WHEN r.name = 'admin' THEN TRUE
    WHEN r.name = 'manager' THEN TRUE
    WHEN r.name = 'user' THEN TRUE
    WHEN r.name = 'relationship_manager' THEN TRUE
    ELSE FALSE
  END
FROM roles r, pages p
WHERE p.key = 'submissoes'
ON CONFLICT (role_id, page_id) DO UPDATE SET can_access = EXCLUDED.can_access;
