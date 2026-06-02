# FYM Backend

Express backend for Find Your Medicines.

## Setup

```bash
npm install
cp .env.example .env
```

On Windows PowerShell, use `copy .env.example .env` if `cp` is not available.

Set `DATABASE_URL` in `.env` to your PostgreSQL database connection string.

## Scripts

```bash
npm run dev
npm start
npm run check
npm run db:migrate
```

The initial API prefix is `/api/v1`.

Health endpoints:

```text
GET /api/v1/health
GET /api/v1/health/ready
```

`/health/ready` checks PostgreSQL connectivity.

## Auth OTP Flow

Request OTP with an explicit purpose:

```http
POST /api/v1/auth/otp/request
```

```json
{
  "phone": "9000000000",
  "otpPurpose": "REGISTER"
}
```

Supported `otpPurpose` values:

- `REGISTER`
- `LOGIN`
- `CHANGE_PHONE` reserved for later

Registration verifies with:

```http
POST /api/v1/auth/otp/verify
```

Login verifies with:

```http
POST /api/v1/auth/login
```

## Database

The first migration creates:

- `users`
- `pharmacies`
- `schema_migrations`

The second migration creates the remaining core project tables:

- `customer_profiles`
- `addresses`
- `pharmacists`
- `medicines`
- `pharmacy_inventory`
- `prescriptions`
- `orders`
- `order_items`
- `vendor_order_offers`
- `penalties`
- `audit_logs`

The third migration creates pharmacy onboarding document storage:

- `pharmacy_documents`

The fourth migration creates operational API storage:

- `cart_items`
- `support_tickets`
- `support_ticket_messages`
- `notifications`
- `notification_devices`
- `payment_transactions`
- `delivery_riders`
- `delivery_assignments`

The fifth migration removes password-based auth storage:

- drops `users.password_hash`

Run migrations after PostgreSQL is available and `.env` has a valid `DATABASE_URL`:

```bash
npm run db:migrate
```
