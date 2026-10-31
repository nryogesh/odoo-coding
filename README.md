# SubSecure AI

### Intelligent Subscription Management & Billing Platform

**SubSecure AI** is a subscription management platform designed to help businesses manage the complete subscription lifecycle—from products and plans to quotations, recurring billing simulation and execution, invoices, payments, revenue analytics, and tamper-evident audit history.

Rewritten as a React application with a client-side business engine running on Vite.

---

## Key Features

- **Subscription Lifecycle Management**: Create subscriptions, manage status transitions (Draft → Confirmed → Active → Paused / Renewed / Closed), enforce plan lifecycle rules, and inspect event histories.
- **Billing Day Rehearsal (Simulation)**: Rehearse a billing period before generating invoices. Previews eligible subscriptions, calculates line items, GST 18% taxes, enterprise and loyalty discounts, and flags anomalies.
- **Duplicate Billing Protection**: Idempotency checks prevent duplicate invoices for the same subscription and billing period.
- **Invoices & Payment Reconciliation**: Real-time balance calculations, partial payment tracking, overpayment rejection, and automatic status updates.
- **Revenue Intelligence**: Calculates active MRR, ARR, new MRR, expansion MRR, churned MRR, collected revenue, outstanding balances, overdue invoice counts, and baseline 90-day forecasts.
- **Tamper-Evident SHA-256 Audit Ledger**: Every key operational event is cryptographically hash-chained (`event_hash = SHA256(canonical(content) + previous_hash)`). Includes an interactive ledger verification tool that recomputes all hashes from genesis.
- **AI Finance Copilot**: Natural language question assistant for finance and subscription queries with customer scoping.
- **Role-Based Access Control & Portals**: Supports Admin, Staff, and Customer accounts with automatic navigation and customer-scoped data isolation.

---

## Demo Accounts

The application includes pre-seeded demo accounts:

| Role | Email | Password | Scope |
| --- | --- | --- | --- |
| **Admin** | `admin@brightloop.io` | `Admin@12345` | Full administrative access |
| **Staff** | `staff@brightloop.io` | `Staff@12345` | Subscription & billing management |
| **Customer** | `customer@acme.io` | `Customer@12345` | Customer portal (Acme Technologies) |

Click any of the quick-login buttons on the login screen to sign in instantly.

---

## Technology Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Cryptography**: SHA-256 hash chaining with deterministic canonical JSON
