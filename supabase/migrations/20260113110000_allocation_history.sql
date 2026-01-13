-- ============================================
-- Allocation History Tables
-- ============================================
-- Stores allocation performance metrics for providers
-- exported from backoffice "Exportar histórico de alocação"

-- Main table for allocation history data
CREATE TABLE allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider identification
  backoffice_provider_id INTEGER NOT NULL,
  provider_name TEXT NOT NULL,

  -- Period this record covers
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,

  -- Allocation metrics
  requests_received INTEGER DEFAULT 0,
  requests_accepted INTEGER DEFAULT 0,
  requests_expired INTEGER DEFAULT 0,
  requests_rejected INTEGER DEFAULT 0,

  -- Response time (stored as interval for easier calculations)
  avg_response_time INTERVAL,
  -- Also store raw string for display
  avg_response_time_raw TEXT,

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per provider per period
  UNIQUE(backoffice_provider_id, period_from, period_to)
);

-- Index for common queries
CREATE INDEX idx_allocation_history_provider ON allocation_history(backoffice_provider_id);
CREATE INDEX idx_allocation_history_period ON allocation_history(period_from, period_to);
CREATE INDEX idx_allocation_history_synced ON allocation_history(synced_at DESC);

-- Sync logs table for allocation history syncs
CREATE TABLE allocation_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who triggered (null for scheduled syncs)
  triggered_by UUID REFERENCES users(id),
  triggered_by_system TEXT, -- 'github-actions-scheduled', 'localhost', etc.

  -- Period that was synced
  period_from DATE,
  period_to DATE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'error')),
  duration_seconds INTEGER,

  -- Record counts
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
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for logs queries
CREATE INDEX idx_allocation_sync_logs_status ON allocation_sync_logs(status);
CREATE INDEX idx_allocation_sync_logs_triggered ON allocation_sync_logs(triggered_at DESC);

-- RLS Policies
ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_sync_logs ENABLE ROW LEVEL SECURITY;

-- Allocation history: all authenticated users can read
CREATE POLICY "allocation_history_select" ON allocation_history
  FOR SELECT TO authenticated USING (true);

-- Allocation history: only service role can insert/update (via sync scripts)
CREATE POLICY "allocation_history_insert" ON allocation_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY "allocation_history_update" ON allocation_history
  FOR UPDATE USING (false);

-- Sync logs: all authenticated users can read
CREATE POLICY "allocation_sync_logs_select" ON allocation_sync_logs
  FOR SELECT TO authenticated USING (true);

-- Sync logs: authenticated users can insert (to create log when triggering sync)
CREATE POLICY "allocation_sync_logs_insert" ON allocation_sync_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Sync logs: only update own logs or service role
CREATE POLICY "allocation_sync_logs_update" ON allocation_sync_logs
  FOR UPDATE TO authenticated USING (triggered_by = auth.uid() OR triggered_by IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_allocation_history_updated_at
  BEFORE UPDATE ON allocation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_allocation_sync_logs_updated_at
  BEFORE UPDATE ON allocation_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE allocation_history IS 'Provider allocation performance metrics from backoffice';
COMMENT ON TABLE allocation_sync_logs IS 'Log of allocation history sync operations';
COMMENT ON COLUMN allocation_history.avg_response_time IS 'Average response time as PostgreSQL interval';
COMMENT ON COLUMN allocation_history.avg_response_time_raw IS 'Original HH:MM:SS string from backoffice';
