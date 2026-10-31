from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_ENTITIES = {"invoice", "subscription", "customer", "metric"}

ALLOWED_FIELDS: dict[str, set[str]] = {
    "invoice": {"status", "total", "due_date", "customer_id"},
    "subscription": {"status", "expiry_date", "plan_interval", "customer_id"},
    "customer": {"name", "region"},
    "metric": {"name"},
}

ALLOWED_OPERATORS = {"eq", "gt", "gte", "lt", "lte", "in"}

ALLOWED_PERIODS = {
    "current_month",
    "next_7_days",
    "next_30_days",
    "all_time",
}


class ASTFilter(BaseModel):
    field: str
    operator: str
    value: Any


class QueryAST(BaseModel):
    """Validated, allowlisted query specification. The LLM (or fallback parser)
    may only produce this shape — never SQL."""

    entity: str
    filters: list[ASTFilter] = []
    period: Literal["current_month", "next_7_days", "next_30_days", "all_time"] = "all_time"
    limit: int = Field(default=25, le=100)

    @field_validator("entity")
    @classmethod
    def entity_allowed(cls, v: str) -> str:
        if v not in ALLOWED_ENTITIES:
            raise ValueError(f"Unsupported entity: {v!r}")
        return v


class AssistantQueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AssistantQueryResponse(BaseModel):
    mode: Literal["gemini", "fallback"]
    question: str
    ast: dict | None = None
    answer: str
    results: list[dict]
    result_count: int
