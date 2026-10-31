# SubSecure AI — A2Z Master Project Specification & Build Prompt

> **Project:** SubSecure AI  
> **Category:** Odoo Hackathon — Subscription Management System  
> **Team:** Kirthi + Yogesh  
> **Build window:** 6 hours  
> **Product positioning:** An intelligent, secure and cryptographically verifiable subscription and recurring-billing platform.

---

## 1. Master Prompt — Give This to the Coding Agent

You are a senior full-stack engineer and hackathon technical lead. Build **SubSecure AI**, a working prototype of a subscription management platform for a fictional SaaS company called **Brightloop Software**.

The application must satisfy the subscription-management problem statement while standing out through a practical hybrid architecture combining:

1. **Event-driven financial history:** Record important subscription and billing actions as append-only domain events.
2. **Cryptographic auditability:** Link events using SHA-256 hashes and provide an integrity-verification feature.
3. **Safe recurring billing:** Simulate billing before execution and prevent duplicate invoices using database-backed idempotency.
4. **Revenue intelligence:** Calculate MRR, ARR, new MRR, expansion MRR, churned MRR and outstanding invoices.
5. **AI finance copilot:** Convert natural-language questions into a strictly validated JSON query specification. Never execute model-generated SQL.
6. **Anomaly detection:** Use deterministic safety rules first; add Isolation Forest as an optional warning signal if time allows.
7. **Configurable business rules:** Support a small, safe set of JSON-based discount and tax rules.

Build a **single modular application**, not microservices. Prioritize a complete end-to-end workflow over a large number of unfinished features.

### Mandatory implementation constraints

- Use React + Vite + Tailwind CSS for the frontend.
- Use Python + FastAPI for the backend.
- Use SQLite + SQLAlchemy for the six-hour prototype. Keep the data-access layer structured so it can later move to PostgreSQL.
- Use bcrypt or passlib-compatible password hashing. Never store plaintext passwords.
- Use JWT authentication and enforce authorization on the backend.
- Use Pydantic for request validation.
- Use `Decimal` or integer paise for monetary calculations; do not use binary floating-point for financial totals.
- Use SHA-256 from Python's standard `hashlib` library for event hashes.
- Use Gemini through a backend-only API integration for natural-language intent extraction, with a deterministic fallback if the API key is missing or unavailable.
- Use parameterized ORM queries. The LLM must not generate or execute SQL.
- Keep secrets in environment variables. Never expose API keys in frontend code or commit `.env`.
- Provide seeded demo data and a README with exact setup commands.
- All important screens must work with the backend. Do not create inert buttons or fake success states.
- If a feature cannot be completed, show a clear disabled/coming-soon state rather than pretending it works.

---

## 2. Product Overview

### Problem

Brightloop Software sells monthly and yearly software subscriptions, add-ons and product variants. Its current process uses spreadsheets, manual renewals, hand-created invoices, manual payment matching and manually prepared revenue reports.

This causes:
- Missed renewals.
- Incorrect or duplicated invoices.
- Unclear recurring revenue.
- Manual discount and tax errors.
- Poor visibility into overdue invoices.
- No trustworthy audit history.
- No self-service customer portal.

### Solution

SubSecure AI centralizes the subscription lifecycle from product and plan setup to quotations, subscriptions, recurring invoices, payments, revenue analytics and customer self-service.

Its differentiator is that key financial actions are recorded in a verifiable event history, recurring billing is protected against duplicate execution, and authorized users can ask financial questions in natural language.

### User roles

1. **Admin**
   - Full system access.
   - Manage users, products, plans, taxes, discounts, subscriptions, invoices and audit settings.
   - Run billing simulations and execute billing batches.
2. **Staff**
   - Manage customers, quotations, subscriptions, invoices and payments according to permissions.
   - Cannot create staff users or change privileged security settings.
3. **Customer**
   - View only their own profile, subscriptions, invoices and payment history.
   - Cannot access other customers' records or administrative functions.

---

## 3. Core Functional Requirements

### 3.1 Authentication and authorization

- Registration for customer accounts.
- Login and logout.
- Unique email per account.
- Password policy: more than eight characters, uppercase, lowercase and special character.
- Secure password hashing.
- JWT-protected routes.
- Backend role checks for Admin, Staff and Customer.
- Only Admin can create staff users.
- Customer queries must always be scoped to the authenticated customer's ID.
- Password reset can be represented as a prototype flow if email delivery is not configured. Do not claim an email was sent unless an email provider is actually integrated.

