# LedgerLine — Threat Model & Security Posture

## Threat model

### T-1: Concurrent overdraw (two requests race past the balance check)
**Attack**: An attacker fires simultaneous withdrawal or transfer requests across multiple threads/connections against an account with limited funds, attempting to race past the balance check before the balance decrement is committed.  
**What we did**: Every money-moving operation is executed inside a PostgreSQL `SERIALIZABLE` transaction. Accounts are locked upfront using `SELECT id, "balancePence", "overdraftLimit", version FROM "Account" ... FOR UPDATE` with account IDs ordered deterministically (ascending) to prevent deadlocks. The balance check is evaluated strictly *inside* the row lock, never outside. In addition, an immutable database CHECK constraint (`"balancePence" >= -"overdraftLimit"`) enforces that the database engine rejects any update that would violate limits.  
**Test that covers it**: `TEST 1: prevents concurrent overdraw when 20 requests race for 10 withdrawal slots` in [`apps/api/tests/concurrency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/concurrency.test.ts).  
**Residual risk**: In high-concurrency environments, PostgreSQL SSI aborts colliding transactions with SQLSTATE 40001, requiring application-level retries with jittered exponential backoff.

---

### T-2: Double-spend via replay / retry
**Attack**: Network latency causes a client to timeout and retransmit a transfer request, or a malicious actor replays a captured transfer payload, causing the money to be deducted multiple times.  
**What we did**: Every mutating endpoint requires a client-supplied `Idempotency-Key` HTTP header. The key is claimed atomically via `INSERT INTO "IdempotencyKey" ... ON CONFLICT (key) DO NOTHING`. Replayed requests with `status='COMPLETE'` immediately return the cached HTTP status code and response body without entering the transfer logic or touching account balances.  
**Test that covers it**: `returns identical response body on replay and mutates balance exactly once` in [`apps/api/tests/idempotency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/idempotency.test.ts) and `TEST 3: prevents double-spend via idempotency replay` in [`apps/api/tests/concurrency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/concurrency.test.ts).  
**Residual risk**: Idempotency keys must be persisted indefinitely or managed with an audited retention window (e.g. 90 days) after which replayed requests would be treated as novel.

---

### T-3: Moving money from an account you do not own
**Attack**: An authenticated HOLDER user modifies the request body to specify another user's `fromAccountId` or attempts to debit a treasury account.  
**What we did**: Authorization is enforced both in route middleware and deep inside [`transferService.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/transferService.ts). Within the locked transaction, `verifyDebitAuthorization` queries the `AccountHolder` table to verify that `userId` matches the authenticated `req.user.userId`. If not an owner (and not ADMIN), the service throws `UnauthorizedAccountAccessError`, returning HTTP 403 Forbidden.  
**Test that covers it**: `blocks HOLDER from debiting an account they do not own (returns 403)` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts) and `TEST 4` in [`apps/api/tests/concurrency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/concurrency.test.ts).  
**Residual risk**: Joint accounts treat all registered holders equally; granular per-holder spending caps and multi-signature authorization are not implemented.

---

### T-4: Tampering with a ledger row (UPDATE/DELETE)
**Attack**: An attacker, compromised service account, or rogue database administrator executes an `UPDATE` or `DELETE` query against `LedgerEntry` to modify transaction amounts, falsify running balances, or erase audit evidence.  
**What we did**: A PostgreSQL database trigger `prevent_ledger_mutation` executes `BEFORE UPDATE OR DELETE ON "LedgerEntry"` and raises an exception: `"Ledger entries are immutable"`. Every modification attempt is blocked at the database engine layer. Declined balance operations are stored with `status='REFUSED'`.  
**Test that covers it**: Database engine verification via psql trigger tests and migration `20261106062700_immutable_ledger_and_check_constraint`.  
**Residual risk**: A database superuser can explicitly disable triggers via `ALTER TABLE ... DISABLE TRIGGER`. Closed in production by connecting the application via a least-privilege role that lacks `ALTER TABLE` privileges.

---

### T-5: Negative balance via large withdrawal
**Attack**: A user requests a withdrawal of an enormous sum or crafts a payload with negative integers or floating point edge cases.  
**What we did**: Application validates amounts as strictly positive integers in smallest currency unit (paise). Balance verification happens after row locking inside a Serializable transaction. Even if the application logic failed, the database schema includes an engine-level constraint `CHECK ("balancePence" >= -"overdraftLimit")` that rejects the row write.  
**Test that covers it**: `TEST 1` in [`apps/api/tests/concurrency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/concurrency.test.ts) and database constraint verification.  
**Residual risk**: Overdraft limits configured by ADMIN users allow balances to drop below zero up to the configured limit.

