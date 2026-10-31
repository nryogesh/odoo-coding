"""Safe JSON business-rule evaluator.

A small whitelist of fields, operators and actions. Rules are validated with
Pydantic and evaluated without eval()/exec(). Arbitrary expressions and
executable code are rejected by construction.
"""

import json
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_FIELDS = {"quantity", "subtotal", "product_id", "customer_region", "current_date", "subscription_type"}
ALLOWED_OPERATORS = {"eq", "gt", "gte", "lt", "lte", "in"}


class RuleCondition(BaseModel):
    field: str
    operator: str
    value: Any

    @field_validator("field")
    @classmethod
    def field_allowed(cls, v: str) -> str:
        if v not in ALLOWED_FIELDS:
            raise ValueError(f"Unsupported rule field: {v!r}. Allowed: {sorted(ALLOWED_FIELDS)}")
        return v

    @field_validator("operator")
    @classmethod
    def operator_allowed(cls, v: str) -> str:
        if v not in ALLOWED_OPERATORS:
            raise ValueError(f"Unsupported rule operator: {v!r}. Allowed: {sorted(ALLOWED_OPERATORS)}")
        return v


class RuleAction(BaseModel):
    type: Literal["percentage", "fixed"]
    value: Decimal = Field(gt=0)


class DiscountRuleSpec(BaseModel):
    name: str
    enabled: bool = True
    conditions: list[RuleCondition] = []
    action: RuleAction
    valid_from: date | None = None
    valid_until: date | None = None
    usage_limit: int | None = None
    product_ids: list[int] | None = None


def parse_discount_rule(rule_json: str) -> DiscountRuleSpec:
    """Parse and validate a stored rule. Raises ValueError on invalid rules."""
    try:
        data = json.loads(rule_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Rule is not valid JSON: {exc}") from exc
    try:
        return DiscountRuleSpec.model_validate(data)
    except Exception as exc:
        raise ValueError(f"Rule failed validation: {exc}") from exc


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    if operator == "in":
        if not isinstance(expected, (list, tuple, set)):
            return False
        return actual in expected
    # numeric comparison where possible
    try:
        a = Decimal(str(actual))
        b = Decimal(str(expected))
    except Exception:
        a, b = actual, expected
    if operator == "eq":
        return a == b
    if operator == "gt":
        return a > b
    if operator == "gte":
        return a >= b
    if operator == "lt":
        return a < b
    if operator == "lte":
        return a <= b
    return False


def rule_applies(
    spec: DiscountRuleSpec,
    *,
    context: dict,
    usage_count: int,
    today: date,
) -> bool:
    if not spec.enabled:
        return False
    if spec.valid_from and today < spec.valid_from:
        return False
    if spec.valid_until and today > spec.valid_until:
        return False
    if spec.usage_limit is not None and usage_count >= spec.usage_limit:
        return False
    if spec.product_ids and context.get("product_id") is not None:
        if context["product_id"] not in spec.product_ids:
            return False
    for cond in spec.conditions:
        actual = context.get(cond.field)
        if cond.field == "current_date":
            actual = today.isoformat()
        if actual is None:
            return False
        if not _compare(actual, cond.operator, cond.value):
            return False
    return True


def discount_amount(spec: DiscountRuleSpec, base: Decimal) -> Decimal:
    if spec.action.type == "percentage":
        return (base * spec.action.value / Decimal("100"))
    return min(spec.action.value, base)  # fixed, never exceed the base
