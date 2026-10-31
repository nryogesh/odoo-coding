# SubSecure AI

### Intelligent, Secure & Tamper-Evident Subscription Management

SubSecure AI is a prototype subscription and recurring-revenue
management platform. It is designed to simplify subscription operations
while improving billing reliability, financial visibility and
auditability.

Our approach puts the **billing engine and financial event history at
the centre of the system**. Instead of building only CRUD screens, the
platform combines subscription lifecycle management, safe recurring
billing, tamper-evident audit records, revenue intelligence and a
controlled AI finance assistant.

> **Project status:** Hackathon prototype. External payment processing,
> production GST compliance, email delivery and external blockchain
> anchoring must not be presented as completed unless they have actually
> been integrated and tested.

## 1. Problem Statement

Subscription platforms must coordinate products, plans, customers,
quotations, recurring invoices, discounts, taxes, payments and revenue
reports. These processes need to remain consistent even when billing
jobs are retried or financial records are updated.

A basic CRUD application may show the latest subscription status, but it
may not explain the sequence of actions that produced it. Repeated
billing jobs can also result in duplicate invoices if execution is not
protected.

SubSecure AI addresses these challenges through an event-oriented
approach, idempotent billing, audit verification and revenue
intelligence.

## 2. Our Approach

### 2.1 Billing-engine-first design

The billing workflow is treated as a core business capability. The
platform supports recurring plans and a subscription lifecycle:

`Draft → Quotation → Confirmed → Active → Closed`

Additional lifecycle actions such as pause, renewal and expiry are
supported where implemented.

A billing rehearsal or dry-run previews the invoices before execution.
Invoice generation uses an idempotency strategy so that repeating a
billing operation does not create another invoice for the same
subscription and billing period.

### 2.2 Event-oriented financial history

Important business actions are represented as events, such as:

-   Subscription created or updated.
-   Quotation confirmed.
-   Invoice generated.
-   Payment received.
-   Discount applied.
-   Subscription paused or closed.

This provides a history of how financial records changed, rather than
relying only on the latest state. Event history can coexist with
relational models and read-oriented views used by normal screens and
reports.

### 2.3 Tamper-evident audit ledger

Ledger events are linked using a SHA-256 hash chain. Each event hash
incorporates the event data and the previous event hash:

`H(n) = SHA256(Event(n) + H(n-1))`

A verification process can detect changes to recorded events because the
chain no longer matches.

**Important:** A hash chain is tamper-evident, not automatically
immutable. An attacker with sufficient access could potentially rewrite
the complete chain. External anchoring can strengthen the design, but
must only be described as implemented if an external anchoring service
has actually been integrated.

### 2.4 Safe and repeatable billing

Recurring billing uses: - A stable idempotency key based on subscription
and billing period. - Database uniqueness protection where applicable. -
Transactional invoice creation. - Validation of payment amounts and
outstanding balances. - Explicit handling of partial payments and
overpayments.

The goal is to prevent duplicate invoices and maintain consistent
balances.

### 2.5 Revenue intelligence

The platform aims to provide visibility into: - Active subscriptions. -
Collected revenue. - Outstanding and overdue amounts. - Monthly
Recurring Revenue (MRR). - Annual Recurring Revenue (ARR). -
Subscription growth and churn indicators. - Forecasts and risk signals
where supported by available data.

Recurring plan values are normalized to a monthly basis for MRR
calculations. For example, an annual plan value is divided by 12.

### 2.6 Controlled AI finance assistant

The AI assistant is designed to answer natural-language questions about
permitted business data, for example: - "How much revenue was collected
this month?" - "Which invoices are overdue?" - "How many subscriptions
are active?"

The safe-query flow is:

`Natural language → Structured query → Allowlist validation → Role and scope checks → Database query → Answer`

The model must not receive unrestricted database access, execute
arbitrary SQL or perform financial writes directly. The backend
validates requested fields, operators and user permissions before
retrieving data.

Gemini integration requires a valid API key. If the external AI service
is not configured, the application may use its documented fallback
behaviour.

### 2.7 Configurable rules

A rule-based approach supports conditions such as discounts and
percentage-based tax calculations. Rules use approved fields and
operators rather than executing arbitrary code. Prototype
percentage-based tax logic should not be treated as full statutory GST
compliance.

## 3. High-Level Architecture

``` text
              React Frontend (Vite + Tailwind)
                           |
                        REST API
                           |
                  FastAPI Backend
             Authentication, RBAC, Validation
                           |
        +------------------+------------------+
        |                  |                  |
  Subscription         Billing &          Revenue
    Services          Payment Engine     Intelligence
        |                  |                  |
        +------------------+------------------+
                           |
                  SQLite + SQLAlchemy
                   Business Data/Events
                           |
                 SHA-256 Audit Verification

           Optional integrations: Gemini API,
                 ML anomaly detection
```

The frontend communicates with the backend through REST APIs. The
backend owns authentication, authorization, validation, billing
calculations and database operations. AI requests are mediated by the
backend.

