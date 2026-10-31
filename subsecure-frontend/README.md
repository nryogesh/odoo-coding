# SubSecure AI — Frontend

React + Vite + Tailwind CSS frontend for the SubSecure AI subscription management platform.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on http://localhost:5173 and proxies `/api` to the FastAPI backend on http://localhost:8000.

Optional: create `frontend/.env` from `.env.example` to point at a different backend.

## Roles

- **Admin / Staff** — full management UI (dashboard, products, plans, quotations, subscriptions, invoices, payments, billing simulator, audit center, AI copilot, customers).
- **Customer** — scoped portal showing only their own subscriptions, invoices and payments.

All data comes from the FastAPI backend; there is no mock data. Auth token is stored in `localStorage` (hackathon prototype — documented risk, no passwords stored).
