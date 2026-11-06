# PROMPTS.md — LedgerLine Implementation Log

---
Date: 2026-11-06
Prompt: Sub-prompt 1 — Repo scaffold and DB setup
Output: Initialized monorepo with pnpm workspaces, docker-compose.yml with PostgreSQL 16, Prisma schema with models (User, Account, AccountHolder, LedgerEntry, IdempotencyKey), migration with raw SQL trigger `prevent_ledger_mutation` and DB-level CHECK constraint `no_negative_balance`, and seed script with 3 users and 2 accounts.
Problem: Prisma schema DSL does not natively apply `@@check(balancePence >= -overdraftLimit)` in PostgreSQL during migration without preview flags or raw DDL. Relying solely on schema annotations would leave the database without a true constraint. Furthermore, the trigger `prevent_ledger_mutation` must be written in raw SQL to intercept both UPDATE and DELETE statements before modification.
Fix: Created a dedicated migration (`20261106062700_immutable_ledger_and_check_constraint`) applying `ALTER TABLE "Account" ADD CONSTRAINT "no_negative_balance" CHECK ("balancePence" >= -"overdraftLimit")` and a PL/pgSQL function/trigger `prevent_ledger_mutation()` on `"LedgerEntry"`. Verified rejection of UPDATE/DELETE and negative balance violations via psql tests.
---

---
Date: 2026-11-06
Prompt: Sub-prompt 2 — Auth routes and JWT middleware
Output: Implemented JWT authentication middleware (`auth.ts`), role-based authorization guard (`roleGuard.ts`), auth routes for login, refresh, and logout with refresh token revocation (`RefreshToken` table in DB), and account ownership checks ensuring HOLDER only views and operates on own accounts. Created integration test suite `tests/authz.test.ts`.
Problem: A common vulnerability is performing account ownership authorization only in route middleware rather than deep in the money-moving transfer engine (`transferService.ts`). If a money-moving operation is invoked directly or an endpoint lacks middleware, cross-user debiting could occur.
Fix: Verified that `verifyDebitAuthorization` is strictly executed inside `transferService.ts` within the database transaction against `AccountHolder`. Tested via `tests/authz.test.ts` where a HOLDER attempting to transfer from an admin-owned account was rejected with 403 Forbidden.
---

---
Date: 2026-11-06
Prompt: Sub-prompt 3 — Idempotency middleware
Output: Implemented `idempotencyMiddleware` (`idempotency.ts`) and `idempotencyService.ts` using `INSERT INTO "IdempotencyKey" ... ON CONFLICT (key) DO NOTHING` to eliminate race conditions between concurrent initial requests. Configured request-in-flight detection (HTTP 409), replay caching with stored response bodies and HTTP status codes, and test suite `tests/idempotency.test.ts`.
Problem: Standard ORM find-or-create patterns execute a `SELECT` followed by an `INSERT`, creating a TOCTOU race condition where two simultaneous requests with the same key can both pass the read check and attempt duplicate transactions. Additionally, deterministic JWT generation for refresh tokens caused unique constraint errors across test runs in the same second.
Fix: Used Prisma `$executeRaw` with PostgreSQL `INSERT ... ON CONFLICT (key) DO NOTHING` and inspected the returned affected row count. If 0 rows were affected, the existing key status was queried: returning 409 if `PROCESSING` or cached status/body if `COMPLETE`. Added UUID nonces (`jti`) to refresh tokens to ensure distinct tokens per issuance. Verified via `tests/idempotency.test.ts` with concurrent `Promise.all` requests.
---

---
Date: 2026-11-06
Prompt: Sub-prompt 4 — Transfer engine
Output: Implemented `transferService.ts` with `executeTransfer`, `deposit`, and `withdraw` inside `prisma.$transaction` using `Serializable` isolation and row-level `SELECT ... FOR UPDATE` ordered by ID to eliminate deadlocks. Balance checks are strictly performed inside the locked transaction and atomic optimistic version increments are applied.
Problem: If accounts are locked in arbitrary or request-specified order, two concurrent transfers between the same two accounts in opposing directions (A -> B and B -> A) produce classic database deadlocks. Furthermore, balance checking before row locking introduces a TOCTOU race window under concurrent load.
Fix: Sorted account IDs ascending before acquiring `SELECT ... FOR UPDATE` locks. Executed the overdraft/balance check strictly after row acquisition within a Serializable transaction. Added persistent REFUSED ledger entries on failure and verified with optimistic locking version increments.
---
