# SubSecure AI — API Contracts (for Yogesh / frontend)

Base URL: `http://localhost:8000/api/v1`
Auth: `Authorization: Bearer <access_token>` on all endpoints except register/login.
Money fields are JSON strings or numbers serialised from `Decimal` — always 2dp.
All list endpoints return JSON arrays. Errors: `{ "detail": "..." }` (or a list of strings for 422).

## Auth

### POST /auth/register  (public)
Req: `{ "name": "Acme User", "email": "u@acme.io", "password": "Strong@123", "company": "Acme" }`
Res 201: `{ "access_token": "...", "token_type": "bearer", "user": UserOut }`
409 duplicate email · 422 weak password (detail = list of policy violations).
Note: role is always forced to CUSTOMER server-side.

### POST /auth/login  (public)
Req: `{ "email": "...", "password": "..." }` → Res 200: same as register. 401 on bad credentials.

### GET /auth/me  → `UserOut`
`UserOut = { "id": 1, "name": "...", "email": "...", "role": "ADMIN|STAFF|CUSTOMER", "customer_id": 1|null }`

### POST /auth/staff  (ADMIN only)
Req: `{ "name", "email", "password" }` → Res 201: `UserOut`. 403 for Staff/Customer.

## Catalog

### GET /products → `ProductOut[]`
`ProductOut = { id, name, product_type, sales_price, cost_price, notes, is_active,
  variants: [{ id, product_id, name, price_adjustment }] }`

### POST /products  (ADMIN/STAFF)
`{ name, product_type?, sales_price, cost_price?, notes?, variants?: [{name, price_adjustment}] }` → 201 `ProductOut`

### GET /plans → `PlanOut[]`
`PlanOut = { id, name, product_id, price, billing_interval: "DAILY|WEEKLY|MONTHLY|YEARLY",
  minimum_quantity, available_from, available_until, auto_close, allow_early_close,
  allow_pause, allow_renewal, is_active }`  (dates are `YYYY-MM-DD` or null)

### POST /plans  (ADMIN/STAFF) → 201 `PlanOut`

## Quotations

### GET /quotations → `QuotationOut[]`  (customer sees only own)
### POST /quotations  (ADMIN/STAFF)
`{ customer_id, plan_id?, valid_until?, lines: [{ product_id, variant_id?, quantity }] }` → 201
`QuotationOut = { id, quotation_number, customer_id, plan_id, valid_until,
  status: "DRAFT|QUOTATION|CONFIRMED|ACTIVE|CLOSED", subtotal, tax_total, discount_total,
  total, created_by, lines: [{ id, product_id, variant_id, quantity, unit_price }] }`
Unit price is computed server-side (product price + variant surcharge).

### POST /quotations/{id}/transition  (ADMIN/STAFF)
`{ "action": "QUOTATION" | "CONFIRMED" | "ACTIVE" | "CLOSED" }`
DRAFT→QUOTATION→CONFIRMED; `ACTIVE` converts to a subscription (returns updated quotation).
400 on invalid transition.

## Subscriptions

### GET /subscriptions → `SubscriptionOut[]`  (customer-scoped)
`SubscriptionOut = { id, subscription_number, customer_id, plan_id, start_date, expiry_date,
  next_billing_date, payment_terms, status: "DRAFT|QUOTATION|CONFIRMED|ACTIVE|PAUSED|CLOSED|EXPIRED",
  lines: [{ id, product_id, variant_id, quantity, unit_price }] }`

### POST /subscriptions  (ADMIN/STAFF)
`{ customer_id, plan_id, start_date, expiry_date?, payment_terms?, lines: [...] }` → 201

### GET /subscriptions/{id} → `SubscriptionOut` (404 if not owned)

### POST /subscriptions/{id}/transition  (ADMIN/STAFF)
`{ "action": "QUOTATION|CONFIRMED|ACTIVE|PAUSED|CLOSED|EXPIRED|RENEW" }`
Plan flags gate PAUSED / early CLOSED / RENEW. 400 with message on invalid transitions.

### GET /subscriptions/{id}/events → `AuditEventOut[]`
`AuditEventOut = { sequence_num, event_id, aggregate_type, aggregate_id, event_type,
  payload (JSON string), actor_user_id, timestamp, previous_hash, event_hash }`

