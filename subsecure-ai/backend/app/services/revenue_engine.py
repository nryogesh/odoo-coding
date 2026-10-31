"""Revenue intelligence: MRR/ARR and related metrics.

Documented metric policy (consistent across all endpoints):
- MRR includes only ACTIVE subscriptions. PAUSED subscriptions are excluded
  (no revenue is being billed while paused). CLOSED/EXPIRED are excluded.
- Recurring amount per subscription = sum(quantity x unit price) over its lines,
  normalized to monthly by the plan's billing interval:
    DAILY x 365/12, WEEKLY x 52/12, MONTHLY x 1, YEARLY / 12.
- Discounts and taxes are NOT applied to MRR (MRR measures recurring list
  revenue; realized revenue is reported via collected/outstanding metrics).
- New MRR: MRR contribution of subscriptions activated in the current month.
- Churned MRR: MRR contribution (at last known line prices) of subscriptions
  closed in the current month.
- Expansion MRR: sum of positive quantity-change deltas recorded in
  SubscriptionQuantityChanged events this month (0 if none).
- One-time charges are not modelled and therefore never counted as MRR.
- ARR = MRR x 12.
- The 90-day forecast is a transparent baseline estimate (current MRR minus
  known expiries' MRR within 90 days), not a trained predictive model.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from ..models import (
    AuditEvent,
    Invoice,
    InvoiceStatus,
    Payment,
    Subscription,
    SubscriptionStatus,
)
from ..utils.money import money

_INTERVAL_MONTHLY_FACTOR = {
    "DAILY": Decimal("365") / Decimal("12"),
    "WEEKLY": Decimal("52") / Decimal("12"),
    "MONTHLY": Decimal("1"),
    "YEARLY": Decimal("1") / Decimal("12"),
}


def subscription_monthly_amount(sub: Subscription) -> Decimal:
    base = sum(Decimal(l.quantity) * l.unit_price for l in sub.lines)
    interval = sub.plan.billing_interval.value if sub.plan else "MONTHLY"
    return base * _INTERVAL_MONTHLY_FACTOR.get(interval, Decimal("1"))


def compute_mrr(db: Session, customer_scope: int | None = None) -> Decimal:
    total = Decimal("0")
    query = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE)
    if customer_scope is not None:
        query = query.filter(Subscription.customer_id == customer_scope)
    for sub in query.all():
        total += subscription_monthly_amount(sub)
    return money(total)


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def dashboard(db: Session) -> dict:
    month_start = _month_start()

    active_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).all()
    mrr = money(sum(subscription_monthly_amount(s) for s in active_subs))

    new_mrr = Decimal("0")
    for s in active_subs:
        created = s.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created >= month_start:
            new_mrr += subscription_monthly_amount(s)

    churned_mrr = Decimal("0")
    for ev in (
        db.query(AuditEvent)
        .filter(AuditEvent.event_type == "SubscriptionClosed", AuditEvent.timestamp >= month_start.strftime("%Y-%m-%d"))
        .all()
    ):
        sub = db.get(Subscription, int(ev.aggregate_id))
        if sub:
            churned_mrr += subscription_monthly_amount(sub)

    # Expansion MRR from recorded quantity-change events this month
    expansion_mrr = Decimal("0")
    for ev in (
        db.query(AuditEvent)
        .filter(
            AuditEvent.event_type == "SubscriptionQuantityChanged",
            AuditEvent.timestamp >= month_start.strftime("%Y-%m-%d"),
        )
        .all()
    ):
        import json

        try:
            payload = json.loads(ev.payload)
            delta = Decimal(str(payload.get("monthly_delta", "0")))
            if delta > 0:
                expansion_mrr += delta
        except Exception:
            pass

    # Collected & outstanding
    payments = db.query(Payment).all()
    collected_total = money(sum(p.amount for p in payments) if payments else Decimal("0"))
    collected_month = money(
        sum(p.amount for p in payments if p.payment_date >= month_start.date()) if payments else Decimal("0")
    )

    outstanding_invoices = (
        db.query(Invoice)
        .filter(Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE]))
        .all()
    )
    outstanding = Decimal("0")
    overdue_count = 0
    today = date.today()
    for inv in outstanding_invoices:
        paid = sum(p.amount for p in inv.payments)
        outstanding += inv.total - paid
        if inv.status == InvoiceStatus.OVERDUE or (inv.due_date < today and inv.status != InvoiceStatus.PAID):
            overdue_count += 1

    forecast_90d = _baseline_forecast(db, mrr, days=90)

    return {
        "active_subscriptions": len(active_subs),
        "mrr": money(mrr),
        "arr": money(mrr * 12),
        "new_mrr": money(new_mrr),
        "expansion_mrr": money(expansion_mrr),
        "churned_mrr": money(churned_mrr),
        "revenue_collected_total": collected_total,
        "revenue_collected_this_month": collected_month,
        "outstanding_amount": money(outstanding),
        "overdue_invoice_count": overdue_count,
        "forecast_90d_estimate": forecast_90d,
        "metric_policy": (
            "MRR = active subscriptions only, list recurring amount normalized monthly; "
            "paused/closed/expired excluded; discounts and taxes not applied to MRR; "
            "forecast is a baseline estimate, not a trained prediction."
        ),
    }


def _baseline_forecast(db: Session, mrr: Decimal, days: int) -> dict:
    horizon = date.today() + timedelta(days=days)
    expiring_mrr = Decimal("0")
    for s in db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).all():
        if s.expiry_date and s.expiry_date <= horizon:
            plan = s.plan
            if plan and not plan.allow_renewal:
                expiring_mrr += subscription_monthly_amount(s)
    projected = money((mrr - expiring_mrr) * 3)
    return {
        "label": "baseline_estimate",
        "projected_revenue_next_90_days": projected,
        "assumption": "Current MRR held for 3 months minus MRR of non-renewable subscriptions expiring within 90 days. Estimate only.",
    }


def mrr_breakdown(db: Session) -> dict:
    items = []
    for s in db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).all():
        items.append(
            {
                "subscription_id": s.id,
                "subscription_number": s.subscription_number,
                "customer_id": s.customer_id,
                "billing_interval": s.plan.billing_interval.value if s.plan else None,
                "monthly_amount": money(subscription_monthly_amount(s)),
            }
        )
    mrr = money(sum(i["monthly_amount"] for i in items) if items else Decimal("0"))
    return {"mrr": mrr, "arr": money(mrr * 12), "components": items}
