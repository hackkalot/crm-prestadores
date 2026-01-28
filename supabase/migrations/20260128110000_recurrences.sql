-- Create recurrences table for recurrence data from backoffice
CREATE TABLE IF NOT EXISTS recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary identifier (for upsert)
  recurrence_code TEXT UNIQUE NOT NULL,

  -- Recurrence info
  recurrence_type TEXT,
  recurrence_status TEXT,
  submission_date TIMESTAMPTZ,

  -- Service
  service TEXT,

  -- Client info
  user_id TEXT,
  client_name TEXT,

  -- Address
  address_town TEXT,
  address_district TEXT,
  address_street TEXT,

  -- Source
  source TEXT,

  -- Flags
  flag_edit_schedule BOOLEAN DEFAULT FALSE,
  flag_edit_payment BOOLEAN DEFAULT FALSE,

  -- Inactivation
  inactivation_date TIMESTAMPTZ,
  inactivation_reason TEXT,
  inactivation_comment TEXT,

  -- Sync metadata
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_recurrences_recurrence_code ON recurrences(recurrence_code);
CREATE INDEX idx_recurrences_user_id ON recurrences(user_id);
CREATE INDEX idx_recurrences_recurrence_type ON recurrences(recurrence_type);
CREATE INDEX idx_recurrences_recurrence_status ON recurrences(recurrence_status);
CREATE INDEX idx_recurrences_service ON recurrences(service);
CREATE INDEX idx_recurrences_address_district ON recurrences(address_district);
CREATE INDEX idx_recurrences_submission_date ON recurrences(submission_date DESC);
CREATE INDEX idx_recurrences_synced_at ON recurrences(synced_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_recurrences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurrences_updated_at
  BEFORE UPDATE ON recurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_recurrences_updated_at();

-- Enable RLS
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view recurrences"
  ON recurrences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert recurrences"
  ON recurrences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update recurrences"
  ON recurrences FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete recurrences"
  ON recurrences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.approval_status = 'approved'
    )
  );

-- Add comment
COMMENT ON TABLE recurrences IS 'Recurrence data imported from backoffice FIXO';


-- Create recurrences_sync_logs table to track recurrence synchronizations
CREATE TABLE IF NOT EXISTS recurrences_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who triggered the sync (NULL for scheduled runs)
  triggered_by UUID REFERENCES users(id),
  triggered_by_system TEXT, -- 'github-actions-scheduled' for automated runs
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Results
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'in_progress')),
  duration_seconds INTEGER,

  -- Metrics
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,

  -- File info
  excel_file_path TEXT,
  excel_file_size_kb INTEGER,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_recurrences_sync_logs_triggered_at ON recurrences_sync_logs(triggered_at DESC);
CREATE INDEX idx_recurrences_sync_logs_triggered_by ON recurrences_sync_logs(triggered_by);
CREATE INDEX idx_recurrences_sync_logs_status ON recurrences_sync_logs(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_recurrences_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurrences_sync_logs_updated_at
  BEFORE UPDATE ON recurrences_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_recurrences_sync_logs_updated_at();

-- Enable RLS
ALTER TABLE recurrences_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view recurrences sync logs"
  ON recurrences_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert recurrences sync logs"
  ON recurrences_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update recurrences sync logs"
  ON recurrences_sync_logs FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete recurrences sync logs"
  ON recurrences_sync_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.approval_status = 'approved'
    )
  );

-- Add comment
COMMENT ON TABLE recurrences_sync_logs IS 'Tracks all recurrence synchronization operations with metrics and error details';
