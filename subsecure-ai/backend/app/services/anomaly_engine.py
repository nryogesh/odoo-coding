"""Deterministic churn/anomaly risk scoring with explainable reasons.

Scoring policy (transparent, clamped to 100):
  - Overdue invoice:            +30
  - Paused subscription:        +25
  - Repeated failed payments:   +25 (if recorded in demo data)
  - Expiring within 7 days:     +20
Labels: 0-29 Low, 30-59 Medium, 60-100 High.

The optional Isolation Forest (if scikit-learn is available and enough data
exists) adds a *warning* signal only. It never blocks a transaction;
deterministic rules always take precedence.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from ..models import Invoice, InvoiceStatus, Subscription, SubscriptionStatus

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest

    _SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover
    _SKLEARN_AVAILABLE = False


def _label(score: int) -> str:
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


def score_subscription(db: Session, sub: Subscription) -> dict:
    score = 0
    reasons: list[str] = []
    today = date.today()

    overdue = [
        inv
        for inv in db.query(Invoice)
        .filter(
            Invoice.subscription_id == sub.id,
            Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE]),
        )
        .all()
        if inv.due_date < today
    ]
    if overdue:
        score += 30
        reasons.append(f"{len(overdue)} overdue invoice(s): {', '.join(i.invoice_number for i in overdue)}")

    if sub.status == SubscriptionStatus.PAUSED:
        score += 25
        reasons.append("Subscription is currently paused")

    failed_payments = [
        p
        for inv in db.query(Invoice).filter(Invoice.subscription_id == sub.id).all()
        for p in inv.payments
        if p.method == "FAILED"
    ]
    if len(failed_payments) >= 2:
        score += 25
        reasons.append(f"{len(failed_payments)} recorded failed payment attempts")

    if sub.expiry_date and 0 <= (sub.expiry_date - today).days <= 7:
        score += 20
        reasons.append(f"Subscription expires on {sub.expiry_date.isoformat()} (within 7 days)")

    for line in sub.lines:
        if line.quantity >= 50:
            reasons.append(f"Unusual quantity ({line.quantity}) — review recommended")

    score = min(score, 100)
    return {
        "subscription_id": sub.id,
        "subscription_number": sub.subscription_number,
        "customer_id": sub.customer_id,
        "status": sub.status.value,
        "risk_score": score,
        "risk_label": _label(score),
        "reasons": reasons or ["No risk signals detected"],
    }


def churn_risk_list(db: Session, customer_scope: int | None = None) -> list[dict]:
    query = db.query(Subscription).filter(
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED])
    )
    if customer_scope is not None:
        query = query.filter(Subscription.customer_id == customer_scope)
    results = [score_subscription(db, s) for s in query.all()]
    return sorted(results, key=lambda r: r["risk_score"], reverse=True)


def ml_anomaly_scores(db: Session) -> dict:
    """Optional Isolation Forest warning on invoice amounts. Synthetic/small-data
    demonstration only — output is a warning, never a verdict."""
    if not _SKLEARN_AVAILABLE:
        return {"available": False, "reason": "scikit-learn not installed", "flags": []}
    invoices = db.query(Invoice).filter(Invoice.status != InvoiceStatus.CANCELLED).all()
    if len(invoices) < 6:
        return {"available": False, "reason": "Not enough invoices for a demonstration model", "flags": []}
    totals = np.array([[float(inv.total)] for inv in invoices])
    model = IsolationForest(contamination=0.15, random_state=42)
    preds = model.fit_predict(totals)
    flags = [
        {"invoice_id": inv.id, "invoice_number": inv.invoice_number, "total": str(inv.total)}
        for inv, p in zip(invoices, preds)
        if p == -1
    ]
    return {
        "available": True,
        "warning": "IsolationForest trained on this prototype's own data; flags are warnings for human review, not proof of fraud.",
        "flags": flags,
    }
