-- Migration: Secure Forms Token System
-- Adds token expiration, rate limiting, and better token generation

-- 1. Add expiration column to providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS forms_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forms_token_created_at TIMESTAMPTZ;

-- 2. Create rate limiting table for forms access attempts
CREATE TABLE IF NOT EXISTS forms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or token
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'token')),
  attempts INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_forms_rate_limits_identifier
  ON forms_rate_limits(identifier, identifier_type);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_forms_rate_limits_last_attempt
  ON forms_rate_limits(last_attempt_at);

-- RLS for rate limits table (service_role only)
ALTER TABLE forms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON forms_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Function to clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM forms_rate_limits
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE forms_rate_limits IS 'Rate limiting for forms access to prevent brute force attacks';
COMMENT ON COLUMN providers.forms_token_expires_at IS 'When the forms token expires (null = never expires for feedback window)';
COMMENT ON COLUMN providers.forms_token_created_at IS 'When the current token was generated';
