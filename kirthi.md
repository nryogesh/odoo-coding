# Kirthi — Backend, Security & Intelligence Workstream

> **Project:** SubSecure AI  
> **Role:** Backend and Systems Lead  
> **Primary ownership:** FastAPI backend, database, subscription/billing logic, event ledger, cryptographic verification, idempotency, revenue metrics, anomaly detection and secure LLM integration.  
> **Frontend owner:** Yogesh  
> **Time limit:** 6 hours

---

## 1. Your Mission

Build the backend and core business engine for SubSecure AI.

SubSecure AI is a subscription management system for Brightloop Software. It must manage products, plans, quotations, subscriptions, invoices, payments and recurring revenue. Its differentiators are:

- Event-driven financial history.
- SHA-256 hash-chained audit ledger.
- Duplicate-billing protection.
- Billing Day Rehearsal.
- MRR/ARR and churn-risk intelligence.
- Secure LLM finance queries.
- Optional Isolation Forest anomaly warnings.

Your most important responsibility is to make the financial workflow correct and verifiable. The frontend can only be impressive if the backend returns consistent, trustworthy data.

---

## 2. Technology Stack

- Python 3.11+ (use the installed supported version).
- FastAPI.
- SQLite for the six-hour prototype.
- SQLAlchemy.
- Pydantic.
- JWT authentication.
- bcrypt/passlib-compatible password hashing.
- `hashlib.sha256`.
- Gemini API through backend environment variables.
- scikit-learn IsolationForest as an optional extension.
- pytest.

Do not introduce Node.js as a second backend. Yogesh owns React; you own FastAPI.

---

## 3. Backend Folder Structure

```text
backend/
├── requirements.txt
├── .env.example
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── product.py
│   │   ├── plan.py
│   │   ├── quotation.py
│   │   ├── subscription.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   ├── discount.py
│   │   └── event.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── product.py
│   │   ├── subscription.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   ├── billing.py
│   │   └── ai_query.py
│   ├── api/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── products.py
│   │   ├── plans.py
│   │   ├── quotations.py
│   │   ├── subscriptions.py
│   │   ├── invoices.py
│   │   ├── payments.py
│   │   ├── billing.py
│   │   ├── analytics.py
│   │   ├── audit.py
│   │   └── assistant.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── subscription_service.py
│   │   ├── billing_engine.py
│   │   ├── idempotency_service.py
│   │   ├── audit_ledger.py
│   │   ├── revenue_engine.py
│   │   ├── rule_engine.py
│   │   ├── anomaly_engine.py
│   │   └── ai_service.py
│   ├── security/
│   │   ├── dependencies.py
│   │   ├── permissions.py
│   │   └── password.py
│   ├── seed/
│   │   └── seed_demo.py
│   └── utils/
│       ├── money.py
│       └── dates.py
└── tests/
    ├── test_auth.py
    ├── test_billing.py
    ├── test_idempotency.py
    └── test_audit_ledger.py
```

Create only the modules needed for the working prototype. Avoid spending time on empty architecture files.

---

## 4. Database Models

Create SQLAlchemy models for the following entities.

### User
- id
- name
- email (unique)
- password_hash
- role: ADMIN / STAFF / CUSTOMER
- customer_id (nullable; used for customer account ownership)
- created_at
- is_active

### Customer
- id
- name
- email
- company
- created_at

### Product
- id
- name
- product_type
- sales_price
- cost_price
- notes
- is_active

### ProductVariant
- id
- product_id
- name
- price_adjustment

### Plan
- id
- product_id
- name
- price
- billing_interval: DAILY / WEEKLY / MONTHLY / YEARLY
- minimum_quantity
- available_from
- available_until
- auto_close
- allow_early_close
- allow_pause
- allow_renewal
- is_active

### Quotation
- id
- quotation_number
- customer_id
- valid_until
- status
- subtotal
- tax_total
- discount_total
- total
- created_by

### Subscription
- id
- subscription_number
- customer_id
- plan_id
- start_date
- expiry_date
- next_billing_date
- payment_terms
- status
- created_at

