-- Add priority-related alert types
-- Note: alert_type is VARCHAR(50), not an enum, so we just need to add the column and index
-- The alert types we'll use:
-- - 'priority_deadline_approaching': When a priority deadline is approaching
-- - 'priority_completed': When a priority is completed
-- - 'priority_created': When a new priority is assigned to a user

-- Add priority reference to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES priorities(id) ON DELETE CASCADE;

-- Add index for priority_id
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority_id) WHERE priority_id IS NOT NULL;