### 3.2 Products and variants

Product fields:
- ID
- Name
- Type
- Sales price
- Cost price
- Notes
- Active status

Variant fields:
- Product ID
- Variant name / attribute
- Price adjustment

Example:
- Base product price: ₹5,000.
- Brand variant: Odoo.
- Odoo variant surcharge: ₹560.
- Final price: ₹5,560.

### 3.3 Plans

Plan fields:
- Name
- Product
- Price
- Billing interval: daily, weekly, monthly or yearly
- Minimum quantity
- Available-from and available-until dates
- Auto-close setting
- Allow early closure
- Allow pause
- Allow renewal
- Active status

### 3.4 Quotations

- Create quotation from a reusable template.
- Add products, quantities, plan, taxes and discounts.
- Store validity period and expiry date.
- Support states: Draft → Quotation → Confirmed → Active / Closed.
- Validate allowed transitions on the backend.
- Converting a confirmed quotation to a subscription must create the appropriate subscription event.

### 3.5 Subscription lifecycle

Each subscription must contain:
- Unique subscription number.
- Customer.
- Plan.
- Start date.
- Expiry date.
- Payment terms.
- Subscription lines.
- Quantity.
- Unit price.
- Taxes.
- Discount.
- Total.
- Status.

Statuses:
- Draft
- Quotation
- Confirmed
- Active
- Paused
- Closed
- Expired

Support permitted actions:
- Confirm.
- Activate.
- Pause.
- Resume.
- Renew.
- Close.
- Expire automatically when applicable.

### 3.6 Billing and invoices

Invoice fields:
- Invoice number.
- Customer.
- Subscription.
- Billing period start and end.
- Invoice date and due date.
- Line items.
- Tax.
- Discount.
- Subtotal.
- Total.
- Status: Draft, Confirmed, Paid, Cancelled or Overdue.

Required behavior:
- Generate invoices from subscriptions due for billing.
- Calculate totals server-side.
- Apply eligible tax and discount rules.
- Support confirm, cancel and mark-paid workflows.
- Display outstanding amounts and overdue invoices.
- Use database transactions for invoice creation and event insertion.

### 3.7 Duplicate-billing prevention

Create a unique billing key for each subscription and billing period, for example:

`SUB-101:2026-10`

Enforce a database unique constraint on `(subscription_id, billing_period_key)` or on a unique idempotency key.

Requirements:
- Repeated requests for the same billing period must not create a second invoice.
- A retry should return the existing result or a clear duplicate response.
- Concurrent attempts must be protected by the database constraint and transaction handling.
- Do not rely only on a frontend button being disabled.

### 3.8 Billing Day Rehearsal

Provide a dry-run endpoint and UI.

The simulation must:
1. Find eligible active subscriptions due for billing.
2. Exclude paused, closed or expired subscriptions.
3. Check existing invoices for the billing period.
4. Calculate line totals, discounts and taxes.
5. Run deterministic validation rules.
6. Optionally score anomalies.
7. Return a preview without writing invoices or payment records.

Preview summary:
- Number of eligible subscriptions.
- Number of invoices ready.
- Number skipped.
- Number blocked.
- Expected total.
- Discount total.
- Tax total.
- Warnings and reasons.

Only an authorized Admin/Staff action can execute a real billing batch. Require explicit confirmation in the UI.

### 3.9 Taxes and discounts

Implement a small JSON rule evaluator with a whitelist of supported fields and operators.

Example discount rule:

```json
{
  "name": "Enterprise Seat Discount",
  "enabled": true,
  "conditions": [
    {"field": "quantity", "operator": "gte", "value": 10}
  ],
  "action": {"type": "percentage", "value": 15},
  "valid_from": "2026-10-01",
  "valid_until": "2026-12-31",
  "usage_limit": 100
}
```

Support:
- Fixed discount.
- Percentage discount.
- Minimum quantity / purchase amount.
- Validity dates.
- Usage limit.
- Eligible products or subscriptions.

For tax, implement a simple configurable percentage rule and clearly label it as a prototype tax configuration. Do not imply it covers all GST or jurisdictional compliance.

### 3.10 Payments