### SubscriptionLine
- id
- subscription_id
- product_id
- variant_id (nullable)
- quantity
- unit_price

### Invoice
- id
- invoice_number
- subscription_id
- customer_id
- billing_period_key
- billing_period_start
- billing_period_end
- issue_date
- due_date
- subtotal
- tax_total
- discount_total
- total
- status

### InvoiceLine
- id
- invoice_id
- product_id
- description
- quantity
- unit_price
- line_total

### Payment
- id
- invoice_id
- amount
- method
- payment_date
- reference
- note
- created_by

### DiscountRule
- id
- name
- rule_json
- usage_count
- usage_limit
- is_active

### TaxRule
- id
- name
- region
- percentage
- is_active

### BillingRun
- id
- billing_period_key
- status: SIMULATED / EXECUTED / FAILED
- eligible_count
- skipped_count
- blocked_count
- expected_total
- created_by
- created_at

### AuditEvent
- sequence_num (monotonically increasing).
- event_id (UUID, unique).
- aggregate_type.
- aggregate_id.
- event_type.
- payload (JSON).
- actor_user_id.
- timestamp (UTC).
- previous_hash.
- event_hash (unique).

### SecurityAlert
- id
- alert_type
- severity
- description
- related_entity_id
- created_at
- resolved

Use foreign keys and indexes where useful. Use `Decimal`/SQL decimal or integer paise for money. Do not use float for financial totals.

---

## 5. Authentication and Authorization

Implement:
- Registration for customer users.
- Login.
- Password hashing.
- JWT creation and validation.
- Current-user dependency.
- Role-check dependencies.
- Admin-only staff creation.
- Customer ownership restrictions.

Password rule:
- More than eight characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one special character.

Important security behavior:
- Never trust `role` or `customer_id` submitted by the browser.
- Determine user identity and role from the verified token and database.
- For customer endpoints, add a mandatory filter using the authenticated user's `customer_id`.
- Return 403 for unauthorized roles and 404/403 safely for inaccessible customer records.
- Do not put secrets in source code.
- Do not log passwords or tokens.

If password reset email cannot be integrated within the time limit, document it as an unimplemented extension rather than pretending an email was sent.

---

## 6. Event-Sourced Financial History

Use a lightweight event-driven design for important financial state changes.

Events to record:
- UserCreated
- ProductCreated
- PlanCreated
- QuotationCreated
- QuotationConfirmed
- SubscriptionCreated
- SubscriptionActivated
- SubscriptionPaused
- SubscriptionResumed
- SubscriptionRenewed
- SubscriptionClosed
- InvoiceGenerated
- InvoiceConfirmed
- InvoiceCancelled
- PaymentReceived
- DiscountApplied
- BillingBatchExecuted

### Implementation approach

Do not attempt a distributed event bus or a complex CQRS framework.

For each business operation:
1. Validate the command.
2. Perform the relational state change.
3. Append the corresponding audit event.
4. Commit the state change and event together in one database transaction.

Keep a normal relational read model for frontend queries. The event table is the historical record; the relational tables make the prototype easy to query.

### Event hash design

Canonicalize the event data:
- Stable JSON key ordering.
- Stable date/time formatting.
- Consistent decimal serialization.
- No non-deterministic values in the canonical payload.

Compute:

`event_hash = SHA256(canonical_event_content + previous_hash)`

Canonical event content must include:
- sequence number.
- event UUID.
- aggregate type and ID.
- event type.
- payload.
- actor ID.
- timestamp.
- previous hash.

Genesis hash:

`"0" * 64`

For each new event:
- Read the last committed event hash.
- Assign the next sequence number safely.
- Compute the new event hash.
- Insert the event.
- Commit with the associated business operation.

### Verification API

`POST /api/v1/audit/verify`

Response example:

```json
{
  "valid": true,
  "checked_events": 42,
  "first_invalid_sequence": null,
  "message": "Audit chain verified"
}
```

Tampering response example:

