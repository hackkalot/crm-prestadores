-- Add default onboarding owner setting
-- This allows configuring which RM is automatically assigned when a provider moves to onboarding

INSERT INTO settings (key, value, description, updated_at)
VALUES (
  'default_onboarding_owner_id',
  'null'::jsonb,
  'ID do Relationship Manager atribuído por defeito ao enviar prestador para onboarding',
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE settings IS 'Settings table updated with default_onboarding_owner_id on 2026-01-08';
