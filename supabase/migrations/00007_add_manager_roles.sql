-- Migration: Add manager and relationship_manager roles
-- Description: Extends user_role enum to support priority management system

-- Extend user_role enum to include 'manager' and 'relationship_manager'
-- Note: These must be added outside of any transaction
DO $$
BEGIN
  -- Add 'manager' value if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
END
$$;

DO $$
BEGIN
  -- Add 'relationship_manager' value if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'relationship_manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'relationship_manager';
  END IF;
END
$$;

-- Update comment
COMMENT ON TYPE user_role IS 'User roles: admin, user, manager, relationship_manager';

-- Add helper function for checking manager role (admin or manager)
-- Uses text comparison to avoid enum issues during migration
CREATE OR REPLACE FUNCTION is_user_manager(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT role::text IN ('admin', 'manager')
  FROM users
  WHERE id = user_id AND approval_status = 'approved';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add helper function for checking relationship manager role
CREATE OR REPLACE FUNCTION is_user_rm(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT role::text = 'relationship_manager'
  FROM users
  WHERE id = user_id AND approval_status = 'approved';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION is_user_manager(UUID) IS 'Checks if user is admin or manager with approved status';
COMMENT ON FUNCTION is_user_rm(UUID) IS 'Checks if user is relationship manager with approved status';