- Record payment method, amount, date, reference and note.
- Link payment to an invoice.
- Support partial payments if feasible.
- Update invoice status to Paid only when allocated payments cover the invoice total.
- Calculate outstanding balance.
- Payment entry is simulated; do not imply a real payment gateway is connected.

### 3.11 Revenue Intelligence

Dashboard metrics:
- Active subscriptions.
- MRR.
- ARR = MRR × 12.
- New MRR.
- Expansion MRR.
- Churned MRR.
- Revenue collected in selected period.
- Outstanding amount.
- Overdue invoice count.
- Churn-risk subscriptions.

Monthly normalization:
- Daily: daily recurring amount × 365 / 12.
- Weekly: weekly recurring amount × 52 / 12.
- Monthly: monthly amount.
- Yearly: yearly amount / 12.

Document the assumptions used for paused subscriptions, discounts, taxes and cancellations. Use consistent definitions across all metrics.

Forecast:
- Use a transparent baseline projection based on current recurring revenue and known renewals/expiries.
- Label it as an estimate, not a trained predictive forecast.

### 3.12 Churn and billing anomaly detection

Mandatory deterministic risk signals:
- Overdue invoice.
- Repeated failed/recorded payment attempts if represented in demo data.
- Paused subscription.
- Subscription expiring soon.
- Unusual discount or quantity change.

Use a transparent risk score with explainable reasons.

Optional ML:
- Isolation Forest using scikit-learn on synthetic demonstration data.
- Treat its output as a warning, not proof of fraud.
- Do not block a valid transaction solely because a synthetic-data model labels it anomalous.
- Deterministic billing constraints always take precedence.

### 3.13 Secure AI Finance Copilot

Example questions:
- “Show overdue invoices above ₹10,000 this month.”
- “Which yearly subscriptions expire next week?”
- “Calculate current MRR.”
- “Show customers with high churn risk.”
- “How much is still outstanding?”

Safe architecture:

`User question → LLM intent extraction → Pydantic AST validation → role/tenant authorization → whitelisted ORM query → result → concise explanation`

Example AST:

```json
{
  "entity": "invoice",
  "filters": [
    {"field": "status", "operator": "eq", "value": "OVERDUE"},
    {"field": "total", "operator": "gt", "value": 10000}
  ],
  "period": "current_month"
}
```

Security rules:
- No raw SQL from the model.
- Whitelist entities, fields, operators and allowed values.
- Reject unknown fields and malformed filters.
- Enforce RBAC and customer ownership independently of the model.
- Limit result count.
- Use read-only queries for the prototype.
- Never let a chat message trigger payment, invoice cancellation, discount changes or other financial writes.
- If LLM is unavailable, support a few deterministic query templates and clearly indicate fallback mode.

### 3.14 Cryptographic Event Ledger

Record important domain events:
- UserCreated
- ProductCreated
- PlanCreated
- QuotationCreated
- QuotationConfirmed
- SubscriptionCreated
- SubscriptionActivated
- SubscriptionPaused
- SubscriptionRenewed
- SubscriptionClosed
- InvoiceGenerated
- InvoiceConfirmed
- PaymentReceived
- DiscountApplied
- BillingBatchExecuted

Event fields:
- Sequence number.
- Event UUID.
- Aggregate type and ID.
- Event type.
- JSON payload.
- Actor/user ID.
- UTC timestamp.
- Previous hash.
- Event hash.

Hash design:

`event_hash = SHA256(canonical_event_payload + previous_hash)`

Requirements:
- Use deterministic canonical JSON serialization.
- Include sequence, event ID, aggregate ID, event type, actor, timestamp and payload in the hashed content.
- Genesis hash is 64 zero characters.
- Append events in a database transaction.
- Verify chain order and recomputed hashes through an API.
- Show verification result and first invalid sequence if tampering is detected.
- Restrict event update/delete through application code.
- Explain honestly: a hash chain stored in the same database is tamper-evident, not absolutely immutable against a privileged attacker who can rewrite the entire database and chain.
- Optional extension: anchor a checkpoint hash to a public testnet or independently controlled storage. This is not required for the six-hour core build.

### 3.15 Audit timeline and time travel

- Show chronological event history for a subscription.
- Display actor, event type, timestamp and relevant changed values.
- Basic time-travel endpoint: reconstruct a subscription's state by replaying its events up to a selected timestamp.
- If full global replay is too expensive, implement time travel for one subscription only.
- Do not build a complex distributed CQRS projection system in the prototype.