```json
{
  "valid": false,
  "checked_events": 42,
  "first_invalid_sequence": 17,
  "message": "Hash mismatch detected"
}
```

Also provide:
- `GET /api/v1/audit/events`
- `GET /api/v1/subscriptions/{id}/events`

Honest security statement: a hash chain detects modification when compared with a trusted chain head/checkpoint. A privileged attacker who can rewrite every row and recompute the entire chain may evade a database-only check. An external blockchain anchor or independently stored checkpoint strengthens this design.

Optional blockchain extension:
- Compute a batch/checkpoint hash.
- Anchor it to an EVM-compatible testnet only if credentials, network and time are available.
- Store transaction hash and checkpoint metadata.
- Do not make blockchain anchoring a blocker for the prototype.

---

## 7. Subscription Lifecycle

Implement valid state transitions server-side.

Suggested transitions:
- DRAFT → QUOTATION
- QUOTATION → CONFIRMED
- CONFIRMED → ACTIVE
- ACTIVE → PAUSED
- PAUSED → ACTIVE
- ACTIVE → CLOSED
- PAUSED → CLOSED
- ACTIVE → EXPIRED
- ACTIVE → RENEWED / create next term as appropriate

Reject invalid transitions with HTTP 400 and a clear message.

Every successful transition must append an audit event.

Ensure plan settings control whether pause, early close and renewal are permitted.

---

## 8. Billing Engine

### Monetary calculation

For each subscription:
1. Get eligible subscription lines.
2. Calculate quantity × unit price.
3. Add applicable variant surcharge.
4. Apply eligible discount rules.
5. Apply tax according to the agreed calculation order.
6. Calculate final total.
7. Create invoice lines and invoice summary.

Use a consistent documented order, for example:
- Line subtotal.
- Eligible discount.
- Tax on discounted taxable amount.
- Final total.

This is a prototype calculation policy, not a declaration of jurisdiction-wide tax compliance.

### Billing period

Generate a stable billing period key, e.g.:

`2026-10`

For more than monthly billing intervals, use an unambiguous period identifier such as:

`2026-10-01_to_2026-10-07`

### Idempotency

Before invoice creation:
- Build a deterministic idempotency key from subscription ID + billing period.
- Enforce a database unique constraint.
- Create invoice and audit event inside a transaction.
- If the key already exists, return an “already billed” result or the existing invoice.
- Handle concurrent duplicate requests through database constraint errors and rollback safely.

Do not rely only on checking for an existing invoice before insert; two requests can race. The unique constraint is essential.

---

## 9. Billing Day Rehearsal

Implement:

`POST /api/v1/billing/simulate`

Request example:

```json
{
  "billing_period_key": "2026-10"
}
```

Simulation behavior:
1. Query subscriptions due for the period.
2. Exclude paused, closed, expired or not-yet-due subscriptions.
3. Check whether each subscription-period key has already been billed.
4. Calculate invoice preview.
5. Evaluate tax and discount rules.
6. Run deterministic validation.
7. Optionally call anomaly scoring.
8. Return a preview only; do not create invoices or payments.

Example response:

```json
{
  "period": "2026-10",
  "ready_count": 8,
  "skipped_count": 2,
  "blocked_count": 1,
  "expected_total": "84000.00",
  "tax_total": "9000.00",
  "discount_total": "3000.00",
  "items": [],
  "warnings": []
}
```

Implement:

`POST /api/v1/billing/execute`

Execution:
- Require Admin or permitted Staff role.
- Revalidate all subscriptions; do not trust the old simulation result blindly.
- Use idempotency.
- Execute each invoice safely.
- Record invoice and billing events.
- Return generated, skipped and failed results.

The UI should require confirmation before calling this endpoint.

---

## 10. Rule Engine

Create `rule_engine.py`.

Support a small whitelist of conditions:
- quantity
- subtotal
- product_id
- customer region (if available)
- current date
- subscription type

Supported operators:
- eq
- gt
- gte
- lt
- lte
- in

Actions:
- percentage discount.
- fixed discount.
- percentage tax.