---

### T-6: Integer overflow on balance (using BigInt / paise avoids float issues)
**Attack**: Storing currency as IEEE 754 floating-point numbers causes precision loss above $2^{53}$ (around ₹90 trillion), leading to fractional paise roundoff exploitation.  
**What we did**: All monetary amounts are stored as 64-bit integers (`BIGINT` in PostgreSQL, `bigint` in Prisma and TypeScript) representing the smallest unit of currency (paise/pence, 1 INR = 100 paise). Balances are serialized to strings in JSON API responses to protect client-side JavaScript number parsers from truncating values.  
**Test that covers it**: `preserves system-wide sum invariant during simultaneous credit-debit pairings` in [`apps/api/tests/conservation.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/conservation.test.ts).  
**Residual risk**: PostgreSQL `BIGINT` ranges from $-9.22 \times 10^{18}$ to $+9.22 \times 10^{18}$, which is sufficient for global planetary wealth, but arithmetic operations are guarded against out-of-range boundaries.

---

### T-7: Idempotency key collision (attacker supplies another user's key)
**Attack**: An attacker generates or guesses another user's idempotency key and submits it to extract the cached response or cause a collision.  
**What we did**: In addition to using 128-bit cryptographically secure UUIDs, the API enforces JWT authentication on every request prior to idempotency evaluation. Requests can only manipulate accounts authorized for the authenticated user session.  
**Test that covers it**: `returns identical response body on replay` in [`apps/api/tests/idempotency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/idempotency.test.ts).  
**Residual risk**: In a multi-tenant system with predictable keys, keys should be compound indexed as `(userId, idempotencyKey)`.

---

### T-8: JWT token theft / privilege escalation
**Attack**: Attacker executes XSS to steal JWT access tokens from browser storage, or tampers with the JWT signature to elevate role from `HOLDER` to `ADMIN`.  
**What we did**: Access tokens are kept **strictly in memory** (never written to `localStorage` or `sessionStorage`). Refresh tokens are stored in `httpOnly`, `SameSite=Lax`, `Secure` cookies inaccessible to JavaScript. Refresh tokens are tracked in a dedicated `RefreshToken` database table with active revocation flags checked on every `/auth/refresh` request. JWT signatures are verified with cryptographically distinct secret keys.  
**Test that covers it**: `rejects unauthenticated requests` and `rejects invalid Bearer token` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts).  
**Residual risk**: If a client machine is physically compromised or has an active memory inspection debugger attached during an authenticated session, the 15-minute access token could be extracted from RAM.

---

