-- Migration: Add social media fields to providers table
-- Date: 2026-01-08
-- Description: Add fields for website and social media links (Facebook, Instagram, LinkedIn, Twitter/X)

-- Add social media URL fields
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add comment to document the fields
COMMENT ON COLUMN providers.website IS 'Provider website URL';
COMMENT ON COLUMN providers.facebook_url IS 'Provider Facebook page URL';
COMMENT ON COLUMN providers.instagram_url IS 'Provider Instagram profile URL';
COMMENT ON COLUMN providers.linkedin_url IS 'Provider LinkedIn company/profile URL';
COMMENT ON COLUMN providers.twitter_url IS 'Provider Twitter/X profile URL';