## 4. Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React, Vite             User interface

  Styling                 Tailwind CSS            Responsive UI

  Backend                 Python, FastAPI         REST API and business
                                                  logic

  Database                SQLite, SQLAlchemy      Prototype persistence
                                                  and ORM

  Validation              Pydantic                Request and response
                                                  validation

  Authentication          Password hashing, JWT   Authentication and
                                                  authorization

  Audit                   SHA-256                 Tamper-evident event
                                                  verification

  AI                      Gemini API (optional)   Natural-language
                                                  finance queries

  ML                      scikit-learn (optional) Anomaly detection
                                                  experiments

  Testing                 pytest                  Backend testing
  -----------------------------------------------------------------------

The stack is intentionally lightweight for hackathon development and
demonstration.

## 5. Core Modules

1.  **Authentication and roles** --- Admin, Staff and Customer access
    with backend-enforced permissions.
2.  **Products and plans** --- Product catalogue and recurring billing
    intervals.
3.  **Quotations and subscriptions** --- Subscription creation and
    lifecycle management.
4.  **Billing engine** --- Invoice generation, billing rehearsal and
    duplicate-run protection.
5.  **Payments** --- Payment recording, partial-payment handling and
    balance reconciliation.
6.  **Audit ledger** --- Event history and hash-chain verification.
7.  **Revenue dashboard** --- Subscription, collection, outstanding and
    recurring-revenue metrics.
8.  **Risk indicators** --- Signals for potentially unusual or at-risk
    subscriptions.
9.  **AI finance assistant** --- Controlled natural-language access to
    permitted financial information.
10. **Customer portal** --- Customer access to their own subscriptions,
    invoices and payment information.

The actual completion status of each module should be verified against
the current source code and tests.

## 6. Security and Reliability Principles

-   Enforce permissions in backend endpoints, not only by hiding
    frontend controls.
-   Restrict customers to their own records.
-   Hash passwords; never store plaintext passwords.
-   Keep API keys in environment variables and out of source control.
-   Validate and constrain AI-generated query structures.
-   Use parameterized ORM/database operations.
-   Protect recurring invoice creation with idempotency and database
    constraints.
-   Validate payment amounts and reject invalid overpayments.
-   Use transactions for financial operations.
-   Treat audit verification as tamper detection, not proof of absolute
    immutability.
-   Do not claim external payment, email or blockchain capabilities
    unless integrated and tested.

## 7. Running the Project

The following commands reflect the expected backend setup. Run them from
the project root and adjust paths if the repository structure differs.

``` bash
cd backend
pip install -r requirements.txt
cp .env.example .env

# Seed demo data only if you are not using the included database
python -m app.seed.seed_demo

# Start the API
uvicorn app.main:app --reload
```

FastAPI documentation is normally available at
`http://localhost:8000/docs`.

Run backend tests:

``` bash
pytest tests/ -q
```

Start the frontend in a separate terminal using the commands in its
`package.json` (commonly `npm install` followed by `npm run dev`).

### Environment variables

Configure the variables documented in `.env.example`. Gemini
functionality requires a valid `GEMINI_API_KEY`. Never commit real
credentials to the repository.

### Demo accounts

Use the demo accounts documented in the project setup notes if the
seeded database and credentials are present. Change demo passwords
before any non-demo deployment.

## 8. Testing and Verification

Important scenarios to validate include:

-   Repeated billing attempts do not create duplicate invoices.
-   Ledger verification detects controlled changes to recorded events.
-   Customers cannot access another customer's records.
-   Staff cannot perform Admin-only actions.
-   Discounts and tax are applied in the correct order.
-   Partial payments preserve the correct outstanding balance.
-   An invoice is marked paid only when its balance is fully covered.
-   Invalid overpayments are rejected.
-   Unsupported AI fields and operators are rejected.
-   AI queries respect role permissions and customer data scope.

Only report test counts and successful scenarios that have actually been
run against the current codebase.

## 9. Prototype Scope and Limitations

SubSecure AI is a hackathon prototype. Potential limitations to disclose
unless subsequently implemented and verified:

-   No real email delivery or password-reset email service.
-   No live payment gateway; payment entries may be simulated.
-   Percentage-based prototype tax rules are not equivalent to GST
    compliance.
-   SHA-256 chaining detects tampering but does not independently
    guarantee immutability.
-   External blockchain anchoring is an extension unless actually
    connected.
-   Gemini functionality depends on a configured API key; fallback
    behaviour may be available.
-   ML anomaly detection is an indicator, not proof of fraud.
-   SQLite is suitable for a prototype but may need a production
    database and deployment architecture at larger scale.

## 10. Future Enhancements

-   Integrate a real payment gateway and verified payment webhooks.
-   Add email notifications and secure password-reset flows.
-   Implement compliant tax configuration and invoice requirements for
    target jurisdictions.
-   Anchor periodic ledger checkpoints to an external trusted system.
-   Add production-grade scheduling, retries, monitoring and billing
    reconciliation.
-   Evaluate anomaly detection using representative, validated datasets.
-   Move to a production database and add load/performance testing.
-   Add stronger observability, backups and operational controls.

## 11. Project Vision

SubSecure AI aims to make subscription management more than a system
that creates plans and invoices. It combines a reliable billing
workflow, explainable financial history, tamper-evident audit records
and accessible revenue intelligence.

**Our central idea: every financial action should be traceable, every
billing run should be safe to repeat, and every business insight should
be permission-controlled.**
