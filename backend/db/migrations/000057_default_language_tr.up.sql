-- Make Turkish the default UI language for users provisioned from the IdP.
-- Deployment defaults to tr (frontend I18nProvider fallback is tr too), so new
-- users should start in Turkish instead of English. Existing accounts created
-- before this migration got the old 'en' column default and never chose a
-- language themselves, so they are moved to 'tr' as well.
ALTER TABLE users ALTER COLUMN preferred_language SET DEFAULT 'tr';
UPDATE users SET preferred_language = 'tr' WHERE preferred_language = 'en';
