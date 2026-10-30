-- SaaS platform (docs/adr/0011): subscription plan catalog. Money is stored
-- as kuruş (integer) to avoid floating point drift; 0 max_students means
-- unlimited. Annual prices are seeded at 10x monthly (two months free).
CREATE TABLE platform_plans (
    id                  UUID         PRIMARY KEY,
    code                VARCHAR(32)  NOT NULL UNIQUE,
    name                VARCHAR(128) NOT NULL,
    description         TEXT         NOT NULL DEFAULT '',
    max_students        INTEGER      NOT NULL CHECK (max_students >= 0),
    price_monthly_kurus BIGINT       NOT NULL CHECK (price_monthly_kurus >= 0),
    price_annual_kurus  BIGINT       NOT NULL CHECK (price_annual_kurus >= 0),
    trial_days          INTEGER      NOT NULL DEFAULT 14 CHECK (trial_days >= 0),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
