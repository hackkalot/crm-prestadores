-- Migration: Tasks sync from backoffice
-- URL: https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/TaskManagement

-- Table to store tasks data from backoffice
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fields from backoffice export
  task_id TEXT UNIQUE NOT NULL,           -- TASK_ID (unique key)
  task_type TEXT,                         -- TASK_TYPE
  sr TEXT,                                -- SR (Service Request)
  created_by TEXT,                        -- CREATED_BY
  given_to TEXT,                          -- GIVEN_TO
  creation_date TIMESTAMPTZ,              -- CREATION_DATE
  deadline TIMESTAMPTZ,                   -- DEADLINE
  status TEXT,                            -- STATUS
  finishing_date TIMESTAMPTZ,             -- FINISHING_DATE
  finished_by TEXT,                       -- FINISHED_BY
  assigned_provider TEXT,                 -- ASSIGNED_PROVIDER
  scheduled_to TIMESTAMPTZ,               -- SCHEDULED_TO

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sr ON tasks(sr);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_provider ON tasks(assigned_provider);
CREATE INDEX IF NOT EXISTS idx_tasks_creation_date ON tasks(creation_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);

-- Sync logs table for tasks
CREATE TABLE IF NOT EXISTS tasks_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES users(id),
  triggered_by_system TEXT,              -- 'github-actions-scheduled' for cron jobs
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, success, error
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  excel_file_path TEXT,
  excel_file_size_kb INTEGER,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for sync logs
ALTER TABLE tasks_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks sync logs"
  ON tasks_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks sync logs"
  ON tasks_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks sync logs"
  ON tasks_sync_logs FOR UPDATE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO service_role;
GRANT ALL ON tasks_sync_logs TO authenticated;
GRANT ALL ON tasks_sync_logs TO service_role;

-- Comment
COMMENT ON TABLE tasks IS 'Tasks data synced from FIXO backoffice TaskManagement';
COMMENT ON TABLE tasks_sync_logs IS 'Logs for tasks sync operations';
