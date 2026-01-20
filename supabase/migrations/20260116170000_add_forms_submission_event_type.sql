-- Add 'forms_submission' to history_event_type enum
ALTER TYPE history_event_type ADD VALUE IF NOT EXISTS 'forms_submission';
