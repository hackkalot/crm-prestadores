-- Migration: RLS Policies for Priorities
-- Description: Row Level Security policies for priority system

-- Enable RLS
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_progress_log ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PRIORITIES POLICIES
-- ========================================

-- Users can view priorities based on role and assignment
CREATE POLICY "Users can view priorities"
  ON priorities FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_user_admin(auth.uid())  -- Admins see all
      OR created_by = auth.uid()  -- Creators see theirs
      OR is_user_manager(auth.uid())  -- Managers see all
      OR EXISTS (
        SELECT 1 FROM priority_assignments
        WHERE priority_id = priorities.id
        AND user_id = auth.uid()
      )  -- Assigned users see theirs
    )
  );

-- Only managers and admins can create priorities
CREATE POLICY "Managers can create priorities"
  ON priorities FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_manager(auth.uid())
  );

-- Only managers, admins, and creators can update priorities
CREATE POLICY "Managers can update priorities"
  ON priorities FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_user_manager(auth.uid())
      OR created_by = auth.uid()
    )
  );

-- Only admins can hard delete (soft delete via update)
CREATE POLICY "Only admins can delete priorities"
  ON priorities FOR DELETE
  TO authenticated
  USING (
    is_user_admin(auth.uid())
  );

-- ========================================
-- PRIORITY ASSIGNMENTS POLICIES
-- ========================================

-- Users can view their own assignments and managers/admins see all
CREATE POLICY "Users can view priority assignments"
  ON priority_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_user_manager(auth.uid())
  );

-- Only managers and admins can manage assignments
CREATE POLICY "Managers can create assignments"
  ON priority_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_manager(auth.uid())
  );

CREATE POLICY "Managers can update assignments"
  ON priority_assignments FOR UPDATE
  TO authenticated
  USING (
    is_user_manager(auth.uid())
  );

CREATE POLICY "Managers can delete assignments"
  ON priority_assignments FOR DELETE
  TO authenticated
  USING (
    is_user_manager(auth.uid())
  );

-- ========================================
-- PRIORITY PROGRESS LOG POLICIES
-- ========================================

-- Anyone can view logs for priorities they have access to
CREATE POLICY "Users can view progress logs"
  ON priority_progress_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM priorities
      WHERE priorities.id = priority_progress_log.priority_id
      AND deleted_at IS NULL
    )
  );

-- Anyone with priority access can create progress logs (for manual updates)
CREATE POLICY "Users can create progress logs"
  ON priority_progress_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM priorities
      WHERE priorities.id = priority_progress_log.priority_id
      AND deleted_at IS NULL
    )
  );

-- Add comments
COMMENT ON POLICY "Users can view priorities" ON priorities IS 'Admins, managers, creators, and assigned users can view non-deleted priorities';
COMMENT ON POLICY "Managers can create priorities" ON priorities IS 'Only managers and admins can create new priorities';
COMMENT ON POLICY "Users can view progress logs" ON priority_progress_log IS 'Users with access to a priority can view its progress log';