Validate rule JSON with Pydantic or an explicit schema. Reject arbitrary expressions, Python evaluation, executable code or unrecognized fields.

For the six-hour prototype, implement two working rule types rather than a general rule-language platform.

---

## 11. Revenue Intelligence

Create `revenue_engine.py`.

Metrics:
- Active subscriptions.
- MRR.
- ARR.
- New MRR.
- Expansion MRR.
- Churned MRR.
- Revenue collected in selected period.
- Outstanding invoice amount.
- Overdue invoice count.
- Churn-risk list.

Monthly normalization:
- Daily = recurring daily amount × 365 / 12.
- Weekly = recurring weekly amount × 52 / 12.
- Monthly = recurring monthly amount.
- Yearly = recurring yearly amount / 12.

Use a clearly documented policy for:
- Paused subscriptions.
- Discounts.
- Taxes.
- Cancellations.
- Partial periods.

Do not double-count one-time charges as recurring revenue.

For the 90-day estimate, use a transparent baseline based on current active MRR and known upcoming renewals/expiries. Label it as an estimate, not a trained prediction.

Endpoints:
- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/analytics/mrr`
- `GET /api/v1/analytics/churn-risk`

---

## 12. Churn and Anomaly Detection

### Mandatory deterministic risk scoring

Example scoring:
- Overdue invoice: +30.
- Paused subscription: +25.
- Repeated failed payment attempts represented in records: +25.
- Expiring within seven days: +20.

Clamp score to 100.

Suggested labels:
- 0–29: Low.
- 30–59: Medium.
- 60–100: High.

Return reasons with every score. Do not return only a number.

### Optional Isolation Forest

Use scikit-learn only after the main billing workflow works.

Potential features:
- Transaction amount.
- Quantity change.
- Discount percentage.
- Historical average amount.
- Billing interval encoded numerically.

Use synthetic records for a demonstration model if no historical dataset exists.

Important:
- Do not claim synthetic training represents real fraud patterns.
- Use model output as a warning.
- Deterministic rules block invalid transactions; ML flags unusual ones for human review.
- If dependency installation or model integration takes too long, skip it and retain the deterministic engine.

---

## 13. Secure LLM Finance Copilot

Create `ai_service.py` and `api/assistant.py`.

Endpoint:
`POST /api/v1/assistant/query`

Request:

```json
{
  "question": "Show overdue invoices above 10000 this month"
}
```

Safe processing:
1. Authenticate user.
2. Determine role and customer scope from server-side identity.
3. Send question to Gemini for intent extraction, not SQL generation.
4. Require structured JSON response.
5. Validate with Pydantic.
6. Whitelist entities, fields, operators and values.
7. Enforce date and result limits.
8. Build ORM query using fixed server-side mappings.
9. Execute read-only query.
10. Return records and a concise explanation.

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

Never:
- Execute model-generated SQL.
- Allow model-generated arbitrary ORM expressions.
- Trust a customer ID from the model.
- Allow chat to perform financial writes.
- Expose Gemini API key to React.
- Return records outside the authenticated user's scope.

Fallback:
- If Gemini API key is missing or API fails, use a few deterministic supported question patterns.
- Return a clear mode indicator such as `mode: "fallback"` so the UI can explain that a limited parser handled the query.

Supported initial intents:
- Filter overdue invoices by amount.
- List subscriptions expiring within a date window.
- Calculate MRR.
- List high-risk subscriptions.
- Calculate outstanding balance.

---

## 14. Security Alerts

Create alerts for:
- Repeated duplicate billing attempts.
- Unauthorized role action.
- Invalid audit chain.
- Unexpected quantity increase.
- Excessive discount.
- Repeated failed payment attempts if represented in demo data.

Each alert should have:
- Severity.
- Type.
- Description.
- Related entity.
- Timestamp.
- Resolved flag.

Do not label a normal validation error as confirmed fraud.

---

## 15. API Contracts for Yogesh

Base URL:
`http://localhost:8000/api/v1`

Send Yogesh sample request and response JSON early.

