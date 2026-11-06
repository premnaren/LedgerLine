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
**What we did**: While route middleware performs initial boundary checks, the service-level check inside [`transferService.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/transferService.ts) is the authoritative, standalone gatekeeper. Deep inside the locked `Serializable` transaction, `verifyDebitAuthorization` executes an isolated query against `AccountHolder` (`userId_accountId`) to verify that `user.userId` is registered for `fromAccountId`. Even if an HTTP route guard were accidentally omitted by a future developer or an internal process called `transferService` directly, the service-level check independently halts unauthorized debits with `UnauthorizedAccountAccessError` (`HTTP 403 Forbidden`).  
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
**Attack**: An attacker generates or guesses another user's idempotency key and submits it to extract the cached response body, observe transaction details, or poison the key state.  
**What we did**: In addition to using 128-bit cryptographically secure UUIDs, idempotency keys are compound-indexed as `("userId", key)` in the database schema (`@@unique([userId, key])`). When a request claims a key via `claimIdempotencyKey(key, userId)`, PostgreSQL evaluates `ON CONFLICT ("userId", key) DO NOTHING`. This mathematically isolates idempotency state across users: even if User B submits the exact key string used by User A, User B can never match, claim, or view User A's cached response.  
**Test that covers it**: `isolates idempotency keys across different users using compound (userId, key) index` in [`apps/api/tests/idempotency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/idempotency.test.ts).  
**Residual risk**: A user sending identical keys concurrently across multiple tabs or browser windows within their own session will have the second request rejected with `HTTP 409 Conflict` (by design).

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
**Test that covers it**: `blocks SQL injection payload in fromAccountId without executing DDL or returning 500` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts).  
**Residual risk**: Developer error in future extensions if `Prisma.raw()` is inadvertently used with unsanitized user input.

---

### T-10: AI anomaly suggester moving money autonomously
**Attack**: An AI anomaly detector or automated agent suffers from prompt injection, model drift, or hallucination and initiates fraudulent balance transfers.  
**What we did**: Strict architectural decoupling: The AI anomaly detector is strictly an external, read-only analytical query on `ledger_entries`. It has zero database write permissions, no credentials to execute transfers, and no code path or interface to invoke `transferService.ts`. AI suggestions exist purely as analytical flags for human auditor review; they can never trigger money movement or balance mutations autonomously.  
**Test that covers it**: Code-level separation ensures no write method exists on the AI anomaly analysis interface, and all balance mutations are strictly gated by `transferService.ts` requiring authenticated human user credentials.  
**Residual risk**: Human operational error if an auditor approves an anomalous transfer suggestion without adequate secondary verification.

---

### T-11: Timing attack on idempotency INSERT race (two simultaneous first-calls)
**Attack**: Two simultaneous requests with the exact same novel idempotency key arrive at the server in parallel; a standard read-then-write find-or-create check allows both to proceed past the check.  
**What we did**: Implemented atomic insertion using PostgreSQL `INSERT INTO "IdempotencyKey" (id, "userId", key, status, "createdAt") VALUES (...) ON CONFLICT ("userId", key) DO NOTHING`. The returned affected row count is inspected immediately: exactly one request obtains `affectedRows === 1` and proceeds to `PROCESSING`; the concurrent sibling request obtains `0` affected rows, detects `PROCESSING`, and is immediately halted with HTTP 409 Conflict `{ error: "request_in_flight" }`.  
**Test that covers it**: `returns 409 request_in_flight on concurrent requests with identical key` in [`apps/api/tests/idempotency.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/idempotency.test.ts).  
**Residual risk**: If a server process crashes abruptly while a request is in `PROCESSING` state before it can finalize to `COMPLETE` or `FAILED`, the key remains locked until cleaned by a background TTL sweep.

---

### T-12: Admin-only operations called by HOLDER role
**Attack**: A user authenticated with `HOLDER` or `AUDITOR` role invokes administrative endpoints such as account creation (`POST /accounts`), large transfers (> 10M paise), or user management.  
**What we did**: The `requireRole(Role.ADMIN)` middleware blocks unauthorized roles at the HTTP layer with HTTP 403 Forbidden. Additionally, transfer limits exceeding ₹100,000 (10,000,000 paise) require the `ADMIN` role both in the route handler and within the transfer service.  
**Test that covers it**: `allows only ADMIN to create new accounts via POST /accounts` in [`apps/api/tests/accounts_statement.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/accounts_statement.test.ts) and large transfer checks in [`apps/api/src/routes/transfers.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/routes/transfers.ts).  
**Residual risk**: Route-level guard omissions if future developers add administrative endpoints without decorating them with `requireRole`.

---

### T-13: CSRF on state-changing API endpoints
**Attack**: A malicious website posts a cross-origin form to `POST /transfers` while the victim's session cookie is active in the browser.  
**What we did**: Refresh tokens use `SameSite=Lax` cookies. All state-changing and money-moving endpoints require `Authorization: Bearer <token>` in the HTTP header — a cross-origin form POST cannot set custom headers, so CSRF is structurally blocked by browser security models.  
**Test that covers it**: `rejects unauthenticated requests to protected endpoints with 401` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts).  
**Residual risk**: If the frontend ever switches to cookie-based access tokens rather than in-memory Bearer tokens, CSRF protection must be re-evaluated with anti-CSRF synchronizer tokens.

---

### T-14: Unrestricted deposit to unowned account (smurfing / money-laundering vector)
**Attack**: An authenticated HOLDER discovers another user's or system account ID and submits a `DEPOSIT` operation targeting that account without holding ownership, enabling unauthorized ledger manipulation or money mule structuring.  
**What we did**: Added `verifyCreditAuthorization()` inside [`apps/api/src/services/transferService.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/transferService.ts). While ADMIN can deposit into any account, HOLDER accounts are validated inside the transaction against the `AccountHolder` association table. If the authenticated user is not an authorized holder on the target credit account, the transaction aborts with `UnauthorizedAccountAccessError` (`HTTP 403 Forbidden`).  
**Test that covers it**: `blocks HOLDER from depositing into an account they do not own (returns 403)` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts).  
**Residual risk**: Wire transfers initiated via external banking rails (ACH/NEFT) into virtual account numbers require webhooks with separate signature verification (HMAC-SHA256).

