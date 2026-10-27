-- Turkish ('tr') became a first-class UI language in this deployment; widen
-- users.preferred_language so PUT /me/language accepts it.

ALTER TABLE users DROP CONSTRAINT users_preferred_language_check;
ALTER TABLE users
    ADD CONSTRAINT users_preferred_language_check
    CHECK (preferred_language IN ('en', 'si', 'ta', 'tr'));
