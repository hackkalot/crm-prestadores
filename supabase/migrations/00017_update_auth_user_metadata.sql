-- Update auth.users metadata to include display names
-- This updates the raw_user_meta_data JSONB field

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  '"Mariana Mendonça Santiago"'::jsonb
)
WHERE email = 'mariana.mendonca.santiago@fidelidade.pt';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  '"Ricardo Alves Andrade"'::jsonb
)
WHERE email = 'ricardo.alves.andrade@fidelidade.pt';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  '"Yola Kiffen Rodrigues"'::jsonb
)
WHERE email = 'yola.kiffen.rodrigues@fidelidade.pt';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  '"Diogo Pita"'::jsonb
)
WHERE email = 'diogohenriquepita@gmail.com';
