from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class DiscountRule(Base):
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    rule_json: Mapped[str] = mapped_column(Text, nullable=False)  # validated JSON rule
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class TaxRule(Base):
    """Prototype tax configuration: a simple configurable percentage.

    This does NOT claim GST/jurisdictional compliance.
    """

    __tablename__ = "tax_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    region: Mapped[str | None] = mapped_column(String(80), nullable=True)
    percentage: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
