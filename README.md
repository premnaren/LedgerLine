# LedgerLine — Double-Entry Core Ledger System

> Enterprise-grade double-entry ledger engine and financial dashboard built with Node.js, Express, PostgreSQL, Prisma, Next.js 14 App Router, and Tailwind CSS.

[![CI Pipeline](https://github.com/premnaren/LedgerLine/actions/workflows/ci.yml/badge.svg)](https://github.com/premnaren/LedgerLine/actions/workflows/ci.yml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.14-2D3748.svg)](https://www.prisma.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-Proprietary%20%2F%20All%20Rights%20Reserved-red.svg)](LICENSE)

---

## Live Deployment & Interactive Documentation

- **Web Frontend (Vercel Edge)**: [https://ledgerline-tan-beta.vercel.app](https://ledgerline-tan-beta.vercel.app)
- **API Backend (Render Web Service)**: [https://ledgerline-api-6moj.onrender.com](https://ledgerline-api-6moj.onrender.com)
- **Interactive API Documentation (Swagger UI)**: [https://ledgerline-api-6moj.onrender.com/api-docs/](https://ledgerline-api-6moj.onrender.com/api-docs/)
- **Live Database Healthcheck**: [https://ledgerline-api-6moj.onrender.com/health](https://ledgerline-api-6moj.onrender.com/health)
- **Readiness Probe (`/health/ready`)**: [https://ledgerline-api-6moj.onrender.com/health/ready](https://ledgerline-api-6moj.onrender.com/health/ready)
- **Liveness Probe (`/health/live`)**: [https://ledgerline-api-6moj.onrender.com/health/live](https://ledgerline-api-6moj.onrender.com/health/live)
- **Raw OpenAPI 3.0 Specification**: [`apps/api/openapi.yaml`](file:///c:/Users/premn/LedgerLine/apps/api/openapi.yaml) / [/openapi.json](https://ledgerline-api-6moj.onrender.com/openapi.json)
- **Database Engine**: Neon Serverless PostgreSQL 16 (AWS US East 2 - Ohio)

---

## Seed Credentials

The database seed (`prisma/seed.ts`) provisions three accounts corresponding to the three system roles:

| Role | Email | Password | Initial Holdings & Scope |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@ledgerline.dev` | `Admin1234!` | Full administrative access across all accounts. Owns Account B (₹5,000.00 / 500,000 paise). |
| **`HOLDER`** | `holder@ledgerline.dev` | `Holder1234!` | Scoped to own accounts. Owns Account A (₹10,000.00 / 1,000,000 paise). |
| **`AUDITOR`** | `auditor@ledgerline.dev` | `Audit1234!` | Global read-only compliance access to all accounts and ledger entries (including `REFUSED` attempts). |

> *Quick-login buttons for each role are built directly into the `/login` screen for fast evaluation.*

---

## Core Guarantees & Architectural Invariants

1. **Strict Serializable Isolation & Row Locks**:
   Every balance mutation occurs inside a single database transaction under PostgreSQL `SERIALIZABLE` isolation. Row-level locks (`SELECT ... FOR UPDATE`) are acquired before any balance check or mutation. Account IDs are always locked in ascending order (`id ASC`) to mathematically eliminate cross-transaction deadlocks.
2. **Immutable Append-Only Ledger**:
   The `LedgerEntry` table is append-only. A database-level trigger (`prevent_ledger_mutation`) intercepts all `UPDATE` and `DELETE` queries at the PostgreSQL engine level and raises an unbypassable exception (`"Ledger entries are immutable"`).
3. **Atomic Idempotency Deduplication**:
   Money-moving endpoints require an `Idempotency-Key` header. Keys are registered using atomic `INSERT INTO "IdempotencyKey" ... ON CONFLICT (key) DO NOTHING` — eliminating read-before-write race windows. In-flight duplicate requests receive `HTTP 409 Conflict` (`request_in_flight`); completed transactions return the cached response with `Idempotent-Replay: true`.
4. **Engine-Level Non-Negative Balance Enforcement**:
   Balances cannot drop below `-overdraft_limit` (default 0). In addition to application-level pre-checks within the lock, a PostgreSQL `CHECK ("balancePence" >= -"overdraftLimit")` constraint guarantees invariants cannot be breached even by out-of-band queries.
5. **Integer Smallest-Unit Currency**:
   All monetary amounts are represented as smallest integer units (paise/pence) using PostgreSQL `BIGINT` and JavaScript `BigInt`. No IEEE 754 floating-point math is used.
6. **Server-Side Authorization**:
   Authorization is enforced on every API route and deep inside `transferService.ts`:
   - `ADMIN`: view and operate on all accounts.
   - `HOLDER`: strictly view and debit own accounts (`AccountHolder.userId == user.id`).
   - `AUDITOR`: read-only access to all accounts, statements, and audit ledgers.
7. **Continuous Double-Entry Reconciliation**:
   An independent reconciliation engine (`reconciliationService.ts`) independently aggregates all immutable ledger entries (`(sum(DEPOSIT) + sum(TRANSFER_CREDIT)) - (sum(WITHDRAWAL) + sum(TRANSFER_DEBIT)) +/- adjustments`) and verifies against `Account.balancePence`. Exposed at `GET /accounts/:id/reconcile` and `GET /admin/reconcile-all`.
8. **Compensating-Entry Corrections (100% Append-Only)**:
   Corrections and reversals (`POST /transfers/:entryId/reverse`) strictly append compensating `ADJUSTMENT` entries referencing the original transaction. Historical entries are never updated or deleted, preserving absolute audit trail integrity.

---

## Cosmic Finance Design System & Interactive Constellation Engine

LedgerLine pairs core banking mathematical rigor with a world-class **"Cosmic Finance"** visual identity (*Deep-space atmosphere · Orbital geometry · Financial precision*):

- **72-Star Celestial Constellation Canvas (`CosmicConstellation.tsx`)**:
  - Structured astronomical star catalogue containing 72 real stars across 15 constellation presets (Orion, Ursa Major, Cassiopeia, Cygnus, Lyra, Scorpius, Leo, Taurus, Gemini, Canis Major, Pegasus, Andromeda, Perseus, Aquila, Crux).
  - Physics-based interactive mechanics: **click anywhere** to spawn a new star node, **drag** stars to dynamically reposition them, and **click-and-hold** to crumple the entire active network into a compressed celestial core that emerges into one of the 15 astronomical presets.
- **Ambient Atmospheric Depth (`.cosmic-nebula-bg`)**:
  - Injected globally in `apps/web/app/layout.tsx`. Seamlessly extends cinematic violet and indigo radial nebulas across all authenticated pages, eliminating flat-black voids while guaranteeing WCAG AAA contrast for financial data.
- **Standardized Cosmic Design Tokens**:
  - Void Black (`#080713`), Deep Space (`#100D20`), Nebula Surface (`#151126`), Elevated Card (`#1C1630`), Stellar Purple (`#8055E8`), Nebula Glow (`#A88AFF`), Success Teal (`#60C9BC`), Solar Amber (`#F0B85A`), Alert Red (`#F07889`).
- **Hierarchical Authenticated Dashboards**:
  - Upper tracked breadcrumbs (`OVERVIEW / ACCOUNTS`, `AUDITOR / COMPLIANCE LEDGER`, `ADMIN / USER ROLES & ACCESS CONTROL`).
  - Dynamic time-of-day greetings (`Good evening, Admin.`).
  - 2-column elevated KPI cards (`Total accounts`, `Transactions`).
  - Glowing SVG financial activity curve with `Live` badge, area gradient fill, and milestone peak dot.
  - Interactive **Transaction Inspection Drawer**: Slide-out panel surfacing double-entry debit/credit routing legs, zero-drift balance validation ($0.00 delta), and cryptographic SHA-256 integrity seal with one-click copy.

---

## Architecture Flow

```
                      +---------------------------------------+
                      |             CLIENT REQUEST            |
                      |   POST /transfers                     |
                      |   Header: Idempotency-Key: <UUID>     |
                      |   Header: Authorization: Bearer <JWT> |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         API GATEWAY / MIDDLEWARE      |
                      |  1. authMiddleware: Verify JWT & user |
                      |  2. idempotencyMiddleware:            |
                      |     INSERT ON CONFLICT DO NOTHING     |
                      |     - If existing & PROCESSING -> 409 |
                      |     - If existing & COMPLETE   -> 200 |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |           TRANSFER SERVICE            |
                      |  3. Verify debit account ownership    |
                      |  4. Open Serializable Transaction     |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |      DATABASE TRANSACTION (ACID)      |
                      |  5. Sort account IDs ascending        |
                      |  6. SELECT ... FOR UPDATE (Row Lock)  |
                      |  7. Validate balance >= amount        |
                      |     - If insufficient: Rollback &     |
                      |       record REFUSED ledger entry     |
                      |  8. UPDATE Account debit balance      |
                      |  9. UPDATE Account credit balance     |
                      | 10. Increment optimistic version      |
                      | 11. INSERT LedgerEntry (status=POSTED)|
                      |     [Guarded by DB trigger & CHECK]   |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |          IDEMPOTENCY COMPLETE         |
                      | 12. UPDATE IdempotencyKey             |
                      |     SET status=COMPLETE, responseBody |
                      | 13. Return HTTP 200 to client         |
                      +---------------------------------------+
```

### Visual Component Diagram

```mermaid
flowchart TD
    Client["Client / Web UI"] --> API["API Layer (Express)"]
    
    subgraph Middleware ["Middleware & Guards"]
        Auth["JWT Auth Middleware"]
        Role["Role Guard (ADMIN / HOLDER / AUDITOR)"]
        Idem["Idempotency Middleware (Atomic ON CONFLICT)"]
    end
    
    API --> Auth --> Role --> Idem
    
    subgraph Core ["Transfer Engine (transferService.ts)"]
        Txn["Serializable Transaction ($transaction)"]
        Lock["SELECT ... FOR UPDATE (Account ID sorted)"]
        BalanceCheck["Overdraft & Balance Check"]
        Mutate["Atomic Balance Mutation + Version++"]
    end
    
    Idem --> Txn --> Lock --> BalanceCheck --> Mutate
    
    subgraph Database ["PostgreSQL 16"]
        AccTable[("accounts Table\nCHECK balance >= -overdraft")]
        LedgerTable[("ledger_entries Table\nTRIGGER prevent_ledger_mutation")]
        IdemTable[("idempotency_keys Table\nUNIQUE (key)")]
    end
    
    Mutate --> AccTable
    Mutate --> LedgerTable
    Idem --> IdemTable
    
    subgraph Verification ["Verification & Invariants"]
        AutomatedTests["Test Suite: Concurrency, Conservation, Idempotency, Authz"]
        AuditLog["Audit Ledger View (POSTED + REFUSED)"]
    end
    
    AccTable -.-> AutomatedTests
    LedgerTable -.-> AutomatedTests
    LedgerTable -.-> AuditLog
```

---

## Local Setup & Quickstart

### Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher (`npm install -g pnpm`)
- **PostgreSQL**: v16.x (or Docker Desktop)

### 1. Clone & Install
```bash
git clone https://github.com/premnaren/LedgerLine.git
cd ledgerline
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` templates in both apps:

```bash
# Backend environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start PostgreSQL Database
Using Docker Compose:
```bash
docker compose up -d
```
*Or ensure a local PostgreSQL instance is running on port 5432 with database `ledgerline`.*

### 4. Run Migrations & Seed Data
```bash
# Apply migrations (including raw SQL trigger and CHECK constraints)
pnpm prisma:migrate

# Seed sample users and accounts
pnpm prisma:seed
```

### 5. Run Automated Verification Tests
```bash
# Run all test suites (concurrency, conservation, idempotency, authz, statements)
pnpm test

# Run high-concurrency overdraw tests specifically
pnpm test:concurrency
```

### 6. Start Development Servers
In separate terminals:
```bash
# Start Backend API (runs on http://localhost:4000)
pnpm dev:api

# Start Next.js Web App (runs on http://localhost:3000)
pnpm dev:web
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## First-Administrator Bootstrap CLI

LedgerLine includes an idempotent administrator bootstrap utility to provision the first superuser account and system reserve ledger:

```bash
# Run with defaults (admin@ledgerline.dev / Admin1234!)
pnpm bootstrap:admin

# Or with npm aliases
npm run db:bootstrap

# Or provide custom credentials via CLI arguments
pnpm bootstrap:admin --email="admin@customdomain.dev" --password="StrongPassword123!" --account="Primary Reserve"
```

The script verifies database connectivity, idempotently creates or verifies the administrator, ensures the `ADMIN` role is assigned, and initializes the primary administrative operating account.

---

## Redis Distributed Rate Limiting

The API integrates distributed rate limiting via `ioredis` and `rate-limit-redis`:
* **Money Movement (`/transfers`)**: User-scoped limit of 30 requests per minute per authenticated user, preventing lock exhaustion and cluster flooding.
* **Authentication (`/auth/login`)**: IP-scoped limit of 20 attempts per 15 minutes, mitigating brute-force and credential stuffing attacks.
* **High-Availability Fallback**: If `REDIS_URL` is omitted or temporarily unreachable, the rate limiter falls back automatically to local in-memory counters without interrupting financial transactions.

```env
# Optional Redis Configuration (.env)
REDIS_URL="redis://default:password@your-redis-host.com:6379"
```

---

## Database Roles & Least-Privilege Architecture

Production database access is segmented into four distinct PostgreSQL roles defined in [`scripts/setup-db-roles.sql`](file:///c:/Users/premn/LedgerLine/scripts/setup-db-roles.sql):

1. **`ledgerline_owner`**: Dedicated DDL schema administrator with table creation and migration rights.
2. **`ledgerline_app`**: Runtime application role granted only DML (`SELECT`, `INSERT`, `UPDATE`), with `DROP`, `TRUNCATE`, and `ALTER TABLE` strictly prohibited.
3. **`ledgerline_auditor`**: Compliance role granted strict read-only access (`SELECT` only on accounts and ledger entries).
4. **`bootstrap_operator`**: Scoped provisioning role for administrator onboarding.

In addition, the unbypassable PL/pgSQL trigger `prevent_ledger_mutation` physically intercepts and aborts any `UPDATE` or `DELETE` attempt on `"LedgerEntry"` at the PostgreSQL storage engine level.

---

## Operational Scripts Reference

Both `pnpm` and `npm` workspace command conventions are fully supported:

| Operation | pnpm Command | npm Equivalent |
| :--- | :--- | :--- |
| **Run Prisma Generate** | `pnpm prisma:generate` | `npm run db:generate` |
| **Apply DB Migrations** | `pnpm prisma:migrate` | `npm run db:migrate` |
| **Seed Database** | `pnpm prisma:seed` | `npm run db:seed` |
| **Bootstrap Administrator** | `pnpm bootstrap:admin` | `npm run db:bootstrap` |
| **Execute Test Suites** | `pnpm test` | `npm test` |
| **Concurrency Benchmark** | `pnpm test:concurrency` | `npm run test:concurrency` |

---

## Test Suite and Verification

The test suite validates all architectural constraints against live PostgreSQL transactions:

| Test File | Covered Scenarios |
| :--- | :--- |
| `tests/concurrency.test.ts` | **20 concurrent overdraw withdrawals** against a ₹100 account (exactly 10 succeed, 10 refused, balance never negative); **50 parallel transfers** between accounts; **double-spend replay** race handling; **cross-user unauthorized debit** denial. |
| `tests/idempotency.test.ts` | Replay with identical key returning cached HTTP response without second deduction; concurrent in-flight requests returning `HTTP 409 Conflict`; missing header returning `HTTP 400`; **cross-tenant key isolation** via compound `(userId, key)` index. |
| `tests/conservation.test.ts` | System-wide invariant verification: $\sum \text{Balances} = \sum \text{Deposits} - \sum \text{Withdrawals}$ after hundreds of operations. |
| `tests/authz.test.ts` | HOLDER account isolation (cannot read other users' accounts); cross-user debit blocked (`HTTP 403`); unauthenticated rejection (`HTTP 401`); ADMIN global access; **SQL injection attempt rejection** without DDL execution. |
| `tests/accounts_statement.test.ts` | Keyset/cursor-based statement pagination; AUDITOR read-only global inspection; inclusion of `REFUSED` transactions with running balances. |

Run tests anytime with:
```bash
pnpm test
```

---

## What We Deliberately Did Not Build (And Why)

To maintain unbreakable core invariants, the following features were deliberately excluded from this core ledger:

1. **Multi-Currency Conversions**:
   - *Why*: Real-time foreign exchange requires third-party price oracles, slippage windows, rate-lock expiration, and asymmetric rounding rules. A double-entry core ledger must remain completely deterministic and mathematically self-contained. Multi-currency is best handled as an upstream orchestration service that converts and settles into fixed currency accounts.
2. **Scheduled and Recurring Transfers**:
   - *Why*: Scheduled transfers require persistent asynchronous job queues (such as BullMQ, Temporal, or Celery) with background worker daemons, retry timers, and polling loops. Introducing external schedulers into the core transaction loop complicates the serializability guarantees and creates decoupled failure modes.
3. **Distributed Transactions (Two-Phase Commit / Sagas)**:
   - *Why*: LedgerLine intentionally runs on a single authoritative PostgreSQL database cluster. Two-Phase Commit (2PC) protocols across multiple databases introduce coordinator failure vulnerabilities, network partition split-brains, and distributed deadlocks that compromise strict serializability. Single-instance PostgreSQL with row-level locks guarantees atomic, consistent, isolated, and durable (ACID) execution without distributed consensus overhead.

---

## 5-Minute Demo Video Walkthrough Script

This script provides an exact, step-by-step outline for recording the 5-minute technical demo:

### ⏱️ Minute 0:00 - 0:45: Introduction & HOLDER View
- **Action**: Navigate to `http://localhost:3000/login`. Highlight the celestial constellation canvas and the compact 380px auth card. Click **Holder** quick-login chip.
- **Dialogue**: *"Welcome to LedgerLine. Notice our distinctive Cosmic Finance visual identity with an interactive 72-star astronomical constellation canvas. We log in as `holder@ledgerline.dev`. On the dashboard, we see Account A holding ₹10,000.00 inside elevated cosmic cards with ambient nebula depth. Notice our security header: tokens are held strictly in memory with silent httpOnly refresh cookies."*

### ⏱️ Minute 0:45 - 1:30: Money Transfer & Ledger Posting
- **Action**: Click **Transfer Funds** on Account A. Transfer ₹1,500.00 to Account B.
- **Dialogue**: *"Every transfer automatically generates a UUIDv4 `Idempotency-Key` on the client. We submit the transfer. The transfer executes inside a single Serializable transaction with `SELECT ... FOR UPDATE` row locks. Account A balance instantly updates to ₹8,500.00. Clicking into the statement, we see the glowing Balance Trajectory ribbon and the new `TRANSFER_DEBIT` entry with its running balance and transaction note."*

### ⏱️ Minute 1:30 - 2:45: Concurrency Test (20 Parallel Overdraw Requests)
- **Action**: Open terminal. Run `pnpm test:concurrency`.
- **Dialogue**: *"Let's prove the core guarantee under extreme stress. We run our concurrency test suite. Here, 20 parallel threads simultaneously fire `POST /transfers/withdraw` for ₹10 against an account with only ₹100. Watch the results: exactly 10 transactions succeed (`POSTED`), and exactly 10 are safely rejected with `INSUFFICIENT_FUNDS` (`REFUSED`). The final balance is precisely ₹0.00. No negative balance is mathematically possible thanks to our database CHECK constraint and row-level locks."*

### ⏱️ Minute 2:45 - 3:30: Network Tab & Idempotency Key Replay
- **Action**: Open Chrome DevTools Network Tab. Copy the `Idempotency-Key` from the previous transfer. Make an identical POST request using cURL or re-submitting in browser with the same key.
- **Dialogue**: *"Notice this transfer response. If a network partition occurs and the client retries with the exact same `Idempotency-Key`, our atomic `INSERT ... ON CONFLICT DO NOTHING` store detects the replay. The server returns HTTP 200 with the exact cached response body and `Idempotent-Replay: true` header. No second deduction occurred and no duplicate ledger row was written."*

### ⏱️ Minute 3:30 - 4:15: AUDITOR View, Cryptographic Drawer & Immutability
- **Action**: Log out. Click **Auditor** quick-login. Navigate to **Audit Ledger** (`/admin/audit`). Click a transaction row to open the Transaction Inspection Drawer.
- **Dialogue**: *"Now we log in as the Auditor. The navbar updates to the `AUDITOR CONSOLE`. In the Audit Ledger, we see all entries across all accounts in the entire system with `.cosmic-pill` status tags. Clicking any row opens our Transaction Inspection Drawer showing double-entry debit and credit routing, zero balance drift ($0.00 delta), and its SHA-256 cryptographic seal. Our database trigger prevents any `UPDATE` or `DELETE` on this table — it is mathematically append-only."*

### ⏱️ Minute 4:15 - 5:00: Authorization Guard & Admin Stress Lab
- **Action**: Verify that the Auditor cannot transfer funds (HTTP 403). Log in as Admin (`admin@ledgerline.dev`), show the Admin Dashboard with its live purple financial activity curve, and trigger a live 25-request simulation in the **Stress Lab** (`/admin/stress-lab`).
- **Dialogue**: *"Finally, let's verify role enforcement. When an Auditor or unauthorized user attempts to debit an account they do not own, our server-side authorization guard and `transferService.ts` immediately block the request with HTTP 403 Forbidden. On the Admin Console, our Stress Lab runs live concurrency bursts with real-time telemetry confirming 100% balance conservation across every transaction."*

---

## Threat Model & Security Specifications

For the comprehensive 23-vector threat analysis, defense implementations, and residual risks, see [THREATS.md](file:///C:/Users/premn/LedgerLine/THREATS.md).

---

## Implementation Log

For the step-by-step sub-prompt implementation diary and engineering problem-solving logs, see [PROMPTS.md](file:///C:/Users/premn/LedgerLine/PROMPTS.md).

