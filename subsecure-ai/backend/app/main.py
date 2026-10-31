from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    analytics,
    assistant,
    audit,
    auth,
    billing,
    customers,
    invoices,
    payments,
    plans,
    products,
    quotations,
    subscriptions,
    users,
)
from .config import get_settings
from .database import init_db

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SubSecure AI",
    description="Intelligent, secure, cryptographically verifiable subscription & recurring-billing platform for Brightloop Software.",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


for router in (
    auth.router,
    users.router,
    products.router,
    plans.router,
    quotations.router,
    subscriptions.router,
    invoices.router,
    payments.router,
    billing.router,
    analytics.router,
    audit.router,
    assistant.router,
    customers.router,
):
    app.include_router(router, prefix="/api/v1")
