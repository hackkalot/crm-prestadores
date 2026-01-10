-- Create provider_sync_logs table to track provider synchronizations
CREATE TABLE IF NOT EXISTS provider_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who triggered the sync
  triggered_by UUID NOT NULL REFERENCES users(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Results
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'in_progress')),
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

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_provider_sync_logs_triggered_at ON provider_sync_logs(triggered_at DESC);
CREATE INDEX idx_provider_sync_logs_triggered_by ON provider_sync_logs(triggered_by);
CREATE INDEX idx_provider_sync_logs_status ON provider_sync_logs(status);

-- Create updated_at trigger
CREATE TRIGGER update_provider_sync_logs_updated_at
  BEFORE UPDATE ON provider_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE provider_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view provider sync logs"
  ON provider_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert provider sync logs"
  ON provider_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update provider sync logs"
  ON provider_sync_logs FOR UPDATE
  USING (true);

COMMENT ON TABLE provider_sync_logs IS 'Tracks provider synchronization operations from backoffice';
