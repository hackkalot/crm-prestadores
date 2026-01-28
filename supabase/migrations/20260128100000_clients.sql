-- Create clients table for client data from backoffice
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary identifier (for upsert)
  user_id TEXT UNIQUE NOT NULL,

  -- Client info
  name TEXT,
  surname TEXT,
  email TEXT,
  phone TEXT,
  vat TEXT, -- NIF

  -- Request stats
  first_request TIMESTAMPTZ,
  last_request TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  active_requests INTEGER DEFAULT 0,
  cancelled_requests INTEGER DEFAULT 0,
  completed_requests INTEGER DEFAULT 0,
  expired_requests INTEGER DEFAULT 0,

  -- Financial
  customer_balance DECIMAL(12, 2) DEFAULT 0,
  total_payments DECIMAL(12, 2) DEFAULT 0,
  total_discounts DECIMAL(12, 2) DEFAULT 0,

  -- Account dates
  registration TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  updated_by TEXT,
  last_login TIMESTAMPTZ,

  -- Marketing consent
  marketing_consent BOOLEAN DEFAULT FALSE,
  marketing_consent_timestamp TIMESTAMPTZ,

  -- Status
  client_status TEXT,
  cancellation_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  status_updated_by TEXT,

  -- Airship (push notifications)
  airship TEXT,

  -- Wallet
  current_wallet_amount DECIMAL(12, 2) DEFAULT 0,
  wallet_is_active BOOLEAN DEFAULT FALSE,
  total_wallet_benefits DECIMAL(12, 2) DEFAULT 0,
  total_wallet_payments DECIMAL(12, 2) DEFAULT 0,
  last_wallet_payment TIMESTAMPTZ,
  number_of_wallet_payments INTEGER DEFAULT 0,
  wallet_total_injected_value DECIMAL(12, 2) DEFAULT 0,
  wallet_removed_value DECIMAL(12, 2) DEFAULT 0,

  -- MGM (Member Get Member)
  client_mgm_promocode TEXT,
  number_mgm_promocode_usage INTEGER DEFAULT 0,
  total_mgm_benefits DECIMAL(12, 2) DEFAULT 0,

  -- Recurrences
  total_overall_recurrencies INTEGER DEFAULT 0,
  active_overall_recurrencies INTEGER DEFAULT 0,
  total_recurrent_sr INTEGER DEFAULT 0,
  total_recurrent_sr_active INTEGER DEFAULT 0,

  -- Device platform
  device_platform_customer_registration TEXT,

  -- Address
  service_address_line_1 TEXT,
  service_address_line_2 TEXT,
  zip_code TEXT,
  city TEXT,

  -- HubSpot
  contact_id TEXT,

  -- BO flags
  bo_generated BOOLEAN DEFAULT FALSE,

  -- Sync metadata
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_vat ON clients(vat);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_client_status ON clients(client_status);
CREATE INDEX idx_clients_registration ON clients(registration DESC);
CREATE INDEX idx_clients_last_request ON clients(last_request DESC);
CREATE INDEX idx_clients_total_requests ON clients(total_requests DESC);
CREATE INDEX idx_clients_city ON clients(city);
CREATE INDEX idx_clients_synced_at ON clients(synced_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert clients"
  ON clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update clients"
  ON clients FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete clients"
  ON clients FOR DELETE
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
COMMENT ON TABLE clients IS 'Client data imported from backoffice FIXO';


-- Create clients_sync_logs table to track client synchronizations
CREATE TABLE IF NOT EXISTS clients_sync_logs (
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
CREATE INDEX idx_clients_sync_logs_triggered_at ON clients_sync_logs(triggered_at DESC);
CREATE INDEX idx_clients_sync_logs_triggered_by ON clients_sync_logs(triggered_by);
CREATE INDEX idx_clients_sync_logs_status ON clients_sync_logs(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_clients_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_sync_logs_updated_at
  BEFORE UPDATE ON clients_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_sync_logs_updated_at();

-- Enable RLS
ALTER TABLE clients_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view clients sync logs"
  ON clients_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert clients sync logs"
  ON clients_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update clients sync logs"
  ON clients_sync_logs FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete clients sync logs"
  ON clients_sync_logs FOR DELETE
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
COMMENT ON TABLE clients_sync_logs IS 'Tracks all client synchronization operations with metrics and error details';
