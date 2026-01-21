-- Add document event types to history_event_type enum
ALTER TYPE history_event_type ADD VALUE IF NOT EXISTS 'document_uploaded';
ALTER TYPE history_event_type ADD VALUE IF NOT EXISTS 'document_deleted';
