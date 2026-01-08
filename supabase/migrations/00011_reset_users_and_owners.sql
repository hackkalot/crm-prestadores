-- Reset users and provider owners
-- This migration:
-- 1. Removes all user references from providers
-- 2. Deletes all existing users and related data
-- 3. Adds new users with specific roles

-- Step 1: Remove all user references from providers
UPDATE providers
SET
  relationship_owner_id = NULL,
  abandoned_by = NULL
WHERE relationship_owner_id IS NOT NULL
   OR abandoned_by IS NOT NULL;

-- Step 2: Remove user references from task_definitions and settings
UPDATE task_definitions
SET default_owner_id = NULL
WHERE default_owner_id IS NOT NULL;

UPDATE settings
SET updated_by = NULL
WHERE updated_by IS NOT NULL;

-- Step 3: Delete all related data that references users
-- Order matters due to foreign key constraints
DELETE FROM alerts;
DELETE FROM notes;
DELETE FROM priority_assignments;
DELETE FROM priority_progress_log;
DELETE FROM priorities;
DELETE FROM onboarding_tasks;
DELETE FROM history_log;
DELETE FROM provider_price_snapshots;
DELETE FROM onboarding_cards;
DELETE FROM settings_log;
DELETE FROM provider_documents;

-- Step 4: Delete all existing users (now safe to delete)
DELETE FROM users;

-- Step 3: Insert new users
-- Note: These users will need to complete registration via the app
-- Their auth.users records will be created when they sign up with these emails

-- Admin user
INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'diogohenriquepita@gmail.com',
  'Diogo Pita',
  'admin',
  'approved',
  NOW(),
  NOW()
);

-- Manager user
INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mariana.mendonca.santiago@fidelidade.pt',
  'Mariana Mendonça Santiago',
  'manager',
  'approved',
  NOW(),
  NOW()
);

-- RM users
INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ricardo.alves.andrade@fidelidade.pt',
  'Ricardo Alves Andrade',
  'relationship_manager',
  'approved',
  NOW(),
  NOW()
);

INSERT INTO users (id, email, name, role, approval_status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'yola.kiffen.rodrigues@fidelidade.pt',
  'Yola Kiffen Rodrigues',
  'relationship_manager',
  'approved',
  NOW(),
  NOW()
);

-- Add comment
COMMENT ON TABLE users IS 'Users table reset on 2026-01-08 with new team structure';
