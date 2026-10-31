from decimal import Decimal

from pydantic import BaseModel


class BillingSimulateRequest(BaseModel):
    billing_period_key: str | None = None  # default: current month "YYYY-MM"


class BillingItemPreview(BaseModel):
    subscription_id: int
    subscription_number: str
    customer_id: int
    status: str  # READY / SKIPPED / BLOCKED
    reason: str | None = None
    subtotal: Decimal | None = None
    discount_total: Decimal | None = None
    tax_total: Decimal | None = None
    total: Decimal | None = None
    anomaly_flags: list[str] = []


class BillingSimulationResponse(BaseModel):
    period: str
    eligible_count: int
    ready_count: int
    skipped_count: int
    blocked_count: int
    expected_total: Decimal
    tax_total: Decimal
    discount_total: Decimal
    items: list[BillingItemPreview]
    warnings: list[str]
    dry_run: bool = True


class BillingExecuteRequest(BaseModel):
    billing_period_key: str | None = None
    confirm: bool = False  # explicit confirmation required


class BillingExecuteItem(BaseModel):
    subscription_id: int
    subscription_number: str
    result: str  # GENERATED / DUPLICATE / FAILED
    invoice_id: int | None = None
    invoice_number: str | None = None
    message: str | None = None


class BillingExecuteResponse(BaseModel):
    period: str
    generated_count: int
    duplicate_count: int
    failed_count: int
    items: list[BillingExecuteItem]