### T-9: SQL injection via raw queries
**Attack**: Attacker inputs SQL injection fragments (`'; DROP TABLE "Account"; --`) into `fromAccountId`, `toAccountId`, or `note` parameters passed into `$queryRaw`.  
**What we did**: All raw queries use tagged template literals (`tx.$queryRaw\`SELECT ... WHERE id IN (${debitId}, ${creditId})\``). Prisma and the PostgreSQL client compile tagged template literals into parameterized queries with `$1`, `$2` bind placeholders. No raw string interpolation or concatenation is permitted anywhere in the repository.  
**Test that covers it**: Parameterized execution verified throughout all transaction queries in [`apps/api/src/services/transferService.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/transferService.ts).  
**Residual risk**: Developer error in future extensions if `Prisma.raw()` is inadvertently used with unsanitized user input.

---

### T-10: AI anomaly suggester moving money autonomously
**Attack**: An AI anomaly detector or automated agent suffers from prompt injection, model drift, or hallucination and initiates fraudulent balance transfers.  
**What we did**: Strict architectural decoupling: The AI anomaly detector is strictly read-only. It has zero capability, credentials, or tool bindings to execute money movements or invoke `transferService.ts`. AI recommendations are stored as flags for human auditor review only and can never trigger transactions autonomously.  
**Test that covers it**: Role guard authorization blocks non-human or unprivileged roles from accessing the transfer engine.  
**Residual risk**: Human operational error if an auditor approves an anomalous transfer suggestion without adequate secondary verification.

---

### T-11: Timing attack on idempotency INSERT race (two simultaneous first-calls)
**Attack**: Two simultaneous requests with the exact same novel idempotency key arrive at the server in parallel; a standard read-then-write find-or-create check allows both to proceed past the check.  
**What we did**: Implemented atomic insertion using PostgreSQL `INSERT INTO "IdempotencyKey" (id, key, status, "createdAt") VALUES (...) ON CONFLICT (key) DO NOTHING`. The returned affected row count is inspected immediately: exactly one request obtains `affectedRows === 1` and proceeds to `PROCESSING`; the concurrent sibling request obtains `0` affected rows, detects `PROCESSING`, and is immediately halted with HTTP 409 Conflict `{ error: "request_in_flight" }`.  
**Test that covers it**: `returns 409 request_in_flight on concurrent requests with identical key` in [`apps/api/tests/idempotency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/idempotency.test.ts).  
**Residual risk**: If a server process crashes abruptly while a request is in `PROCESSING` state before it can finalize to `COMPLETE` or `FAILED`, the key remains locked until cleaned by a background TTL sweep.

---

### T-12: Admin-only operations called by HOLDER role
**Attack**: A user authenticated with `HOLDER` or `AUDITOR` role invokes administrative endpoints such as account creation (`POST /accounts`), large transfers (> 10M paise), or user management.  
**What we did**: The `requireRole(Role.ADMIN)` middleware blocks unauthorized roles at the HTTP layer with HTTP 403 Forbidden. Additionally, transfer limits exceeding ₹100,000 (10,000,000 paise) require the `ADMIN` role both in the route handler and within the transfer service.  
**Test that covers it**: `allows only ADMIN to create new accounts via POST /accounts` in [`apps/api/tests/accounts_statement.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/accounts_statement.test.ts) and large transfer checks in [`apps/api/src/routes/transfers.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/routes/transfers.ts).  
**Residual risk**: Route-level guard omissions if future developers add administrative endpoints without decorating them with `requireRole`.

---

## Knowingly accepted risks

1. **Single-Currency Engine**: The ledger records all transactions in a single integer denomination (paise/pence, INR base). Multi-currency conversions, exchange rate fluctuations, and fractional FX spreads are deliberately out of scope for this release to maintain uncompromising ACID correctness and balance conservation invariants.
2. **In-Flight Key Timeout (Stuck Processing)**: If the backend container suffers an unrecoverable hard crash (SIGKILL or power loss) after inserting an `IdempotencyKey` with status `PROCESSING` and before completing the transaction, that specific key will return 409 indefinitely until an operator or scheduled worker resets it to `FAILED`. A 15-minute expiration reaper was deferred to minimize deployment dependencies.
3. **Multi-Region Latency on Serializable Isolation**: PostgreSQL Serializable Snapshot Isolation (SSI) with `SELECT ... FOR UPDATE` operates within a single primary database cluster. Cross-datacenter multi-master replication with active-active write distribution is not supported without external consensus coordinators (e.g. Spanner/CockroachDB).
4. **Shared Database Testing**: In local test environments without containerization, integration tests run against a local PostgreSQL instance. Sequential execution (`--no-file-parallelism`) is enforced to prevent concurrent test suites from cross-contaminating account balances.

