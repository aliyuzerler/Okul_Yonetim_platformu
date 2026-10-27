-- Restore the original constraint (fails if any row already uses 'tr').

ALTER TABLE users DROP CONSTRAINT users_preferred_language_check;
ALTER TABLE users
    ADD CONSTRAINT users_preferred_language_check
    CHECK (preferred_language IN ('en', 'si', 'ta'));
