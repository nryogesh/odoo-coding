from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class InvoiceLineOut(BaseModel):
    id: int
    product_id: int | None
    description: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    billing_period_key: str
    billing_period_start: date
    billing_period_end: date
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    total: Decimal
    status: str
    amount_paid: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")
    lines: list[InvoiceLineOut] = []

    model_config = {"from_attributes": True}


class InvoiceBalanceOut(BaseModel):
    invoice_id: int
    invoice_number: str
    total: Decimal
    amount_paid: Decimal
    balance: Decimal
    status: str
