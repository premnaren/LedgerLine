# PROMPTS.md — LedgerLine Implementation Log

---
Date: 2026-11-06
Prompt: Sub-prompt 1 — Repo scaffold and DB setup
Output: Initialized monorepo with pnpm workspaces, docker-compose.yml with PostgreSQL 16, Prisma schema with models (User, Account, AccountHolder, LedgerEntry, IdempotencyKey), migration with raw SQL trigger `prevent_ledger_mutation` and DB-level CHECK constraint `no_negative_balance`, and seed script with 3 users and 2 accounts.
Problem: Prisma schema DSL does not natively apply `@@check(balancePence >= -overdraftLimit)` in PostgreSQL during migration without preview flags or raw DDL. Relying solely on schema annotations would leave the database without a true constraint. Furthermore, the trigger `prevent_ledger_mutation` must be written in raw SQL to intercept both UPDATE and DELETE statements before modification.
Fix: Created a dedicated migration (`20261106062700_immutable_ledger_and_check_constraint`) applying `ALTER TABLE "Account" ADD CONSTRAINT "no_negative_balance" CHECK ("balancePence" >= -"overdraftLimit")` and a PL/pgSQL function/trigger `prevent_ledger_mutation()` on `"LedgerEntry"`. Verified rejection of UPDATE/DELETE and negative balance violations via psql tests.
---
