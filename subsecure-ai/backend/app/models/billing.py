from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base
import enum


class BillingRunStatus(str, enum.Enum):
    SIMULATED = "SIMULATED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"


class BillingRun(Base):
    __tablename__ = "billing_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    billing_period_key: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    status: Mapped[BillingRunStatus] = mapped_column(Enum(BillingRunStatus), nullable=False)
    eligible_count: Mapped[int] = mapped_column(Integer, default=0)
    ready_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    blocked_count: Mapped[int] = mapped_column(Integer, default=0)
    expected_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    discount_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class BillingIdempotency(Base):
    """Unique (subscription, billing period) keys for duplicate-billing prevention."""

    __tablename__ = "billing_idempotency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id"), nullable=False)
    billing_period_key: Mapped[str] = mapped_column(String(60), nullable=False)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
