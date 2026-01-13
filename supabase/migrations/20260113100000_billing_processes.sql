-- Create billing_processes table for provider billing data from backoffice
CREATE TABLE IF NOT EXISTS billing_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary identifier (for upsert)
  request_code TEXT UNIQUE NOT NULL,

  -- Service request reference
  service_request_identifier INTEGER,

  -- Provider info
  assigned_provider_name TEXT,

  -- Service info
  service TEXT,

  -- Dates (stored as TIMESTAMPTZ from Excel serial dates)
  scheduled_to TIMESTAMPTZ,
  document_date TIMESTAMPTZ,
  bo_validation_date TIMESTAMPTZ,
  payment_date TIMESTAMPTZ,
  timestamp_process_status TIMESTAMPTZ,

  -- Counts
  invoices_number INTEGER DEFAULT 0,
  credit_note_number INTEGER DEFAULT 0,

  -- Flags
  has_duplicate BOOLEAN DEFAULT FALSE,
  provider_automatic_cost BOOLEAN DEFAULT FALSE,
  complaint BOOLEAN DEFAULT FALSE,

  -- Financial data (in EUR)
  total_service_cost DECIMAL(12, 2) DEFAULT 0,
  base_service_cost DECIMAL(12, 2) DEFAULT 0,
  total_invoice_value DECIMAL(12, 2) DEFAULT 0,
  sum_transactions DECIMAL(12, 2) DEFAULT 0,

  -- Status
  process_status TEXT,

  -- Document info
  document_number TEXT,

  -- Conclusion
  conclusion_response TEXT,

  -- Sync metadata
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_billing_processes_request_code ON billing_processes(request_code);
CREATE INDEX idx_billing_processes_assigned_provider_name ON billing_processes(assigned_provider_name);
CREATE INDEX idx_billing_processes_process_status ON billing_processes(process_status);
CREATE INDEX idx_billing_processes_scheduled_to ON billing_processes(scheduled_to DESC);
CREATE INDEX idx_billing_processes_payment_date ON billing_processes(payment_date DESC);
CREATE INDEX idx_billing_processes_synced_at ON billing_processes(synced_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_billing_processes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_processes_updated_at
  BEFORE UPDATE ON billing_processes
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_processes_updated_at();

-- Enable RLS
ALTER TABLE billing_processes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view billing processes"
  ON billing_processes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert billing processes"
  ON billing_processes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update billing processes"
  ON billing_processes FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete billing processes"
  ON billing_processes FOR DELETE
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
COMMENT ON TABLE billing_processes IS 'Provider billing processes imported from backoffice FIXO';


-- Create billing_sync_logs table to track billing synchronizations
CREATE TABLE IF NOT EXISTS billing_sync_logs (
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
CREATE INDEX idx_billing_sync_logs_triggered_at ON billing_sync_logs(triggered_at DESC);
CREATE INDEX idx_billing_sync_logs_triggered_by ON billing_sync_logs(triggered_by);
CREATE INDEX idx_billing_sync_logs_status ON billing_sync_logs(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_billing_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_sync_logs_updated_at
  BEFORE UPDATE ON billing_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_sync_logs_updated_at();

-- Enable RLS
ALTER TABLE billing_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view billing sync logs"
  ON billing_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert billing sync logs"
  ON billing_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update billing sync logs"
  ON billing_sync_logs FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete billing sync logs"
  ON billing_sync_logs FOR DELETE
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
COMMENT ON TABLE billing_sync_logs IS 'Tracks all billing synchronization operations with metrics and error details';