### 3.16 Customer portal

Customers can:
- View their profile.
- View their own subscriptions and statuses.
- View invoices and payment history.
- See due dates and outstanding amounts.

Customers cannot:
- View other customers.
- Create staff users.
- Edit pricing, taxes or discounts.
- Execute billing.
- Access audit administration.

---

## 4. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Charts | Recharts |
| HTTP client | Axios or fetch |
| Backend | Python FastAPI |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Prototype DB | SQLite |
| Password hashing | bcrypt / passlib |
| Authentication | JWT |
| Cryptography | Python hashlib SHA-256 |
| ML extension | scikit-learn IsolationForest |
| LLM | Gemini API via backend |
| Testing | pytest + manual UI tests |
| Version control | Git + GitHub |

Do not introduce Node.js as a second backend. FastAPI is the only backend service.

---

## 5. Full Project Folder Structure

```text
subsecure-ai/
│
├── README.md
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── routes/
│       │   └── AppRoutes.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── services/
│       │   ├── api.js
│       │   ├── authService.js
│       │   ├── subscriptionService.js
│       │   ├── billingService.js
│       │   └── analyticsService.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Topbar.jsx
│       │   │   └── AppLayout.jsx
│       │   ├── common/
│       │   │   ├── MetricCard.jsx
│       │   │   ├── StatusBadge.jsx
│       │   │   ├── DataTable.jsx
│       │   │   ├── LoadingState.jsx
│       │   │   └── ErrorState.jsx
│       │   ├── charts/
│       │   │   ├── RevenueChart.jsx
│       │   │   └── MRRBreakdown.jsx
│       │   ├── billing/
│       │   │   ├── BillingPreview.jsx
│       │   │   └── InvoiceLines.jsx
│       │   ├── audit/
│       │   │   ├── AuditTimeline.jsx
│       │   │   └── IntegrityStatus.jsx
│       │   └── ai/
│       │       └── FinanceCopilot.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Products.jsx
│       │   ├── Plans.jsx
│       │   ├── Quotations.jsx
│       │   ├── Subscriptions.jsx
│       │   ├── SubscriptionDetail.jsx
│       │   ├── Invoices.jsx
│       │   ├── Payments.jsx
│       │   ├── BillingSimulator.jsx
│       │   ├── AuditCenter.jsx
│       │   ├── AIAssistant.jsx
│       │   ├── Customers.jsx
│       │   └── CustomerPortal.jsx
│       └── utils/
│           ├── currency.js
│           └── date.js
│
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── customer.py
│   │   │   ├── product.py
│   │   │   ├── plan.py
│   │   │   ├── quotation.py
│   │   │   ├── subscription.py
│   │   │   ├── invoice.py
│   │   │   ├── payment.py
│   │   │   ├── discount.py
│   │   │   └── event.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── product.py
│   │   │   ├── subscription.py
│   │   │   ├── invoice.py
│   │   │   ├── payment.py
│   │   │   ├── billing.py
│   │   │   └── ai_query.py
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── plans.py
│   │   │   ├── quotations.py
│   │   │   ├── subscriptions.py
│   │   │   ├── invoices.py
│   │   │   ├── payments.py
│   │   │   ├── billing.py
│   │   │   ├── analytics.py
│   │   │   ├── audit.py
│   │   │   └── assistant.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── subscription_service.py
│   │   │   ├── billing_engine.py
│   │   │   ├── idempotency_service.py
│   │   │   ├── audit_ledger.py
│   │   │   ├── revenue_engine.py
│   │   │   ├── rule_engine.py
│   │   │   ├── anomaly_engine.py
│   │   │   └── ai_service.py
│   │   ├── security/
│   │   │   ├── dependencies.py
│   │   │   ├── permissions.py
│   │   │   └── password.py
│   │   ├── seed/
│   │   │   └── seed_demo.py
│   │   └── utils/
│   │       ├── money.py
│   │       └── dates.py
│   └── tests/
│       ├── test_auth.py
│       ├── test_billing.py
│       ├── test_idempotency.py
│       └── test_audit_ledger.py
│
└── docs/
    ├── API_CONTRACTS.md
    ├── DATABASE_SCHEMA.md
    └── DEMO_SCRIPT.md
```

The folder structure is a target structure. Create only files needed for implemented features; do not waste the six-hour window generating empty modules.

---

## 6. Database Design

Minimum tables:

