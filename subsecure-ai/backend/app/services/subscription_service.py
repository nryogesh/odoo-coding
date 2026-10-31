"""Subscription lifecycle service: validated transitions + audit events."""

import json
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import (
    ALLOWED_TRANSITIONS,
    AuditEvent,
    Plan,
    Quotation,
    QuotationStatus,
    Subscription,
    SubscriptionLine,
    SubscriptionStatus,
)
from ..utils.dates import add_interval
from . import audit_ledger

_TRANSITION_EVENTS = {
    SubscriptionStatus.QUOTATION: "SubscriptionCreated",
    SubscriptionStatus.CONFIRMED: "SubscriptionConfirmed",
    SubscriptionStatus.ACTIVE: "SubscriptionActivated",
    SubscriptionStatus.PAUSED: "SubscriptionPaused",
    SubscriptionStatus.CLOSED: "SubscriptionClosed",
    SubscriptionStatus.EXPIRED: "SubscriptionExpired",
}


def _event_type(from_status: SubscriptionStatus, to_status: SubscriptionStatus) -> str:
    if from_status == SubscriptionStatus.PAUSED and to_status == SubscriptionStatus.ACTIVE:
        return "SubscriptionResumed"
    return _TRANSITION_EVENTS.get(to_status, f"Subscription{to_status.value.title()}")


def transition(db: Session, sub: Subscription, action: str, actor_user_id: int | None) -> Subscription:
    try:
        target = SubscriptionStatus[action.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown action {action!r}. Valid: {sorted(s.value for s in SubscriptionStatus)}",
        )

    allowed = ALLOWED_TRANSITIONS.get(sub.status, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition {sub.status.value} -> {target.value}. Allowed: {sorted(s.value for s in allowed) or 'none'}",
        )

    plan = db.get(Plan, sub.plan_id)
    if target == SubscriptionStatus.PAUSED and plan and not plan.allow_pause:
        raise HTTPException(status_code=400, detail="Plan does not allow pausing")
    if target == SubscriptionStatus.CLOSED and plan and not plan.allow_early_close:
        if sub.expiry_date and date.today() < sub.expiry_date:
            raise HTTPException(status_code=400, detail="Plan does not allow early closure")

    old_status = sub.status.value
    sub.status = target
    if target == SubscriptionStatus.ACTIVE and sub.next_billing_date is None:
        sub.next_billing_date = sub.start_date

    audit_ledger.append_event(
        db,
        aggregate_type="subscription",
        aggregate_id=sub.id,
        event_type=_event_type(SubscriptionStatus(old_status), target),
        payload={"from": old_status, "to": target.value, "subscription_number": sub.subscription_number},
        actor_user_id=actor_user_id,
    )
    db.commit()
    db.refresh(sub)
    return sub


def renew(db: Session, sub: Subscription, actor_user_id: int | None) -> Subscription:
    plan = db.get(Plan, sub.plan_id)
    if plan and not plan.allow_renewal:
        raise HTTPException(status_code=400, detail="Plan does not allow renewal")
    if sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED):
        raise HTTPException(status_code=400, detail=f"Cannot renew a {sub.status.value} subscription")
    interval = plan.billing_interval.value if plan else "MONTHLY"
    base = sub.expiry_date or date.today()
    sub.expiry_date = add_interval(base, interval)
    sub.status = SubscriptionStatus.ACTIVE
    if sub.next_billing_date is None or sub.next_billing_date < date.today():
        sub.next_billing_date = date.today()
    audit_ledger.append_event(
        db,
        aggregate_type="subscription",
        aggregate_id=sub.id,
        event_type="SubscriptionRenewed",
        payload={"new_expiry_date": sub.expiry_date.isoformat(), "subscription_number": sub.subscription_number},
        actor_user_id=actor_user_id,
    )
    db.commit()
    db.refresh(sub)
    return sub


def state_at(db: Session, subscription_id: int, as_of: datetime) -> dict:
    """Time travel: replay a subscription's events up to a timestamp and
    reconstruct its status history (single-subscription scope, per spec)."""
    events = audit_ledger.subscription_events(db, subscription_id)
    cutoff = as_of.strftime("%Y-%m-%dT%H:%M:%S")
    status = None
    replayed = 0
    for ev in events:
        if ev.timestamp[:19] > cutoff:
            break
        replayed += 1
        if ev.event_type in (
            "SubscriptionCreated",
            "SubscriptionConfirmed",
            "SubscriptionActivated",
            "SubscriptionResumed",
            "SubscriptionPaused",
            "SubscriptionClosed",
            "SubscriptionExpired",
            "SubscriptionRenewed",
        ):
            try:
                payload = json.loads(ev.payload)
                status = payload.get("to") or status
                if ev.event_type == "SubscriptionCreated" and status is None:
                    status = "DRAFT"
                if ev.event_type == "SubscriptionRenewed":
                    status = "ACTIVE"
            except json.JSONDecodeError:
                pass
    return {
        "subscription_id": subscription_id,
        "as_of": as_of,
        "status": status,
        "events_replayed": replayed,
        "note": "State reconstructed by replaying this subscription's audit events up to the requested timestamp.",
    }


def create_from_quotation(db: Session, quotation: Quotation, actor_user_id: int | None) -> Subscription:
    if quotation.status != QuotationStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Only a CONFIRMED quotation can become a subscription")
    if quotation.plan_id is None:
        raise HTTPException(status_code=400, detail="Quotation has no plan; cannot create subscription")

    count = db.query(Subscription).count()
    sub = Subscription(
        subscription_number=f"SUB-{1000 + count + 1}",
        customer_id=quotation.customer_id,
        plan_id=quotation.plan_id,
        quotation_id=quotation.id,
        start_date=date.today(),
        next_billing_date=date.today(),
        payment_terms="NET_14",
        status=SubscriptionStatus.CONFIRMED,
    )
    db.add(sub)
    db.flush()
    for ql in quotation.lines:
        db.add(
            SubscriptionLine(
                subscription_id=sub.id,
                product_id=ql.product_id,
                variant_id=ql.variant_id,
                quantity=ql.quantity,
                unit_price=ql.unit_price,
            )
        )
    quotation.status = QuotationStatus.ACTIVE
    audit_ledger.append_event(
        db,
        aggregate_type="subscription",
        aggregate_id=sub.id,
        event_type="SubscriptionCreated",
        payload={
            "subscription_number": sub.subscription_number,
            "from_quotation": quotation.quotation_number,
            "customer_id": sub.customer_id,
            "plan_id": sub.plan_id,
        },
        actor_user_id=actor_user_id,
    )
    db.commit()
    db.refresh(sub)
    return sub