### GET /subscriptions/{id}/state-at?at=<ISO-8601> →
`{ subscription_id, as_of, status, events_replayed, note }`

## Billing

### POST /billing/simulate  (ADMIN/STAFF) — dry run, writes nothing
Req: `{ "billing_period_key": "2026-10" }` (omit for current month)
Res: `{ period, eligible_count, ready_count, skipped_count, blocked_count,
  expected_total, tax_total, discount_total, warnings: string[], dry_run: true,
  items: [{ subscription_id, subscription_number, customer_id,
    status: "READY|SKIPPED|BLOCKED", reason, subtotal, discount_total, tax_total, total,
    anomaly_flags: string[] }] }`

### POST /billing/execute  (ADMIN/STAFF) — requires `{ "confirm": true }`
Res: `{ period, generated_count, duplicate_count, failed_count,
  items: [{ subscription_id, subscription_number, result: "GENERATED|DUPLICATE|FAILED",
    invoice_id, invoice_number, message }] }`

## Invoices

### GET /invoices → `InvoiceOut[]`  (customer-scoped)
`InvoiceOut = { id, invoice_number, subscription_id, customer_id, billing_period_key,
  billing_period_start, billing_period_end, issue_date, due_date, subtotal, tax_total,
  discount_total, total, status: "DRAFT|CONFIRMED|PAID|CANCELLED|OVERDUE",
  amount_paid, balance, lines: [{ id, product_id, description, quantity, unit_price, line_total }] }`

### GET /invoices/{id} → `InvoiceOut`
### POST /invoices/{id}/confirm  (ADMIN/STAFF, DRAFT→CONFIRMED)
### POST /invoices/{id}/cancel  (ADMIN/STAFF, not PAID)
### GET /invoices/{id}/balance → `{ invoice_id, invoice_number, total, amount_paid, balance, status }`

## Payments (simulated; no real gateway)

### POST /payments  (ADMIN/STAFF)
`{ invoice_id, amount, method?, payment_date?, reference?, note? }` → 201 `PaymentOut`
400 if amount exceeds outstanding balance or invoice already paid.
`PaymentOut = { id, invoice_id, amount, method, payment_date, reference, note, created_by }`

### GET /payments → `PaymentOut[]`  (customer-scoped)

## Analytics

### GET /analytics/dashboard (Admin/Staff)
`{ active_subscriptions, mrr, arr, new_mrr, expansion_mrr, churned_mrr,
  revenue_collected_total, revenue_collected_this_month, outstanding_amount,
  overdue_invoice_count, forecast_90d_estimate: { label, projected_revenue_next_90_days, assumption },
  metric_policy, churn_risk: [...top 10], ml_anomaly: {...} }`
Customer role gets a reduced own-scope shape: `{ active_subscriptions, subscriptions, invoices, outstanding_amount, overdue_invoice_count }`.

### GET /analytics/mrr → `{ mrr, arr, components: [{ subscription_id, subscription_number, customer_id, billing_interval, monthly_amount }] }`

### GET /analytics/churn-risk →
`[{ subscription_id, subscription_number, customer_id, status, risk_score (0-100),
   risk_label: "LOW|MEDIUM|HIGH", reasons: string[] }]`

## Audit & security

### GET /audit/events?limit=100&aggregate_type=invoice  (ADMIN/STAFF) → `AuditEventOut[]`
### POST /audit/verify  (any authenticated user) →
`{ valid: bool, checked_events: int, first_invalid_sequence: int|null, message: string }`
### GET /security/alerts?resolved=false  (ADMIN/STAFF) →
`[{ id, alert_type, severity, description, related_entity_type, related_entity_id, resolved, created_at }]`

## AI copilot

### POST /assistant/query
Req: `{ "question": "Show overdue invoices above 10000" }`
Res: `{ mode: "gemini|fallback", question, ast: {...}|null, answer: string,
  results: object[], result_count: int }`
422 when the question/AST is outside the supported allowlist. Read-only; customer-scoped.

## Customers

### GET /customers (Admin/Staff: all; Customer: own profile only) → `[{ id, name, email, company, region }]`
### GET /customers/{id} (customer: own id only, else 404)
