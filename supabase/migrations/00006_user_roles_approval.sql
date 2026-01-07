-- =============================================
-- User Roles and Approval System
-- =============================================

-- Enum para roles
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Enum para status de aprovação
CREATE TYPE user_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Adicionar colunas à tabela users
ALTER TABLE users
  ADD COLUMN role user_role DEFAULT 'user',
  ADD COLUMN approval_status user_approval_status DEFAULT 'pending',
  ADD COLUMN approved_by UUID REFERENCES users(id),
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN rejected_by UUID REFERENCES users(id),
  ADD COLUMN rejected_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT;

-- Index para queries de aprovação
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_role ON users(role);

-- Atualizar a função handle_new_user para definir status como pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se user está aprovado (para usar no middleware/RLS)
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  status user_approval_status;
BEGIN
  SELECT approval_status INTO status FROM public.users WHERE id = user_id;
  RETURN status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se user é admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value FROM public.users WHERE id = user_id;
  RETURN user_role_value = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Atualizar RLS policies
-- =============================================

-- Remover policy antiga de users
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users aprovados podem ver todos os users
CREATE POLICY "Approved users can view all users" ON users
  FOR SELECT TO authenticated
  USING (public.is_user_approved(auth.uid()) OR id = auth.uid());

-- Users podem ver seu próprio perfil (mesmo se pending)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users podem atualizar próprio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- Não pode mudar role ou approval_status
      role IS NOT DISTINCT FROM (SELECT role FROM users WHERE id = auth.uid())
      AND approval_status IS NOT DISTINCT FROM (SELECT approval_status FROM users WHERE id = auth.uid())
    )
  );

-- Admins podem atualizar qualquer user (para aprovar/rejeitar)
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

-- =============================================
-- Atualizar outras policies para verificar aprovação
-- =============================================

-- Providers: apenas users aprovados
DROP POLICY IF EXISTS "Authenticated users can view providers" ON providers;
DROP POLICY IF EXISTS "Authenticated users can insert providers" ON providers;
DROP POLICY IF EXISTS "Authenticated users can update providers" ON providers;

CREATE POLICY "Approved users can view providers" ON providers
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can insert providers" ON providers
  FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update providers" ON providers
  FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));

-- Repetir para outras tabelas principais
-- onboarding_cards
DROP POLICY IF EXISTS "Authenticated users can view onboarding_cards" ON onboarding_cards;
DROP POLICY IF EXISTS "Authenticated users can insert onboarding_cards" ON onboarding_cards;
DROP POLICY IF EXISTS "Authenticated users can update onboarding_cards" ON onboarding_cards;

CREATE POLICY "Approved users can view onboarding_cards" ON onboarding_cards
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can insert onboarding_cards" ON onboarding_cards
  FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update onboarding_cards" ON onboarding_cards
  FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));

-- onboarding_tasks
DROP POLICY IF EXISTS "Authenticated users can view onboarding_tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert onboarding_tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Authenticated users can update onboarding_tasks" ON onboarding_tasks;

CREATE POLICY "Approved users can view onboarding_tasks" ON onboarding_tasks
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can insert onboarding_tasks" ON onboarding_tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update onboarding_tasks" ON onboarding_tasks
  FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));

-- notes
DROP POLICY IF EXISTS "Authenticated users can view notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can insert notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can update own notes" ON notes;

CREATE POLICY "Approved users can view notes" ON notes
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can insert notes" ON notes
  FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update own notes" ON notes
  FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()) AND created_by = auth.uid());

-- alerts
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;

CREATE POLICY "Approved users can view own alerts" ON alerts
  FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Approved users can insert alerts" ON alerts
  FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update own alerts" ON alerts
  FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()) AND user_id = auth.uid());
