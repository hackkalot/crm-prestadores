-- =============================================
-- Dynamic Roles and Page Permissions System
-- =============================================

-- Table: roles (dynamic roles for permissions)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- system roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial roles from existing user_role enum values
INSERT INTO roles (name, description, is_system) VALUES
  ('admin', 'Administrador com acesso total ao sistema', TRUE),
  ('user', 'Utilizador base com acesso limitado', TRUE),
  ('manager', 'Gestor com acesso a prioridades e gestao', TRUE),
  ('relationship_manager', 'Relationship Manager para gestao de prestadores', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Table: pages (list of all pages/routes for permissions)
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'candidaturas', 'onboarding'
  name VARCHAR(255) NOT NULL,       -- Display name in Portuguese
  path VARCHAR(255) NOT NULL,       -- URL path
  section VARCHAR(100),             -- Section for sidebar grouping (null = standalone)
  display_order INTEGER NOT NULL,   -- Order within section
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed pages with sections
INSERT INTO pages (key, name, path, section, display_order) VALUES
  -- Onboarding section
  ('candidaturas', 'Candidaturas', '/candidaturas', 'onboarding', 1),
  ('onboarding', 'Onboarding', '/onboarding', 'onboarding', 2),
  ('kpis', 'KPIs', '/kpis', 'onboarding', 3),
  ('agenda', 'Agenda', '/agenda', 'onboarding', 4),
  -- Rede section
  ('prestadores', 'Prestadores', '/prestadores', 'rede', 10),
  ('rede', 'Rede', '/rede', 'rede', 11),
  ('analytics', 'KPIs Operacionais', '/analytics', 'rede', 12),
  ('pedidos', 'Pedidos', '/pedidos', 'rede', 13),
  ('alocacoes', 'Alocacoes', '/alocacoes', 'rede', 14),
  ('faturacao', 'Faturacao', '/faturacao', 'rede', 15),
  ('reports', 'Reports', '/reports', 'rede', 16),
  -- Gestao section
  ('prioridades', 'Prioridades', '/prioridades', 'gestao', 20),
  -- Configuracoes (standalone, no section)
  ('configuracoes', 'Configuracoes', '/configuracoes', NULL, 30),
  -- Admin section
  ('admin_utilizadores', 'Utilizadores', '/admin/utilizadores', 'admin', 40)
ON CONFLICT (key) DO NOTHING;

-- Table: role_permissions (matrix of role x page permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, page_id)
);

-- Seed initial permissions based on current hardcoded behavior

-- Admin: access to all pages
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, TRUE
FROM roles r, pages p
WHERE r.name = 'admin'
ON CONFLICT (role_id, page_id) DO UPDATE SET can_access = TRUE;

-- User: access to most pages except admin and prioridades
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, CASE WHEN p.key IN ('admin_utilizadores', 'prioridades') THEN FALSE ELSE TRUE END
FROM roles r, pages p
WHERE r.name = 'user'
ON CONFLICT (role_id, page_id) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Manager: access to all pages except admin
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, CASE WHEN p.key = 'admin_utilizadores' THEN FALSE ELSE TRUE END
FROM roles r, pages p
WHERE r.name = 'manager'
ON CONFLICT (role_id, page_id) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Relationship Manager: same as user (no admin, no prioridades)
INSERT INTO role_permissions (role_id, page_id, can_access)
SELECT r.id, p.id, CASE WHEN p.key IN ('admin_utilizadores', 'prioridades') THEN FALSE ELSE TRUE END
FROM roles r, pages p
WHERE r.name = 'relationship_manager'
ON CONFLICT (role_id, page_id) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Indexes for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_page ON role_permissions(page_id);
CREATE INDEX IF NOT EXISTS idx_pages_section ON pages(section);
CREATE INDEX IF NOT EXISTS idx_pages_key ON pages(key);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Function to check if user can access a specific page
CREATE OR REPLACE FUNCTION can_user_access_page(p_user_id UUID, p_page_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role_name TEXT;
  v_has_access BOOLEAN;
BEGIN
  -- Get user's role name
  SELECT role::text INTO v_user_role_name
  FROM users
  WHERE id = p_user_id AND approval_status = 'approved';

  IF v_user_role_name IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check permission in role_permissions table
  SELECT rp.can_access INTO v_has_access
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN pages p ON p.id = rp.page_id
  WHERE r.name = v_user_role_name AND p.key = p_page_key;

  RETURN COALESCE(v_has_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all accessible page keys for a user
CREATE OR REPLACE FUNCTION get_user_accessible_pages(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  v_user_role_name TEXT;
  v_pages TEXT[];
BEGIN
  -- Get user's role name
  SELECT role::text INTO v_user_role_name
  FROM users
  WHERE id = p_user_id AND approval_status = 'approved';

  IF v_user_role_name IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Get all page keys with access
  SELECT ARRAY_AGG(p.key ORDER BY p.display_order) INTO v_pages
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  JOIN pages p ON p.id = rp.page_id
  WHERE r.name = v_user_role_name AND rp.can_access = TRUE AND p.is_active = TRUE;

  RETURN COALESCE(v_pages, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Roles table policies
CREATE POLICY "Approved users can view roles" ON roles
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Admins can insert roles" ON roles
  FOR INSERT TO authenticated WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON roles
  FOR UPDATE TO authenticated USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete non-system roles" ON roles
  FOR DELETE TO authenticated USING (public.is_user_admin(auth.uid()) AND is_system = FALSE);

-- Pages table policies
CREATE POLICY "Approved users can view pages" ON pages
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage pages" ON pages
  FOR ALL TO authenticated USING (public.is_user_admin(auth.uid()));

-- Role permissions table policies
CREATE POLICY "Approved users can view permissions" ON role_permissions
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage permissions" ON role_permissions
  FOR ALL TO authenticated USING (public.is_user_admin(auth.uid()));

-- Comments
COMMENT ON TABLE roles IS 'Dynamic roles for permission management';
COMMENT ON TABLE pages IS 'Pages/routes available in the system for permission control';
COMMENT ON TABLE role_permissions IS 'Matrix of role-to-page access permissions';
COMMENT ON FUNCTION can_user_access_page IS 'Check if a user can access a specific page by key';
COMMENT ON FUNCTION get_user_accessible_pages IS 'Get array of page keys a user can access';
