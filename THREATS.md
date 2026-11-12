
# BalanceVault - Threat Model

## 1. Project Overview

BalanceVault is a demonstration banking application built using React, Node.js, Express, PostgreSQL, Prisma and Redis.

The application uses synthetic data only. It does not process real financial transactions.

## 2. Assets to Protect

- User personal information
- Authentication tokens
- Customer account details
- Account balances
- Ledger transactions
- Audit logs
- Admin privileges
- Database credentials and application secrets

## 3. Potential Security Threats and Mitigations

| Threat | Possible Impact | Mitigation |
|---|---|---|
| Unauthorized access | Access to private information | JWT authentication |
| Customer accessing admin APIs | Unauthorized admin operations | Role-based access control |
| Accessing another customer's account | Exposure of account information | Account ownership validation |
| Duplicate deposit or withdrawal | Duplicate financial operations | Idempotency keys |
| Duplicate transfer | Incorrect account balances | Idempotency keys |
| Insufficient balance withdrawal | Invalid account balance | Balance validation |
| Concurrent withdrawals | Incorrect balance updates | Conditional database updates and transactions |
| API request flooding | Server overload | Redis-backed rate limiting |
| Database failure | Application unavailable | Database readiness endpoint |
| Unauthorized account approval | Fraudulent account creation | Admin authorization |
| Missing transaction history | Reduced accountability | Ledger entries and audit logging |

## 4. Security Controls Implemented

1. JWT-based authentication.
2. Role-based access control for admin routes.
3. Customer account ownership checks.
4. Helmet security headers.
5. Restricted CORS configuration.
6. Redis-backed API rate limiting.
7. Idempotency key validation.
8. Database transactions for money operations.
9. Ledger entries for deposits, withdrawals and transfers.
10. Audit logs for important operations.
11. Health check endpoint.
12. Database readiness endpoint.

## 5. Security Testing Performed

| Test Case | Expected Result | Observed Result |
|---|---|---|
| Customer accesses admin endpoint | 403 Forbidden | Passed |
| Admin accesses admin endpoint | 200 OK | Passed |
| Duplicate transfer | 409 Conflict | Passed |
| Insufficient balance transfer | 409 Conflict | Passed |
| Balance after failed transfer | No balance change | Passed |
| Customer views own accounts | 200 OK | Passed |
| Backend health check | 200 OK | Passed |
| Database readiness check | 200 OK | Passed |

## 6. Additional Security Testing Required

- Verify rate limiting returns HTTP 429 after the configured request limit.
- Add automated authorization tests.
- Add automated transaction and ledger integrity tests.
- Review input validation and error handling.
- Verify database roles and permissions.
- Configure HTTPS and secure production secrets before deployment.

## 7. Security Limitations

- This application is developed for a hackathon demonstration.
- It has not undergone an independent penetration test.
- Only synthetic demonstration data should be used.
- It must not be used for real banking or financial transactions.
- Production deployment requires additional security review.

## 8. Conclusion

BalanceVault implements authentication, authorization, ownership validation, transaction integrity, audit logging and API rate limiting.

Security testing and further improvements are necessary before any production use.
