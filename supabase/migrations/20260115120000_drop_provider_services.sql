-- Drop unused provider_services table
-- Services are stored as an array directly in the providers table
-- This table was never populated and is not needed

DROP TABLE IF EXISTS provider_services CASCADE;
