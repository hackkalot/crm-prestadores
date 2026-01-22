-- Add email_template_id column to task_definitions
-- Allows associating an email template with any task in the onboarding pipeline

ALTER TABLE task_definitions
ADD COLUMN email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_task_definitions_email_template ON task_definitions(email_template_id);

-- Add comment for documentation
COMMENT ON COLUMN task_definitions.email_template_id IS 'Optional email template to use when sending communications for this task';
