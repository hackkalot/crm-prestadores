-- Migration: Add Two-Factor Authentication (2FA) to users
-- Supports both Email OTP and TOTP (Authenticator Apps)

-- 1. Add 2FA columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_method TEXT CHECK (two_factor_method IN ('email', 'totp', null)),
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backup_codes_hash TEXT[], -- Hashed backup codes
  ADD COLUMN IF NOT EXISTS two_factor_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS two_factor_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_two_factor_at TIMESTAMPTZ;

-- 2. Create table for pending 2FA verifications (email OTP and login verification)
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  code_hash TEXT NOT NULL, -- Hashed 6-digit code
  code_type TEXT NOT NULL CHECK (code_type IN ('login', 'setup', 'disable')),
  method TEXT NOT NULL CHECK (method IN ('email', 'totp')),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 3. Create table for 2FA sessions (track verified 2FA during login)
CREATE TABLE IF NOT EXISTS two_factor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL, -- Temporary token after 2FA verification
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_id ON two_factor_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires ON two_factor_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_two_factor_sessions_user_id ON two_factor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_sessions_token ON two_factor_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_two_factor_sessions_expires ON two_factor_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);

-- RLS Policies
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage 2FA codes
CREATE POLICY "Service role can manage 2fa codes"
  ON two_factor_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage 2fa sessions"
  ON two_factor_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired 2FA codes and sessions
CREATE OR REPLACE FUNCTION cleanup_expired_2fa()
RETURNS void AS $$
BEGIN
  DELETE FROM two_factor_codes WHERE expires_at < NOW();
  DELETE FROM two_factor_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE two_factor_codes IS 'Temporary 2FA verification codes (email OTP or login verification)';
COMMENT ON TABLE two_factor_sessions IS 'Verified 2FA sessions during login flow';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_method IS 'Preferred 2FA method: email or totp (authenticator app)';
COMMENT ON COLUMN users.totp_secret_encrypted IS 'Encrypted TOTP secret for authenticator apps';
COMMENT ON COLUMN users.backup_codes_hash IS 'Array of hashed backup codes for account recovery';
