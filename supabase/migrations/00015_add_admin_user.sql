-- Add admin user to users table
-- This user already exists in auth.users, so we insert directly using their auth ID

INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Diogo Pita'),
  'admin',
  'approved',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'diogohenriquepita@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  approval_status = 'approved',
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE users IS 'Admin user added on 2026-01-08 - total 4 users (1 admin, 1 manager, 2 RMs)';