---

### T-15: Resource exhaustion via rapid-fire transfer submission (DDoS / connection pool starvation)
**Attack**: An attacker scripts automated concurrent calls to `POST /transfers` with varying idempotency keys to exhaust PostgreSQL connection pools, CPU, and database row lock queues.  
**What we did**: Configured per-user rate limiting using [`apps/api/src/middleware/rateLimiter.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/middleware/rateLimiter.ts). Money-moving routes are capped at 30 requests per minute per authenticated `userId` (independent of IP to avoid NAT/proxy collisions). Exceeding requests are rejected immediately at the HTTP gateway with `HTTP 429 Too Many Requests` and standard `Retry-After: 60` headers, protecting database connection pools from starvation.  
**Test that covers it**: `rejects rapid bursts exceeding 30 requests per minute with 429 and Retry-After header` in [`apps/api/tests/security_hardening.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/security_hardening.test.ts).  
**Residual risk**: Distributed botnets possessing hundreds of distinct valid credentials could still generate aggregate load, mitigated at the infrastructure edge via Cloudflare or AWS WAF.

---

### T-16: Malformed payload causing unhandled exception / internal state leakage
**Attack**: An attacker sends payloads with missing fields, unexpected types (arrays, booleans, SQL keywords), or oversized strings, aiming to crash the Node.js event loop or extract stack traces and internal schema details via HTTP 500 error messages.  
**What we did**: Strict request validation using Zod schemas in [`apps/api/src/validation/schemas.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/validation/schemas.ts) applied via middleware prior to any route logic or database queries. Invalid payloads return structured `HTTP 400 Bad Request` with field-level issues and never reach the application core. Internal exceptions in production hide stack traces and return clean RFC 7807 problem details.  
**Test that covers it**: `rejects malformed payloads with 400 Bad Request and detailed schema validation errors` in [`apps/api/tests/security_hardening.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/security_hardening.test.ts).  
**Residual risk**: Zero-day serialization vulnerabilities in third-party parsing dependencies; mitigated by automated dependency vulnerability auditing (`pnpm audit`).

---

### T-17: Undetected ledger-to-account balance divergence (silent state corruption)
**Attack**: An out-of-band database error, hardware bit flip, manual administrator direct update, or software defect causes an Account's cached `balancePence` to diverge from the net sum of its immutable `LedgerEntry` rows.  
**What we did**: Implemented continuous double-entry ledger reconciliation in [`apps/api/src/services/reconciliationService.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/reconciliationService.ts). Computes `reconciledBalance = (sum(DEPOSIT) + sum(TRANSFER_CREDIT)) - (sum(WITHDRAWAL) + sum(TRANSFER_DEBIT)) +/- adjustments` on immutable ledger entries and compares it against `Account.balancePence`. Exposed via `GET /accounts/:id/reconcile` (ADMIN + AUDITOR) and `GET /admin/reconcile-all` (ADMIN). Flagged discrepancies return exact discrepancy delta and entry count for forensic audit.  
**Test that covers it**: `detects discrepancy between account balance and ledger entries when balance is corrupted via raw SQL` and `reconcileAllAccounts flags corrupted accounts across system` in [`apps/api/tests/reconciliation.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/reconciliation.test.ts).  
**Residual risk**: High transaction volume accounts may experience slight query contention during ad-hoc full-history aggregation; mitigated by read-committed snapshot queries or periodic checkpointing.

