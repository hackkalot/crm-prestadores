-- Create sync_logs table to track all backoffice synchronizations
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who triggered the sync
  triggered_by UUID NOT NULL REFERENCES users(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Date range synced
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,

  -- Results
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'in_progress')),
  duration_seconds INTEGER, -- Duration in seconds

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

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_sync_logs_triggered_at ON sync_logs(triggered_at DESC);
CREATE INDEX idx_sync_logs_triggered_by ON sync_logs(triggered_by);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER update_sync_logs_updated_at
  BEFORE UPDATE ON sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_logs_updated_at();

-- Enable RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can view logs
CREATE POLICY "Authenticated users can view sync logs"
  ON sync_logs FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can delete logs
CREATE POLICY "Only admins can delete sync logs"
  ON sync_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.approval_status = 'approved'
    )
  );

-- System can insert logs (via service role)
CREATE POLICY "System can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (true);

-- System can update logs (via service role)
CREATE POLICY "System can update sync logs"
  ON sync_logs FOR UPDATE
  USING (true);

-- Add comment
COMMENT ON TABLE sync_logs IS 'Tracks all backoffice synchronization operations with metrics and error details';