### Authentication
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/staff`

### Catalog
- `GET /products`
- `POST /products`
- `GET /plans`
- `POST /plans`

### Quotations
- `GET /quotations`
- `POST /quotations`
- `POST /quotations/{id}/transition`

### Subscriptions
- `GET /subscriptions`
- `POST /subscriptions`
- `GET /subscriptions/{id}`
- `POST /subscriptions/{id}/transition`
- `GET /subscriptions/{id}/events`
- `GET /subscriptions/{id}/state-at`

### Billing
- `POST /billing/simulate`
- `POST /billing/execute`
- `GET /invoices`
- `GET /invoices/{id}`
- `POST /invoices/{id}/confirm`
- `POST /invoices/{id}/cancel`

### Payments
- `GET /payments`
- `POST /payments`
- `GET /invoices/{id}/balance`

### Analytics
- `GET /analytics/dashboard`
- `GET /analytics/mrr`
- `GET /analytics/churn-risk`

### Audit
- `GET /audit/events`
- `POST /audit/verify`

### AI
- `POST /assistant/query`

Document exact request and response field names in `docs/API_CONTRACTS.md` or send them directly to Yogesh. Do not change response shapes without telling him.

---

## 16. Demo Seed Data

Create a seed script that is safe to run repeatedly or clearly document how to reset the prototype DB.

Seed:
- Admin user.
- Staff user.
- Customer user.
- 5 fictional customers.
- 4 products.
- 5 plans across daily, weekly, monthly and yearly intervals.
- 8–12 subscriptions with active, paused, closed and expiring statuses.
- 5 invoices including paid, outstanding and overdue.
- 3 payment records.
- 2 discount rules.
- 1 tax rule.

Suggested demo:
- Acme Technologies — Enterprise monthly plan.
- Northstar Retail — yearly plan.
- PixelWorks — monthly plan with add-on.
- One overdue invoice above ₹10,000.
- One paused subscription.
- One subscription expiring soon.
- One unusual quantity increase.

Generate audit events through the same service functions used by the actual application. Do not seed fake hashes disconnected from event content.

Document demo login credentials in README only for local demo use. Never use real passwords.

---

## 17. Six-Hour Task Plan

### Hour 0–1: Foundation
- Initialize FastAPI.
- Configure SQLite and SQLAlchemy.
- Create core database models.
- Add CORS for frontend local development.
- Create authentication and current-user dependency.
- Create audit-ledger service skeleton.
- Send API contracts to Yogesh.

**Deliverable:** Running API, database initialized, login foundation and agreed API shapes.

### Hour 1–2: Core business APIs
- Product and variant CRUD.
- Plan creation/listing.
- Quotation creation and transitions.
- Subscription creation and state transitions.
- Emit audit events for successful changes.
- Provide sample responses to Yogesh.

**Deliverable:** Core subscription workflow works.

### Hour 2–3: Billing and cryptographic integrity
- Invoice calculations.
- Tax and discount rules.
- Idempotency key and database unique constraint.
- Billing simulation.
- Billing execution.
- Payment recording.
- SHA-256 chain generation and verification.

**Deliverable:** A billing run can be simulated and safely executed; audit verification works.

### Hour 3–4: Revenue and risk
- MRR and ARR.
- Revenue collected and outstanding balances.
- Overdue invoice queries.
- Deterministic churn risk.
- Optional Isolation Forest if core tasks are complete.
- Security alert records.

**Deliverable:** Dashboard APIs and risk data work.

### Hour 4–5: AI and integration
- Gemini structured intent extraction.
- Pydantic AST validation.
- Whitelisted ORM query builder.
- RBAC and customer ownership enforcement.
- Deterministic fallback parser.
- Coordinate with Yogesh to fix response mismatches.

**Deliverable:** Secure AI read-only query flow works.

### Hour 5–6: Testing and stabilization
- Test duplicate billing.
- Test invalid state transitions.
- Test hash verification and controlled tampering.
- Test customer isolation.
- Test role permissions.
- Test AI supported questions and fallback.
- Seed predictable demo data.
- Support final end-to-end demo.

**Deliverable:** Stable backend ready for judges.

---

## 18. Critical Tests

### Test 1: Duplicate invoice
1. Execute billing for subscription SUB-101 and period 2026-10.
2. Execute again with the same key.
3. Confirm only one invoice exists.
4. Confirm second request returns existing/duplicate result.

### Test 2: Ledger integrity
1. Create several events through application operations.
2. Run verification.
3. Expect `valid: true`.
4. In a controlled local test, alter one event payload directly.
5. Run verification.
6. Expect `valid: false` and the invalid sequence.
7. Reset demo database afterward.

### Test 3: Customer isolation
1. Log in as Customer A.
2. Request Customer B's invoice ID.
3. Confirm access is denied.
4. Confirm list endpoint only returns Customer A's invoices.

### Test 4: Role permissions
- Customer cannot create products.
- Customer cannot execute billing.
- Staff cannot create staff users.
- Admin can access authorized management actions.

### Test 5: AI query validation
- Valid invoice query returns filtered results.
- Unknown field is rejected.
- Unsupported operator is rejected.
- Customer query is scoped to their records.
- Model output containing SQL is never executed.

### Test 6: Financial consistency
- Quantity × unit price is correct.
- Discount is applied once.
- Tax uses the agreed calculation order.
- Partial payment leaves a balance.
- Invoice becomes Paid only when fully allocated.

---

## 19. Git and Team Coordination

Suggested branch:
`feature/backend-kirthi`

Coordination rules:
1. Share API contracts with Yogesh in the first 30 minutes.
2. Keep frontend/backend response shapes stable.
3. Commit small working changes.
4. Do not rename shared fields without agreement.
5. Tell Yogesh when an endpoint is ready.
6. Keep a runnable backend at every milestone.
7. Do not spend time on optional blockchain anchoring before billing, idempotency and audit verification work.
8. If behind schedule, skip Isolation Forest and testnet anchoring first.

---

## 20. Backend Acceptance Checklist

- [ ] FastAPI starts successfully.
- [ ] Database tables initialize.
- [ ] Demo seed data is available.
- [ ] Passwords are securely hashed.
- [ ] JWT authentication works.
- [ ] Admin, Staff and Customer roles are enforced.
- [ ] Customer data is scoped to authenticated customer.
- [ ] Product and variant APIs work.
- [ ] Odoo variant adds ₹560 to base price.
- [ ] Plans support daily, weekly, monthly and yearly.
- [ ] Quotations support valid transitions.
- [ ] Subscriptions support lifecycle transitions.
- [ ] Important operations append audit events.
- [ ] Invoice calculation is correct.
- [ ] Tax and discount rules work.
- [ ] Billing simulation does not create invoices.
- [ ] Billing execution creates invoices.
- [ ] Duplicate billing is prevented by a database constraint.
- [ ] Payments update invoice balances.
- [ ] MRR and ARR are calculated.
- [ ] Churn risk returns explainable reasons.
- [ ] Audit chain verifies successfully.
- [ ] Controlled tampering is detected.
- [ ] AI AST is validated and allowlisted.
- [ ] No model-generated SQL is executed.
- [ ] Gemini failure has a safe fallback.
- [ ] API contracts are shared with Yogesh.

---

## 21. Final Demo Responsibilities

Kirthi should explain the technical differentiators:
1. Event-driven financial history.
2. SHA-256 hash-chain mechanism.
3. Duplicate-billing protection.
4. Billing rehearsal validation.
5. Secure LLM query pipeline.
6. Revenue intelligence and anomaly warnings.

During the live demo:
- Explain that the event ledger is tamper-evident.
- Show successful integrity verification.
- Show the controlled tampering test.
- Demonstrate that duplicate billing is blocked.
- Explain why the LLM cannot execute SQL.
- Distinguish deterministic rules from optional ML warnings.

Do not claim production-grade immutability, real-world fraud accuracy, legal tax compliance or million-record performance unless those properties have actually been implemented and measured.

**Your focus:** Make SubSecure AI's financial operations correct, safe, explainable and verifiable.