---

### T-18: Server crash mid-transaction leaving idempotency key stuck in PROCESSING
**Attack**: A server instance experiences power loss, OOM kill, or container restart while a transfer transaction is in-flight. The idempotency key remains recorded as `status='PROCESSING'`, permanently blocking the client from retrying with `HTTP 409 Conflict: request_in_flight`.  
**What we did**: Built the automated background reaper in [`apps/api/src/services/idempotencyReaper.ts`](file:///c:/Users/premn/LedgerLine/apps/api/src/services/idempotencyReaper.ts). Runs automatically on server startup and every 10 minutes thereafter. Queries all keys where `status = 'PROCESSING'` and `createdAt < NOW() - 5 minutes`, resetting them to `status = 'FAILED'`, and logging forensic warning events. This allows clients to safely retry with the original idempotency key without manual DBA intervention.  
**Test that covers it**: `reaps orphaned PROCESSING keys older than 5 minutes to FAILED and allows retry` in [`apps/api/tests/security_hardening.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/security_hardening.test.ts).  
**Residual risk**: In-flight requests executing exceptionally slow external operations could theoretically be reaped if they exceed 5 minutes; money transfers are strictly bounded with a 10s query timeout, preventing false positive reaping.

---

### T-19: Negative or zero-amount transfer bypass via type coercion
**Attack**: An attacker passes `amountPence: 0`, negative values (`-500`), or scientific notation strings (`"1e5"`) attempting to credit accounts illegally or reverse money movement direction.  
**What we did**: Enforced layered positive integer validation:
1. Zod schema `positiveBigIntStringSchema` verifies regex `/^\d+$/` and rejects `"0"` or non-digit characters at the API boundary.
2. In `transferService.ts`, `BigInt(amountPence) <= 0n` explicitly throws `InvalidTransferAmountError`.
3. In PostgreSQL schema, database column check guarantees unsigned magnitude.  
**Test that covers it**: `rejects negative or zero amounts via schema validation and transferService invariants` in [`apps/api/tests/security_hardening.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/security_hardening.test.ts).  
**Residual risk**: Extremely large strings exceeding 64-bit integer range; guarded by length limits in Zod schema (`max(20)`).

---

### T-20: Transfer to non-existent account ID creating dangling references
**Attack**: An attacker specifies a non-existent or deleted `toAccountId` or `fromAccountId` in transfer payloads, attempting to debit an account without a matching credit, violating ledger balance conservation.  
**What we did**: The transfer engine locks all involved accounts in a single query using deterministic sorting (`ORDER BY id ASC`). It immediately validates that the number of locked rows matches the expected account count (`lockedAccounts.length === 2` for internal transfers, `1` for deposits/withdrawals). If any account is missing, the entire transaction rolls back before writing any ledger rows or deducting balances, returning `HTTP 404 Account Not Found`. In addition, foreign key constraints in `LedgerEntry` enforce referential integrity to existing accounts.  
**Test that covers it**: `blocks transfer when destination or source account does not exist (returns 404)` in [`apps/api/tests/authz.test.ts`](file:///c:/Users/premn/LedgerLine/apps/api/tests/authz.test.ts).  
**Residual risk**: None; referential integrity and count assertion inside row-locked transaction make dangling references mathematically impossible.

---

## Knowingly accepted risks

1. **Single-Currency Engine**: The ledger records all transactions in a single integer denomination (paise/pence, INR base). Multi-currency conversions, exchange rate fluctuations, and fractional FX spreads are deliberately out of scope for this release to maintain uncompromising ACID correctness and balance conservation invariants.
2. **In-Flight Key Timeout (Stuck Processing) — [CLOSED via T-18]**: Previously, a server crash during `PROCESSING` could leave keys stuck. This is now fully resolved and closed by the automated background `idempotencyReaper` service, which recovers stale keys older than 5 minutes to `FAILED`.
3. **Multi-Region Latency on Serializable Isolation**: PostgreSQL Serializable Snapshot Isolation (SSI) with `SELECT ... FOR UPDATE` operates within a single primary database cluster. Cross-datacenter multi-master replication with active-active write distribution is not supported without external consensus coordinators (e.g. Spanner/CockroachDB).
4. **Shared Database Testing**: In local test environments without containerization, integration tests run against a local PostgreSQL instance. Sequential execution (`--no-file-parallelism`) is enforced to prevent concurrent test suites from cross-contaminating account balances.

