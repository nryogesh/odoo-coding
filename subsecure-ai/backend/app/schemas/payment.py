from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    invoice_id: int
    # Monetary inputs must be expressed at currency precision before any
    # balance comparison; otherwise a value such as 0.001 could be rounded
    # differently by SQLite's NUMERIC column after validation.
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    method: str = Field(default="BANK_TRANSFER", max_length=40)
    payment_date: date | None = None
    reference: str | None = None
    note: str | None = None


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    amount: Decimal
    method: str
    payment_date: date
    reference: str | None
    note: str | None
    created_by: int | None

    model_config = {"from_attributes": True}
