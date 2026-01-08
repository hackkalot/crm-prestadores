-- Add 'field_change' to the history_event_type enum
ALTER TYPE history_event_type ADD VALUE IF NOT EXISTS 'field_change';

-- Add comment
COMMENT ON TYPE history_event_type IS 'Event types for provider history tracking including field changes';
