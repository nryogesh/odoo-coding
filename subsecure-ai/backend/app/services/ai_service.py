"""Secure AI Finance Copilot.

Pipeline: question -> intent extraction (Gemini if configured, else a
deterministic fallback parser) -> Pydantic AST validation -> whitelist
enforcement -> role/customer scoping applied server-side -> fixed ORM query
builders -> concise answer.

The model NEVER generates SQL, never performs writes, and its output is
discarded unless it survives strict validation. Every query is read-only and
customer-scoped independently of anything the model says.
"""

import json
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import requests
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Customer, Invoice, InvoiceStatus, Role, Subscription, SubscriptionStatus, User
from ..schemas.ai_query import ALLOWED_FIELDS, ALLOWED_OPERATORS, QueryAST
from . import anomaly_engine, revenue_engine

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

_PROMPT = """You are an intent extractor for a subscription billing system.
Convert the user's question into STRICT JSON only (no prose, no markdown) with this shape:
{"entity": "invoice|subscription|customer|metric",
 "filters": [{"field": "...", "operator": "eq|gt|gte|lt|lte|in", "value": ...}],
 "period": "current_month|next_7_days|next_30_days|all_time",
 "limit": 25}
Allowed fields per entity:
 invoice: status (DRAFT/CONFIRMED/PAID/CANCELLED/OVERDUE), total, due_date, customer_id
 subscription: status (DRAFT/QUOTATION/CONFIRMED/ACTIVE/PAUSED/CLOSED/EXPIRED), expiry_date, plan_interval (DAILY/WEEKLY/MONTHLY/YEARLY), customer_id
 customer: name, region
 metric: name (mrr|outstanding)
For MRR use {"entity":"metric","filters":[{"field":"name","operator":"eq","value":"mrr"}],"period":"current_month"}.
For outstanding balance use metric name "outstanding".
For churn-risk subscriptions use {"entity":"subscription","filters":[{"field":"status","operator":"in","value":["ACTIVE","PAUSED"]}],"period":"all_time"} with limit 100.
Question: {question}"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in model output")
    return json.loads(text[start : end + 1])


def _gemini_ast(question: str) -> dict | None:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return None
    try:
        resp = requests.post(
            _GEMINI_URL,
            params={"key": settings.GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": _PROMPT.format(question=question)}]}],
                "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
            },
            timeout=15,
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return _extract_json(text)
    except Exception:
        return None  # any failure -> deterministic fallback


def _fallback_ast(question: str) -> dict:
    """Deterministic parser for the supported intents. Used when Gemini is
    unavailable; the API response marks mode='fallback'."""
    q = question.lower()

    amount = None
    m = re.search(r"(?:above|over|greater than|more than)\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)", q)
    if m:
        amount = Decimal(m.group(1).replace(",", ""))

    if "mrr" in q:
        return {"entity": "metric", "filters": [{"field": "name", "operator": "eq", "value": "mrr"}], "period": "current_month"}
    if "outstanding" in q or "still owed" in q or "unpaid" in q:
        return {"entity": "metric", "filters": [{"field": "name", "operator": "eq", "value": "outstanding"}], "period": "all_time"}
    if "churn" in q or "risk" in q:
        return {"entity": "subscription", "filters": [{"field": "status", "operator": "in", "value": ["ACTIVE", "PAUSED"]}], "period": "all_time", "limit": 100}

    if "overdue" in q or ("invoice" in q and "paid" not in q):
        filters = [{"field": "status", "operator": "eq", "value": "OVERDUE"}]
        if amount is not None:
            filters.append({"field": "total", "operator": "gt", "value": str(amount)})
        period = "current_month" if ("this month" in q or "current month" in q) else "all_time"
        return {"entity": "invoice", "filters": filters, "period": period}

    if "expire" in q or "expiring" in q or "renewal" in q:
        period = "next_7_days" if ("next week" in q or "7 day" in q) else "next_30_days"
        filters = []
        if "yearly" in q:
            filters.append({"field": "plan_interval", "operator": "eq", "value": "YEARLY"})
        return {"entity": "subscription", "filters": filters, "period": period}

    if "invoice" in q:
        return {"entity": "invoice", "filters": [], "period": "all_time"}
    if "subscription" in q:
        return {"entity": "subscription", "filters": [], "period": "all_time"}

    raise ValueError(
        "Unsupported question. Supported: overdue invoices (optionally above an amount), "
        "subscriptions expiring soon, current MRR, high churn-risk subscriptions, outstanding balance."
    )


def _validate_ast(raw: dict) -> QueryAST:
    ast = QueryAST.model_validate(raw)
    allowed_fields = ALLOWED_FIELDS[ast.entity]
    for f in ast.filters:
        if f.field not in allowed_fields:
            raise ValueError(f"Field {f.field!r} is not allowed for entity {ast.entity!r}")
        if f.operator not in ALLOWED_OPERATORS:
            raise ValueError(f"Operator {f.operator!r} is not allowed")
        if f.field == "status":
            allowed_statuses = (
                {"DRAFT", "CONFIRMED", "PAID", "CANCELLED", "OVERDUE"}
                if ast.entity == "invoice"
                else {"DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED", "EXPIRED"}
            )
            values = f.value if isinstance(f.value, list) else [f.value]
            for v in values:
                if str(v).upper() not in allowed_statuses:
                    raise ValueError(f"Status value {v!r} is not allowed for {ast.entity}")
    return ast


def _apply_filter(query, model_field, operator: str, value: Any):
    if operator == "eq":
        return query.filter(model_field == value)
    if operator == "gt":
        return query.filter(model_field > value)
    if operator == "gte":
        return query.filter(model_field >= value)
    if operator == "lt":
        return query.filter(model_field < value)
    if operator == "lte":
        return query.filter(model_field <= value)
    if operator == "in":
        return query.filter(model_field.in_(value if isinstance(value, list) else [value]))
    raise ValueError(f"Unsupported operator {operator!r}")


def _period_dates(period: str) -> tuple[date, date] | None:
    today = date.today()
    if period == "current_month":
        return today.replace(day=1), today
    if period == "next_7_days":
        return today, today + timedelta(days=7)
    if period == "next_30_days":
        return today, today + timedelta(days=30)
    return None


def execute_ast(db: Session, ast: QueryAST, user: User) -> tuple[list[dict], str]:
    """Execute a validated AST through fixed server-side ORM mappings.
    Customer scoping is enforced here regardless of the AST contents."""
    customer_scope: int | None = user.customer_id if user.role == Role.CUSTOMER else None

    if ast.entity == "metric":
        name = next((str(f.value) for f in ast.filters if f.field == "name"), "")
        if name == "mrr":
            mrr = revenue_engine.compute_mrr(db, customer_scope=customer_scope)
            return [{"mrr": str(mrr), "arr": str(mrr * 12)}], f"Current MRR is ₹{mrr} (ARR ₹{mrr * 12})."
        if name == "outstanding":
            invoices = db.query(Invoice).filter(Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE]))
            if customer_scope is not None:
                invoices = invoices.filter(Invoice.customer_id == customer_scope)
            total = Decimal("0")
            for inv in invoices.all():
                paid = sum(p.amount for p in inv.payments)
                total += inv.total - paid
            return [{"outstanding": str(total)}], f"Total outstanding amount is ₹{total}."
        raise ValueError(f"Unknown metric {name!r}")

    if ast.entity == "invoice":
        query = db.query(Invoice)
        if customer_scope is not None:
            query = query.filter(Invoice.customer_id == customer_scope)
        for f in ast.filters:
            if f.field == "customer_id":
                continue  # customer_id filter from a model is ignored; scope is server-side
            column = {"status": Invoice.status, "total": Invoice.total, "due_date": Invoice.due_date}[f.field]
            value = f.value
            if f.field == "status":
                value = [v.upper() for v in value] if isinstance(value, list) else str(value).upper()
            if f.field == "total":
                value = Decimal(str(value))
            query = _apply_filter(query, column, f.operator, value)
        if ast.period == "current_month":
            dates = _period_dates("current_month")
            query = query.filter(Invoice.issue_date >= dates[0], Invoice.issue_date <= dates[1])
        invoices = query.limit(ast.limit).all()
        rows = [
            {
                "id": i.id,
                "invoice_number": i.invoice_number,
                "customer_id": i.customer_id,
                "total": str(i.total),
                "status": i.status.value,
                "due_date": i.due_date.isoformat(),
            }
            for i in invoices
        ]
        return rows, f"Found {len(rows)} invoice(s) matching your question."

    if ast.entity == "subscription":
        query = db.query(Subscription)
        if customer_scope is not None:
            query = query.filter(Subscription.customer_id == customer_scope)
        for f in ast.filters:
            if f.field == "customer_id":
                continue
            if f.field == "plan_interval":
                from ..models import Plan

                query = query.join(Plan, Subscription.plan_id == Plan.id)
                query = _apply_filter(query, Plan.billing_interval, f.operator, f.value)
            else:
                column = {"status": Subscription.status, "expiry_date": Subscription.expiry_date}[f.field]
                value = f.value
                if f.field == "status":
                    value = [v.upper() for v in value] if isinstance(value, list) else str(value).upper()
                query = _apply_filter(query, column, f.operator, value)
        dates = _period_dates(ast.period)
        if dates and any(w in ("next",) for w in ast.period.split("_")):
            query = query.filter(Subscription.expiry_date >= dates[0], Subscription.expiry_date <= dates[1])
        subs = query.limit(ast.limit).all()
        if any(str(f.value).upper() in ("ACTIVE", "PAUSED") for f in ast.filters if f.field == "status"):
            risks = anomaly_engine.churn_risk_list(db, customer_scope=customer_scope)
            risks = [r for r in risks if r["risk_score"] >= 30][: ast.limit]
            if risks:
                return risks, f"{len(risks)} subscription(s) with elevated churn risk (score >= 30)."
        rows = [
            {
                "id": s.id,
                "subscription_number": s.subscription_number,
                "customer_id": s.customer_id,
                "status": s.status.value,
                "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
            }
            for s in subs
        ]
        return rows, f"Found {len(rows)} subscription(s) matching your question."

    if ast.entity == "customer":
        if customer_scope is not None:
            query = db.query(Customer).filter(Customer.id == customer_scope)
        else:
            query = db.query(Customer)
        for f in ast.filters:
            column = {"name": Customer.name, "region": Customer.region}[f.field]
            query = _apply_filter(query, column, f.operator, f.value)
        customers = query.limit(ast.limit).all()
        rows = [{"id": c.id, "name": c.name, "email": c.email, "region": c.region} for c in customers]
        return rows, f"Found {len(rows)} customer(s) matching your question."

    raise ValueError(f"Unsupported entity {ast.entity!r}")


def answer_question(db: Session, question: str, user: User) -> dict:
    raw = _gemini_ast(question)
    mode = "gemini"
    if raw is None:
        mode = "fallback"
        raw = _fallback_ast(question)
    ast = _validate_ast(raw)  # raises ValueError on anything outside the whitelist
    rows, answer = execute_ast(db, ast, user)
    return {
        "mode": mode,
        "question": question,
        "ast": ast.model_dump(),
        "answer": answer,
        "results": rows,
        "result_count": len(rows),
    }
