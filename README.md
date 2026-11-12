
# BalanceVault

BalanceVault is a demonstration banking application developed for a hackathon. It provides customer account management, secure transactions, role-based access control and audit logging.

**Important:** This project uses synthetic data only. It does not process real money.

## Technology Stack

- Frontend: React
- Backend: Node.js and Express.js
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT
- Rate Limiting: Redis / Memurai
- API Testing: Postman

## Implemented Features

- Customer registration and login.
- JWT authentication.
- Customer and Admin roles.
- Admin approval of users and account requests.
- Customer account listing.
- Deposit functionality.
- Withdrawal functionality.
- Account-to-account transfers.
- Idempotency protection against duplicate transactions.
- Ledger entries for financial operations.
- Audit logging.
- Health and database readiness endpoints.
- Redis-backed API rate limiting.

## Security

- Authentication and authorization middleware.
- Customer account ownership validation.
- Admin-only routes.
- Helmet security headers.
- Restricted CORS configuration.
- Database transactions for money operations.
- Idempotency keys.
- Audit logs.
- Redis-backed rate limiting.

See [THREATS.md](THREATS.md) for the threat model and security testing.

## Backend Setup

1. Install Node.js and PostgreSQL.
2. Install Memurai or Redis.
3. Open the backend folder:

   `cd backend`

4. Install dependencies:

   `npm install`

5. Configure the environment variables in `.env`. Never commit secrets.

6. Apply database migrations:

   `npx prisma migrate deploy`

7. Start the backend:

   `npm run dev`

The backend runs on:

`http://localhost:5000`

## Health Endpoints

- `GET /health` - Checks whether the backend is running.
- `GET /ready` - Checks database connectivity.

## API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Customer registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/accounts/my` | View own accounts |
| POST | `/api/accounts/request` | Request an account |
| POST | `/api/accounts/deposit` | Deposit demonstration funds |
| POST | `/api/accounts/withdraw` | Withdraw demonstration funds |
| POST | `/api/accounts/transfer` | Transfer demonstration funds |
| GET | `/api/admin/pending-users` | View pending users |
| GET | `/api/admin/pending-account-requests` | View pending account requests |
| PATCH | `/api/admin/approve-user/:userId` | Approve a user |
| PATCH | `/api/admin/approve-account/:requestId` | Approve an account |

## Testing

API endpoints were tested using Postman.

Security and transaction testing details are documented in `THREATS.md`.

## AI Usage

AI assistance was used for development guidance, debugging and documentation. See `PROMPTS.md` for the usage log.

## Limitations

This is a hackathon demonstration project, not a production banking system. It requires further security testing, deployment hardening and review before any production use.
