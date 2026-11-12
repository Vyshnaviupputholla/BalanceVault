
# BalanceVault - AI Usage Log

This document records how AI assistance was used during the development of BalanceVault. All suggestions were reviewed and tested before being used.

## Entry 1 - 12 November 2026 - Authentication

**What I asked AI:** How to implement JWT authentication in the backend.

**What AI produced:** Authentication middleware to verify JWT tokens and identify active users.

**What needed review:** Authentication must reject missing, invalid and expired tokens.

**What I did:** Reviewed the middleware and tested authenticated API requests.

**Commit link:** Pending.

## Entry 2 - 12 November 2026 - Admin Authorization

**What I asked AI:** How to prevent customers from accessing admin APIs.

**What AI produced:** Role-based authorization middleware.

**What needed review:** Authentication alone does not verify admin permissions.

**What I did:** Tested using a customer token and received 403 Forbidden.

**Commit link:** Pending.

## Entry 3 - 12 November 2026 - Account Ownership

**What I asked AI:** How to ensure customers can view only their own accounts.

**What AI produced:** A database query filtered using the authenticated user's ID.

**What needed review:** Account queries must not trust arbitrary customer IDs supplied by the client.

**What I did:** Reviewed the GET /my route and verified the ownerId filter.

**Commit link:** Pending.

## Entry 4 - 12 November 2026 - Transaction Integrity

**What I asked AI:** How to prevent duplicate transfers and withdrawals.

**What AI produced:** Idempotency key validation and database transaction guidance.

**What needed review:** Duplicate requests must not change balances twice.

**What I did:** Tested duplicate transfers and verified a 409 response.

**Commit link:** Pending.

## Entry 5 - 12 November 2026 - Rate Limiting

**What I asked AI:** How to protect backend APIs against excessive requests.

**What AI produced:** Redis-backed rate-limiting middleware using Express packages.

**What needed review:** Redis connectivity and actual HTTP 429 behavior must be tested.

**What I did:** Installed the packages, configured Memurai and added the middleware. Normal login and readiness requests returned 200. Further rate-limit testing is pending.

**Commit link:** Pending.

## Responsible AI Usage

- AI was used for coding guidance, debugging and documentation.
- Existing code was reviewed before modifications.
- API behavior was checked through Postman.
- Security-related changes were tested where possible.
- AI-generated suggestions were not treated as automatically correct.
