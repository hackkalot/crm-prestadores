-- =============================================
-- Sincronizar Supabase Auth com tabela users
-- =============================================

-- Funcao para criar user na nossa tabela quando se regista no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novos utilizadores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Ativar RLS nas tabelas principais
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politicas para users (utilizadores autenticados podem ver todos)
CREATE POLICY "Users can view all users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Politicas para providers (todos os autenticados podem CRUD)
CREATE POLICY "Authenticated users can view providers" ON providers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert providers" ON providers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update providers" ON providers
  FOR UPDATE TO authenticated USING (true);

-- Politicas para application_history
CREATE POLICY "Authenticated users can view application_history" ON application_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert application_history" ON application_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Politicas para onboarding_cards
CREATE POLICY "Authenticated users can view onboarding_cards" ON onboarding_cards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert onboarding_cards" ON onboarding_cards
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboarding_cards" ON onboarding_cards
  FOR UPDATE TO authenticated USING (true);

-- Politicas para onboarding_tasks
CREATE POLICY "Authenticated users can view onboarding_tasks" ON onboarding_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert onboarding_tasks" ON onboarding_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboarding_tasks" ON onboarding_tasks
  FOR UPDATE TO authenticated USING (true);

-- Politicas para notes
CREATE POLICY "Authenticated users can view notes" ON notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notes" ON notes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update own notes" ON notes
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Politicas para history_log (apenas leitura)
CREATE POLICY "Authenticated users can view history_log" ON history_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert history_log" ON history_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Politicas para alerts
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert alerts" ON alerts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Politicas para stage_definitions (leitura para todos, escrita para admins)
CREATE POLICY "Authenticated users can view stage_definitions" ON stage_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage stage_definitions" ON stage_definitions
  FOR ALL TO authenticated USING (true);

-- Politicas para task_definitions
CREATE POLICY "Authenticated users can view task_definitions" ON task_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage task_definitions" ON task_definitions
  FOR ALL TO authenticated USING (true);

-- Politicas para settings
CREATE POLICY "Authenticated users can view settings" ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage settings" ON settings
  FOR ALL TO authenticated USING (true);

-- Politicas para service_categories, services, prices (todas para authenticated)
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access service_categories" ON service_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access services" ON services FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access reference_prices" ON reference_prices FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access provider_services" ON provider_services FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access provider_prices" ON provider_prices FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access provider_price_snapshots" ON provider_price_snapshots FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated read settings_log" ON settings_log FOR SELECT TO authenticated USING (true);
