-- Create service_templates table for storing service description templates
-- These are imported from DOCX files and used to generate onboarding documentation

CREATE TABLE service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mapping to service_prices
  service_name TEXT NOT NULL,           -- Match with service_prices.service_name
  service_group TEXT,                   -- Match with service_prices.service_group
  cluster TEXT,                         -- Match with service_prices.cluster
  folder_path TEXT NOT NULL,            -- Original folder (e.g., "Instalação e reparação")
  file_name TEXT NOT NULL,              -- Original filename (e.g., "Eletricista.docx")

  -- Content
  content_markdown TEXT NOT NULL,       -- Full markdown converted from DOCX
  sections JSONB DEFAULT '{}',          -- Parsed sections: includes, excludes, notes

  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  imported_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(service_name, version)
);

-- Indexes for common queries
CREATE INDEX idx_service_templates_service_name ON service_templates(service_name);
CREATE INDEX idx_service_templates_service_group ON service_templates(service_group);
CREATE INDEX idx_service_templates_cluster ON service_templates(cluster);
CREATE INDEX idx_service_templates_active ON service_templates(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
CREATE POLICY "Allow read for authenticated users"
  ON service_templates FOR SELECT
  TO authenticated
  USING (true);

-- Allow all operations for service role (admin operations)
CREATE POLICY "Allow all for service role"
  ON service_templates FOR ALL
  TO service_role
  USING (true);

-- Comments
COMMENT ON TABLE service_templates IS 'Service description templates imported from DOCX files for onboarding documentation';
COMMENT ON COLUMN service_templates.service_name IS 'Matches service_prices.service_name for linking';
COMMENT ON COLUMN service_templates.sections IS 'Parsed sections in JSON format: { includes: string[], excludes: string[], importantNotes: string[] }';
COMMENT ON COLUMN service_templates.version IS 'Version number for template updates while preserving history';