| Table | Purpose |
|---|---|
| users | Login, password hash and role |
| customers | Customer/company profile |
| products | Product catalog |
| product_variants | Variant attributes and surcharges |
| plans | Recurring price and frequency |
| quotations | Sales offer and validity |
| quotation_lines | Products, quantities and prices |
| subscriptions | Subscription lifecycle |
| subscription_lines | Subscription products and quantities |
| invoices | Billing-period invoice and totals |
| invoice_lines | Invoice item details |
| payments | Payments allocated to invoices |
| discounts | Configurable discount rules |
| tax_rules | Configurable tax rules |
| billing_runs | Dry-run and execution summaries |
| billing_idempotency | Unique subscription-period keys |
| audit_events | Append-only cryptographic event records |
| security_alerts | Explainable anomaly and security alerts |

Key constraints:
- Unique user email.
- Unique subscription number.
- Unique invoice number.
- Unique `(subscription_id, billing_period_key)` for recurring invoice generation.
- Foreign keys for all financial relationships.
- Decimal monetary columns.
- Index status, customer ID, due date and billing period where useful.

---

## 7. API Contract

Use `/api/v1` as the API prefix.

### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/staff`

### Products and plans
- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/plans`
- `POST /api/v1/plans`

### Quotations
- `GET /api/v1/quotations`
- `POST /api/v1/quotations`
- `POST /api/v1/quotations/{id}/transition`

### Subscriptions
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions/{id}`
- `POST /api/v1/subscriptions/{id}/transition`
- `GET /api/v1/subscriptions/{id}/events`
- `GET /api/v1/subscriptions/{id}/state-at`

### Billing and invoices
- `POST /api/v1/billing/simulate`
- `POST /api/v1/billing/execute`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/{id}`
- `POST /api/v1/invoices/{id}/confirm`
- `POST /api/v1/invoices/{id}/cancel`

### Payments
- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `GET /api/v1/invoices/{id}/balance`

### Analytics
- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/analytics/mrr`
- `GET /api/v1/analytics/churn-risk`

### Audit and security
- `GET /api/v1/audit/events`
- `POST /api/v1/audit/verify`
- `GET /api/v1/security/alerts`

### AI
- `POST /api/v1/assistant/query`

Every endpoint must have request/response schemas, authentication and role checks as appropriate. The customer role must be scoped to its own records.

---

## 8. Suggested Demo Dataset

Seed realistic, clearly fictional records:
- 3 users: one Admin, one Staff, one Customer.
- 5 customers.
- 4 products.
- 5 plans covering daily, weekly, monthly and yearly frequencies.
- 8–12 subscriptions with mixed statuses.
- 5 invoices, including paid, outstanding and overdue.
- 3 payment records.
- 2 discount rules.
- 1 tax rule.
- Audit events generated through actual service functions.

Use recognizable demo examples:
- Acme Technologies — Enterprise monthly plan.
- Northstar Retail — yearly plan.
- PixelWorks — monthly plan with an add-on.
- One paused subscription.
- One subscription expiring soon.
- One overdue invoice.
- One subscription with a quantity change to trigger an anomaly warning.

Do not hardcode dashboard totals separately from the database. Dashboard values must be computed from seeded records.

---

## 9. Six-Hour Implementation Schedule

### Hour 0–1: Foundation
**Kirthi:** FastAPI setup, SQLite/SQLAlchemy, core models, authentication foundation, event-ledger service skeleton.  
**Yogesh:** Vite/React setup, Tailwind, routing, login page, application shell, sidebar and reusable components.

### Hour 1–2: Core business workflow
**Kirthi:** Product, plan, quotation and subscription APIs; state transitions; event creation.  
**Yogesh:** Product, plan, quotation and subscription pages; forms, tables and status actions.

### Hour 2–3: Billing and security
**Kirthi:** Billing calculation, tax/discount evaluation, idempotency constraints, invoice creation, SHA-256 chain verification.  
**Yogesh:** Invoice pages, billing rehearsal screen, payment form, audit timeline and integrity indicator.

### Hour 3–4: Intelligence
**Kirthi:** MRR/ARR APIs, deterministic risk score, optional Isolation Forest, secure AI AST endpoint.  
**Yogesh:** Revenue dashboard, charts, risk indicators, AI copilot interface.

