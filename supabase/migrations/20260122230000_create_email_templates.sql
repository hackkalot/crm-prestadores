-- Create email_templates table for storing reusable email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Create index for faster lookups by key
CREATE INDEX idx_email_templates_key ON email_templates(key);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read templates
CREATE POLICY "email_templates_select_policy" ON email_templates
  FOR SELECT TO authenticated
  USING (true);

-- Policy for authenticated users to insert/update/delete
CREATE POLICY "email_templates_insert_policy" ON email_templates
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "email_templates_update_policy" ON email_templates
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "email_templates_delete_policy" ON email_templates
  FOR DELETE TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE email_templates IS 'Stores email templates for automated communications';
COMMENT ON COLUMN email_templates.key IS 'Unique identifier for the template (e.g., welcome_provider, task_reminder)';
COMMENT ON COLUMN email_templates.variables IS 'JSON array of variable names that can be interpolated in subject/body (e.g., ["provider_name", "deadline"])';
