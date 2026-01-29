-- Add secondary contacts (phones and emails) as JSONB columns
-- Structure: [{"value": "912345678", "label": "Pessoal"}, {"value": "961234567", "label": "Trabalho"}]

ALTER TABLE providers
ADD COLUMN IF NOT EXISTS secondary_phones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS secondary_emails JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN providers.secondary_phones IS 'Array of secondary phone contacts: [{value: string, label?: string}]';
COMMENT ON COLUMN providers.secondary_emails IS 'Array of secondary email contacts: [{value: string, label?: string}]';

-- Create index for potential JSONB queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_providers_secondary_phones ON providers USING gin (secondary_phones);
CREATE INDEX IF NOT EXISTS idx_providers_secondary_emails ON providers USING gin (secondary_emails);