### Hour 4–5: Integration
**Kirthi:** Customer-scoped endpoints, validation, security alerts, test APIs and seed data.  
**Yogesh:** Customer portal, connect real APIs, loading/error states and responsive polish.

### Hour 5–6: Stabilize and demo
**Both:** Test the end-to-end flow, fix blockers, verify duplicate prevention, verify hash chain, test AI fallback, deploy if stable and rehearse the demo.

### Scope rule
If behind schedule, prioritize in this order:
1. Authentication and roles.
2. Products/plans/subscriptions.
3. Invoice generation and payments.
4. Idempotency.
5. Hash-chain verification.
6. Dashboard metrics.
7. AI assistant.
8. Billing simulation polish.
9. Customer portal.
10. ML and blockchain anchoring.

Do not sacrifice a working billing workflow to add optional blockchain or ML features.

---

## 10. Definition of Done / Acceptance Checklist

### Core business
- [ ] Admin can create a product and plan.
- [ ] Product variant surcharge is calculated correctly.
- [ ] Admin/staff can create a quotation.
- [ ] Quotation can transition through valid states.
- [ ] Confirmed quotation can become a subscription.
- [ ] Subscription can be paused, resumed, renewed and closed where allowed.
- [ ] Invoice can be generated from a due subscription.
- [ ] Tax and discount appear in invoice calculations.
- [ ] Payment is linked to the correct invoice.
- [ ] Outstanding and overdue amounts are visible.
- [ ] Customer sees only their own records.

### Security and reliability
- [ ] Passwords are hashed.
- [ ] Role restrictions are enforced by the backend.
- [ ] Duplicate billing request does not create a second invoice.
- [ ] Audit event is created for important financial actions.
- [ ] Audit verification succeeds for an intact chain.
- [ ] A controlled test alteration is detected by verification.
- [ ] AI query is validated against an allowlist.
- [ ] Customer cannot query another customer's records.

### Intelligence
- [ ] MRR and ARR are calculated from subscriptions.
- [ ] Revenue collected and outstanding are shown.
- [ ] Overdue invoices are listed.
- [ ] Churn-risk scores have human-readable reasons.
- [ ] AI can answer at least three supported questions.
- [ ] AI failure falls back gracefully.

### Product quality
- [ ] No broken navigation.
- [ ] No inert primary buttons.
- [ ] Errors and loading states are visible.
- [ ] Demo data is available.
- [ ] README has setup instructions.
- [ ] `.env` is not committed.

---

## 11. Live Judge Demonstration (3–4 minutes)

1. Log in as Admin.
2. Create or open a product and a monthly plan.
3. Create a subscription for Acme Technologies.
4. Show the new subscription event and its hash.
5. Open Billing Day Rehearsal.
6. Show eligible, skipped and blocked subscriptions and the expected total.
7. Execute the billing batch.
8. Attempt the same billing period again and show duplicate prevention.
9. Record a payment and show invoice balance/status update.
10. Open Audit Center and run integrity verification.
11. Show a controlled tampering test in a safe demo environment, then show verification failure. Restore the demo database afterward.
12. Ask the AI copilot: “Show overdue invoices above ₹10,000.”
13. Finish on the revenue dashboard showing MRR, ARR, outstanding and risk flags.

Do not demonstrate a feature unless it has been tested. Use clearly labelled seeded demo data.

---

## 12. Setup Commands

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment variables

Create `backend/.env` from `.env.example`:

```env
DATABASE_URL=sqlite:///./subsecure.db
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Never commit real secrets.

---

## 13. Final Engineering Rules

1. Build the business workflow first; innovation must support it.
2. Keep one backend framework and one database for the prototype.
3. Define API contracts before frontend/backend parallel work.
4. Use database transactions for billing and event creation.
5. Make the audit event payload deterministic before hashing.
6. Never let the LLM generate SQL or perform financial writes.
7. Enforce customer ownership on the backend.
8. Treat ML output as a warning, not a verdict.
9. Do not claim blockchain immutability unless an external checkpoint is actually anchored and verified.
10. Do not claim production performance or legal tax compliance from a six-hour prototype.
11. Keep the code modular, readable and easy to demo.
12. At every hour, preserve a runnable application.

**Final product statement:**  
SubSecure AI is an intelligent subscription management platform that automates recurring billing, protects financial operations against duplication, preserves verifiable cryptographic audit history and gives businesses actionable revenue intelligence through a secure AI finance assistant.
