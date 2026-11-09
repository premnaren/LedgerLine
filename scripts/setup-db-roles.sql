-- ====================================================================
-- LedgerLine Database Role Architecture & Least-Privilege Separation
-- ====================================================================
-- This script provisions distinct PostgreSQL roles with least-privilege boundaries:
--
-- 1. ledgerline_owner      - DDL Schema administrator (Prisma migrations)
-- 2. ledgerline_app        - Application runtime (DML only, no DDL/DROP)
-- 3. ledgerline_auditor    - Read-only compliance auditor (SELECT only)
-- 4. bootstrap_operator    - Provisioning operator (Can initialize initial admin)
-- ====================================================================

-- 1. Create Roles (if they do not already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledgerline_owner') THEN
    CREATE ROLE ledgerline_owner WITH LOGIN PASSWORD 'OwnerPassword123!';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledgerline_app') THEN
    CREATE ROLE ledgerline_app WITH LOGIN PASSWORD 'AppRuntimePassword123!';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledgerline_auditor') THEN
    CREATE ROLE ledgerline_auditor WITH LOGIN PASSWORD 'AuditorReadOnlyPassword123!';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bootstrap_operator') THEN
    CREATE ROLE bootstrap_operator WITH LOGIN PASSWORD 'BootstrapOperatorPassword123!';
  END IF;
END
$$;

-- 2. Schema Permissions
GRANT USAGE, CREATE ON SCHEMA public TO ledgerline_owner;
GRANT USAGE ON SCHEMA public TO ledgerline_app;
GRANT USAGE ON SCHEMA public TO ledgerline_auditor;
GRANT USAGE ON SCHEMA public TO bootstrap_operator;

-- 3. App Runtime Permissions (DML Only: SELECT, INSERT, UPDATE - NO DROP/TRUNCATE)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ledgerline_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ledgerline_app;

-- Ensure future tables created by migrations inherit app permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO ledgerline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ledgerline_app;

-- 4. Auditor Permissions (Strict Read-Only: SELECT on financial logs & accounts only)
GRANT SELECT ON TABLE "Account", "LedgerEntry", "AccountHolder", "IdempotencyKey" TO ledgerline_auditor;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ledgerline_auditor;

-- Revoke dangerous permissions from auditor
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM ledgerline_auditor;

-- 5. Immutable Ledger Enforcement Verification
-- Engine-level trigger 'prevent_ledger_mutation' blocks any UPDATE or DELETE on LedgerEntry,
-- even if an authorized database role attempts it:
-- SELECT tgname, relname FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE tgname = 'prevent_ledger_mutation';

COMMENT ON ROLE ledgerline_app IS 'Runtime application role with DML permissions (SELECT, INSERT, UPDATE). DDL prohibited.';
COMMENT ON ROLE ledgerline_auditor IS 'Global compliance auditor role with strict read-only access.';
COMMENT ON ROLE bootstrap_operator IS 'Provisioning operator with rights to execute initial administrator setup.';

