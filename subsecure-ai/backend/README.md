# SubSecure AI — Backend (Kirthi's workstream)

Intelligent, secure and cryptographically verifiable subscription & recurring-billing
platform for **Brightloop Software** (Odoo Hackathon prototype).

- **Backend:** Python 3.11+ · FastAPI · SQLAlchemy · SQLite (prototype) · Pydantic · JWT · bcrypt
- **Frontend:** React + Vite + Tailwind (owned by Yogesh — see `docs/API_CONTRACTS.md`)

## Quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then edit values
python -m app.seed.seed_demo     # seed demo data (safe to re-run)
uvicorn app.main:app --reload    # http://localhost:8000  (docs at /docs)
```

Reset demo data: delete `backend/subsecure.db` and re-run the seed command.

## Environment variables (`.env`, never committed)

```env
DATABASE_URL=sqlite:///./subsecure.db
JWT_SECRET=replace-with-a-long-random-secret
APP_ENV=development                  # staging/production requires a random JWT_SECRET >= 32 chars
GEMINI_API_KEY=                  # optional — AI copilot falls back to a deterministic parser when empty
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Demo logins (local demo only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.io | Admin@12345 |
| Staff | staff@brightloop.io | Staff@12345 |
| Customer (Acme) | customer@acme.io | Customer@12345 |

## Tests

```bash
cd backend
python -m pytest tests/ -q
```

Covers: duplicate-invoice prevention, SHA-256 chain verification + controlled
tampering, customer data isolation, role permissions, AI allowlist validation,
financial consistency (partial payments, tax/discount order), dry-run
immutability, customer-scoped AI MRR and production JWT-secret validation.

## What is genuinely implemented

- JWT auth, bcrypt hashing, password policy, Admin/Staff/Customer RBAC,
  customer data scoping enforced server-side on every endpoint.
- Products + variants (Odoo variant adds ₹560 to ₹5,000 base), plans
  (daily/weekly/monthly/yearly), quotations with validated transitions,
  subscription lifecycle with plan-gated pause/renew/close.
- Billing Day Rehearsal (`/billing/simulate`, strictly read-only) and confirmed
  execution (`/billing/execute`) with per-invoice transaction isolation.
- Duplicate-billing prevention via DB unique constraints on
  `(subscription_id, billing_period_key)` and the idempotency-key table;
  retries return the existing invoice as `DUPLICATE`.
- SHA-256 hash-chained append-only audit ledger with verification API and
  first-invalid-sequence reporting; single-subscription time travel
  (`/subscriptions/{id}/state-at`).
- Revenue intelligence: MRR/ARR/new/expansion/churned MRR, collected &
  outstanding revenue, overdue counts, baseline 90-day estimate
  (labelled estimate, not a trained forecast).
- Deterministic churn-risk scoring with explainable reasons; optional
  Isolation Forest *warnings* (never blocks transactions).
- Secure AI copilot: Gemini intent extraction (backend-only key) → strict
  Pydantic AST → whitelist enforcement → fixed ORM builders. No
  model-generated SQL, read-only, customer-scoped. Deterministic fallback
  parser with `mode: "fallback"` indicator.

## Honest limitations (prototype scope)

- The hash chain is **tamper-evident**, not absolutely immutable: a privileged
  attacker who can rewrite every row and recompute the chain can evade a
  database-only check. External checkpoint anchoring is a documented extension,
  not implemented.
- Tax is a simple configurable percentage rule — **not** GST/jurisdictional
  compliance.
- Payments are simulated entries — no real payment gateway is connected.
- Password reset email is not implemented (no email provider integrated).
- The Isolation Forest trains on the prototype's own small dataset; its output
  is a warning for human review, not fraud detection.
