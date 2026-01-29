-- Add feedback column to provider_forms_data table
-- Structure: {nps_score?: 0-10, ratings?: {ease_of_use: 1-5, clarity: 1-5, time_spent: 1-5}, time_perception?: 'quick'|'adequate'|'long', comment?: string, submitted_at?: timestamp, skipped?: boolean}

ALTER TABLE provider_forms_data
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN provider_forms_data.feedback IS 'Provider feedback after form submission: {nps_score?: number, ratings?: {ease_of_use, clarity, time_spent}, time_perception?: string, comment?: string, submitted_at?: timestamp, skipped?: boolean}';
