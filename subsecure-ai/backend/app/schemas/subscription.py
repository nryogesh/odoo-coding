from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class QuotationLineIn(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(ge=1)


class QuotationCreate(BaseModel):
    customer_id: int
    plan_id: int | None = None
    valid_until: date | None = None
    lines: list[QuotationLineIn] = Field(min_length=1)


class QuotationLineOut(BaseModel):
    id: int
    product_id: int
    variant_id: int | None
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class QuotationOut(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    plan_id: int | None
    valid_until: date | None
    status: str
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    total: Decimal
    created_by: int | None
    lines: list[QuotationLineOut] = []

    model_config = {"from_attributes": True}


class TransitionRequest(BaseModel):
    action: str = Field(description="Target status, e.g. QUOTATION, CONFIRMED, ACTIVE, PAUSED, CLOSED")


class SubscriptionLineIn(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(ge=1)


class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: date | None = None
    payment_terms: str | None = None
    lines: list[SubscriptionLineIn] = Field(min_length=1)


class SubscriptionLineOut(BaseModel):
    id: int
    product_id: int
    variant_id: int | None
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class SubscriptionOut(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: date | None
    next_billing_date: date | None
    payment_terms: str | None
    status: str
    lines: list[SubscriptionLineOut] = []

    model_config = {"from_attributes": True}


class AuditEventOut(BaseModel):
    sequence_num: int
    event_id: str
    aggregate_type: str
    aggregate_id: str
    event_type: str
    payload: str
    actor_user_id: int | None
    timestamp: str
    previous_hash: str
    event_hash: str

    model_config = {"from_attributes": True}


class SubscriptionStateAt(BaseModel):
    subscription_id: int
    as_of: datetime
    status: str | None
    events_replayed: int
    note: str
