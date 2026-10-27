-- Restore the previous column default. Existing 'tr' preferences are kept on
-- purpose: reverting the default must not wipe user choices made since.
ALTER TABLE users ALTER COLUMN preferred_language SET DEFAULT 'en';
