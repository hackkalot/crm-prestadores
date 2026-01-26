-- Migration: Add files column to notes table
-- Purpose: Store file attachments as JSONB array instead of separate table

-- Add files column as JSONB array with default empty array
ALTER TABLE notes ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN notes.files IS 'Array of file attachments: [{name: string, url: string, path: string, size: number, type: string}]';

-- Index for provider_id + created_at for efficient chat-style queries
CREATE INDEX IF NOT EXISTS idx_notes_provider_created
  ON notes(provider_id, created_at ASC);

-- Index for task_id for task-linked notes queries
CREATE INDEX IF NOT EXISTS idx_notes_task_id
  ON notes(task_id) WHERE task_id IS NOT NULL;
