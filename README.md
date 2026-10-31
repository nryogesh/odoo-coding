# SubSecure AI

### Intelligent Subscription Management & Billing Platform

**SubSecure AI** is a subscription-management platform designed to help
businesses manage the complete subscription lifecycle---from products
and plans to quotations, recurring billing, invoices, payments, and
revenue analytics.

The project follows a **billing-engine-first architecture**: financial
calculations and important state changes are handled by backend
services, while an event-oriented audit ledger records key operations. A
React frontend communicates with the backend through REST APIs.

------------------------------------------------------------------------

## Table of Contents

-   [Key Features](#key-features)
-   [Technology Stack](#technology-stack)
-   [Architecture](#architecture)
-   [Application Modules](#application-modules)
-   [Core Workflows](#core-workflows)
-   [Security and Reliability](#security-and-reliability)
-   [Project Structure](#project-structure)
-   [Getting Started](#getting-started)
-   [Environment Configuration](#environment-configuration)
-   [Demo Accounts](#demo-accounts)
-   [Testing](#testing)
-   [Current Implementation Status](#current-implementation-status)
-   [Limitations and Future
    Improvements](#limitations-and-future-improvements)

------------------------------------------------------------------------

## Key Features

-   **Subscription lifecycle management** -- Create subscriptions,
    manage their status, apply lifecycle rules, and track billing dates.
-   **Billing Day Rehearsal** -- Preview a billing period before
    creating invoices. Review eligible subscriptions, expected totals,
    taxes, discounts, warnings, and skipped items.
-   **Recurring billing engine** -- Generate invoices for subscriptions
    due in a selected billing period.
-   **Duplicate billing protection** -- Use database-level uniqueness
    and idempotency records to prevent duplicate invoices for the same
    subscription and billing period.
-   **Invoice and payment management** -- Track invoice totals, partial
    payments, outstanding balances, and payment status.
-   **Revenue intelligence** -- Calculate MRR, ARR, collected revenue,
    outstanding revenue, overdue amounts, and churn-risk indicators.
-   **Tamper-evident audit ledger** -- Link audit events using SHA-256
    hashes and verify the integrity of the event chain.
-   **AI Finance Copilot** -- Ask supported finance questions in natural
    language. The backend uses constrained structured queries and fixed
    ORM query builders rather than executing model-generated SQL.
-   **Role-based access control** -- Support Admin, Staff, and Customer
    roles, with customer data scoped on the backend.
-   **Customer portal** -- Allow customers to view their own
    subscriptions, invoices, payments, and balances.

## Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technologies
  ----------------------------------- -----------------------------------
  Frontend                            React 18, React Router, Vite

  Styling                             Tailwind CSS, PostCSS

  Charts and visualisation            Recharts

  Icons                               lucide-react

  Backend                             Python, FastAPI, Uvicorn

  Validation                          Pydantic v2

  ORM                                 SQLAlchemy 2

  Database                            SQLite

  Authentication                      JWT (PyJWT)

  Password hashing                    bcrypt via Passlib/bcrypt

  AI integration                      Google Gemini API (optional),
                                      deterministic fallback

  Testing                             pytest, FastAPI TestClient, Node
                                      test runner
  -----------------------------------------------------------------------

## Architecture

``` text
┌─────────────────────────────────────────────┐
│           React + Vite Frontend              │
│                                             │
│ Dashboard · Products · Plans · Quotations  │
│ Subscriptions · Billing · Invoices         │
│ Payments · Audit · Customer Portal · AI    │
└──────────────────────┬──────────────────────┘
                       │ REST API / JSON
                       ▼
┌─────────────────────────────────────────────┐
│              FastAPI Backend                │
│                                             │
│ Authentication & RBAC                       │
│ Subscription & Quotation Services           │
│ Billing & Invoice Engine                    │
│ Payment & Reconciliation                    │
│ Revenue Analytics & Anomaly Indicators      │
│ Audit Ledger & AI Finance Assistant         │
└──────────────────────┬──────────────────────┘
                       │ SQLAlchemy
                       ▼
┌─────────────────────────────────────────────┐
│                 SQLite                      │
│ Users · Customers · Products · Plans        │
│ Subscriptions · Invoices · Payments         │
│ Billing Idempotency · Audit Events          │
└─────────────────────────────────────────────┘
```

## Application Modules

  -----------------------------------------------------------------------
  Module                              Description
  ----------------------------------- -----------------------------------
  Authentication                      Registration, login, current-user
                                      lookup, JWT validation, and role
                                      checks.

  Dashboard                           Displays subscription and financial
                                      KPIs, activity, and churn
                                      indicators.

  Products                            Manage products, variants, and
                                      pricing information.

  Plans                               Configure recurring prices, billing
                                      intervals, minimum quantities, and
                                      lifecycle permissions.

  Quotations                          Create quotations, calculate totals
                                      on the server, and manage quotation
                                      transitions.

  Subscriptions                       Create and manage subscriptions,
                                      lifecycle transitions, event
                                      history, and state-at-time views.

  Billing Day Rehearsal               Simulate billing and preview
                                      totals, eligible items, warnings,
                                      and skipped subscriptions.

  Billing Execution                   Revalidate and execute billing
                                      runs, create invoices, and record
                                      idempotency information.

  Invoices                            View invoice details, line items,
                                      taxes, discounts, paid amounts, and
                                      outstanding balances.

  Payments                            Record payments and reconcile
                                      partial or full invoice balances.

  Audit & Security Center             View audit events, hash-chain
                                      information, verification results,
                                      and security alerts.

  AI Finance Copilot                  Submit supported finance questions
                                      and view structured results.

  Customer Portal                     Show customers only their own
                                      subscription, invoice, and payment
                                      information.

  Analytics                           Calculate MRR, ARR, collected
                                      revenue, outstanding amounts,
                                      overdue amounts, and risk
                                      indicators.
  -----------------------------------------------------------------------

## Core Workflows

### 1. Product and plan setup

1.  An administrator signs in.
2.  The administrator creates a product and, where applicable, its
    variants.
3.  A subscription plan is configured with pricing, billing interval,
    minimum quantity, and lifecycle settings.
4.  The backend validates and stores the records.

### 2. Quotation to subscription

1.  A quotation is created for a customer with product lines.
2.  The backend calculates subtotal, discounts, taxes, and total.
3.  The quotation moves through its permitted lifecycle transitions.
4.  An eligible quotation can be converted into a subscription.
5.  The subscription service sets billing dates and records lifecycle
    events.

### 3. Billing simulation and execution

1.  A billing period is submitted to the billing simulation endpoint.
2.  The engine checks subscription status, due dates, expiry, lines, and
    previous billing records.
3.  It calculates expected invoice amounts and reports warnings or
    skipped items.
4.  The user reviews the preview before execution.
5.  On confirmation, the backend revalidates eligibility and creates
    invoices within transaction scopes.
6.  Idempotency records and database constraints prevent a second
    invoice for the same subscription and billing period.

**Simulation is a preview:** it does not create invoices.

### 4. Payment and reconciliation

1.  A payment is recorded against an invoice.
2.  The backend calculates the total paid amount and remaining balance.
3.  Partial payments leave the invoice partially paid or outstanding.
4.  Overpayments are rejected.
5.  The invoice is marked paid only when the full amount is covered.

### 5. Audit verification

1.  Important financial and lifecycle operations append audit events.
2.  Each event stores its own hash and the previous event's hash.
3.  The Audit Center displays the event history.
4.  The verification endpoint checks sequence ordering, previous-hash
    links, and recomputed hashes.
5.  A modified event or broken link can be detected.

### 6. AI Finance Copilot

1.  A user submits a finance question.
2.  If configured and available, Gemini can translate the question into
    a constrained structured query.
3.  The backend validates the query against allowlists.
4.  Fixed ORM query builders execute the request with role and customer
    scope.
5.  If Gemini is unavailable, supported questions can be answered
    through a deterministic fallback.

The assistant is read-only: it does not create invoices, collect
payments, or modify financial records.

## Security and Reliability

-   Passwords are stored as bcrypt hashes.
-   Protected API routes validate JWTs and reject inactive users.
-   Backend role checks enforce Admin, Staff, and Customer permissions.
-   Only an administrator can create staff accounts.
-   Customer records are scoped using the authenticated user's customer
    association.
-   AI query representations use allowlists for entities, fields,
    operators, periods, and limits.
-   AI output is not executed as SQL or Python.
-   Billing uses database-level uniqueness and idempotency records to
    reduce duplicate invoice risk.
-   Financial calculations are performed by backend services rather than
    trusting frontend totals.
-   Audit events are connected through a SHA-256 hash chain.

## Project Structure

The repository is organised into separate frontend and backend
applications:

``` text
project-root/
├── subsecure-ai/
│   └── backend/
│       ├── app/
│       │   ├── api/          # FastAPI route modules
│       │   ├── models/       # SQLAlchemy models
│       │   ├── schemas/      # Pydantic schemas
│       │   ├── security/     # Authentication and access control
│       │   ├── services/     # Billing, audit, revenue, AI services
│       │   └── ...
│       ├── tests/            # Backend tests
│       ├── requirements.txt
│       └── ...
└── subsecure-frontend/
    ├── src/
    │   ├── pages/            # Application pages
    │   ├── services/         # API and service integrations
    │   ├── components/       # Reusable UI components
    │   └── ...
    ├── tests/
    ├── package.json
    └── ...
```

*The exact folder names may vary slightly depending on the checked-out
repository version.*

## Getting Started

### Prerequisites

-   Python 3.10 or later
-   Node.js and npm
-   Git

### 1. Clone the repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

### 2. Set up the backend

Open a terminal:

``` powershell
cd subsecure-ai/backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit the `.env` file and configure the required environment variables.
Then initialise demo data and start the API:

``` powershell
python -m app.seed.seed_demo
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend health endpoint is:

``` text
http://localhost:8000/health
```

Interactive API documentation:

``` text
http://localhost:8000/docs
```

### 3. Set up the frontend

Open a second terminal:

``` powershell
cd subsecure-frontend

npm install
Copy-Item .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the application at:

``` text
http://localhost:5173
```

The Vite development proxy forwards `/api` requests to the backend at
`http://localhost:8000`.

## Environment Configuration

Configure secrets and service settings in the backend `.env` file. Use
the variable names provided by the repository's `.env.example`.

Typical configuration includes:

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `DATABASE_URL`                      SQLAlchemy database connection
                                      string. Defaults to a local SQLite
                                      database.

  `JWT_SECRET`                        Secret used to sign and validate
                                      JWTs. Use a strong random value.

  `CORS_ORIGINS`                      Allowed frontend origins.

  `GEMINI_API_KEY`                    Optional key for live Gemini
                                      integration.
  -----------------------------------------------------------------------

For the frontend, configure `VITE_API_BASE_URL` if the API is not
accessed through the default `/api/v1` proxy path.

**Never commit real API keys, database credentials, or production
secrets to Git.** Use a strong `JWT_SECRET` outside local development.

## Demo Accounts

The local seed script provides the following demo accounts:

  Role       Email                   Password
  ---------- ----------------------- ------------------
  Admin      `admin@brightloop.io`   `Admin@12345`
  Staff      `staff@brightloop.io`   `Staff@12345`
  Customer   `customer@acme.io`      `Customer@12345`

These credentials are for local demonstration only. Change or remove
them before any shared or production deployment.

## Testing

### Backend tests

``` powershell
cd subsecure-ai/backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

The implementation audit recorded **35 backend tests passing**. Coverage
includes authentication, role permissions, customer isolation, billing,
duplicate prevention, audit-chain verification, AI
fallback/allowlisting, and regression cases.

### Frontend tests

``` bash
cd subsecure-frontend
npm test
```

The implementation audit recorded **1 frontend smoke test passing**.
This is a limited smoke test, not comprehensive component or end-to-end
coverage.

### Production build

``` bash
npm run build
```

The implementation audit recorded a successful Vite production build.

## Current Implementation Status

The following status reflects the implementation audit, not a claim that
every workflow has been fully acceptance-tested.

### Implemented and evidenced

-   FastAPI startup, SQLite initialisation, and health endpoint.
-   Password hashing, JWT authentication, and backend role checks.
-   Customer-scoped access to subscriptions, invoices, and payments.
-   Product, variant, plan, quotation, and subscription backend
    operations.
-   Server-side quotation calculations.
-   Billing simulation and transaction-scoped invoice generation.
-   Database-level duplicate billing protection.
-   Partial-payment balance calculation and overpayment rejection.
-   SHA-256 audit ledger and verification endpoint.
-   Structured JSON rule validation.
-   MRR, ARR, collected, outstanding, and overdue metrics.
-   Deterministic churn/anomaly indicators.
-   Frontend API integration for the main application modules.
-   Deterministic AI fallback with restricted ORM query execution.

### Partially implemented or requiring further verification

-   Live Gemini mode requires a valid `GEMINI_API_KEY` and has not been
    verified in the audit.
-   The optional Isolation Forest path requires a dependency review;
    scikit-learn was not listed in the inspected requirements file.
-   There is no distinct staff-specific dashboard experience.
-   The revenue-trend chart does not currently have a populated backend
    data series.
-   Rule management does not have a complete authoring UI/CRUD workflow.
-   A complete security-alert resolution workflow was not identified.
-   Full browser-based billing execution was not manually completed
    during the audit.
-   Frontend automated test coverage is minimal.
-   Multi-worker concurrency and load testing have not been completed.

### Not included in the current prototype

-   External payment gateway integration and payment webhooks.
-   Email delivery and password reset.
-   External blockchain or ledger anchoring.
-   Production deployment infrastructure and managed database
    migrations.
-   Comprehensive frontend end-to-end testing.

## Limitations and Future Improvements

1.  Add a complete password-reset and email-delivery workflow.
2.  Add a dedicated staff dashboard and complete staff-specific
    workflows.
3.  Build administration screens for creating and managing tax and
    discount rules.
4.  Add a populated revenue-trend API and complete reporting views.
5.  Add a security-alert resolution workflow.
6.  Add comprehensive frontend and end-to-end tests.
7.  Perform concurrency and load testing, including the problem
    statement's 5,000+ subscription scenario and sub-two-second response
    target.
8.  Configure and verify live Gemini integration if it is required for
    the demonstration.
9.  Integrate a real payment provider and webhook handling.
10. Prepare production configuration, database migrations, deployment,
    and secret management.

------------------------------------------------------------------------

## Project Goal

SubSecure AI aims to make subscription operations more reliable and
transparent by combining recurring billing, financial reconciliation,
revenue intelligence, role-based access, and verifiable audit history in
one platform.

**Built with React, FastAPI, SQLAlchemy, and SQLite.**
