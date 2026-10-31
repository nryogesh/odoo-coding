from decimal import Decimal

from pydantic import BaseModel, Field


class VariantIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price_adjustment: Decimal = Field(default=Decimal("0"))


class VariantOut(VariantIn):
    id: int
    product_id: int

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    product_type: str = Field(default="SERVICE", max_length=60)
    sales_price: Decimal = Field(ge=0)
    cost_price: Decimal = Field(default=Decimal("0"), ge=0)
    notes: str | None = None
    variants: list[VariantIn] = []


class ProductOut(BaseModel):
    id: int
    name: str
    product_type: str
    sales_price: Decimal
    cost_price: Decimal
    notes: str | None
    is_active: bool
    variants: list[VariantOut] = []

    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    product_id: int
    price: Decimal = Field(gt=0)
    billing_interval: str = Field(pattern="^(DAILY|WEEKLY|MONTHLY|YEARLY)$")
    minimum_quantity: int = Field(default=1, ge=1)
    available_from: str | None = None
    available_until: str | None = None
    auto_close: bool = False
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True


class PlanOut(BaseModel):
    id: int
    name: str
    product_id: int
    price: Decimal
    billing_interval: str
    minimum_quantity: int
    available_from: str | None
    available_until: str | None
    auto_close: bool
    allow_early_close: bool
    allow_pause: bool
    allow_renewal: bool
    is_active: bool

    model_config = {"from_attributes": True}
