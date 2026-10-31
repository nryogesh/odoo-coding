from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Customer,
    Plan,
    Product,
    ProductVariant,
    Role,
    Subscription,
    SubscriptionLine,
    User,
)
from ..schemas.subscription import (
    AuditEventOut,
    SubscriptionCreate,
    SubscriptionOut,
    SubscriptionStateAt,
    TransitionRequest,
)
from ..security.dependencies import get_current_user, require_roles, scoped_customer_id
from ..services import audit_ledger, subscription_service
from ..utils.money import money

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _get_scoped(db: Session, subscription_id: int, user: User) -> Subscription:
    sub = db.get(Subscription, subscription_id)
    scope = scoped_customer_id(user)
    if not sub or (scope is not None and sub.customer_id != scope):
        # 404 so customers cannot probe other customers' IDs
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.get("", response_model=list[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Subscription)
    scope = scoped_customer_id(user)
    if scope is not None:
        query = query.filter(Subscription.customer_id == scope)
    return query.all()


@router.post("", response_model=SubscriptionOut, status_code=201)
def create_subscription(
    payload: SubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    if not db.get(Customer, payload.customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    plan = db.get(Plan, payload.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found or inactive")

    count = db.query(Subscription).count()
    sub = Subscription(
        subscription_number=f"SUB-{1000 + count + 1}",
        customer_id=payload.customer_id,
        plan_id=plan.id,
        start_date=payload.start_date,
        expiry_date=payload.expiry_date,
        next_billing_date=payload.start_date,
        payment_terms=payload.payment_terms or "NET_14",
    )
    db.add(sub)
    db.flush()

    for line in payload.lines:
        product = db.get(Product, line.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
        unit_price = product.sales_price
        if line.variant_id:
            variant = db.get(ProductVariant, line.variant_id)
            if not variant or variant.product_id != product.id:
                raise HTTPException(status_code=404, detail=f"Variant {line.variant_id} not found for product")
            unit_price = money(unit_price + variant.price_adjustment)
        db.add(
            SubscriptionLine(
                subscription_id=sub.id,
                product_id=product.id,
                variant_id=line.variant_id,
                quantity=max(line.quantity, plan.minimum_quantity),
                unit_price=unit_price,
            )
        )

    audit_ledger.append_event(
        db,
        aggregate_type="subscription",
        aggregate_id=sub.id,
        event_type="SubscriptionCreated",
        payload={
            "subscription_number": sub.subscription_number,
            "customer_id": sub.customer_id,
            "plan_id": sub.plan_id,
            "start_date": str(sub.start_date),
        },
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(
    subscription_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return _get_scoped(db, subscription_id, user)


@router.post("/{subscription_id}/transition", response_model=SubscriptionOut)
def transition_subscription(
    subscription_id: int,
    payload: TransitionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_scoped(db, subscription_id, user)
    if payload.action.upper() == "RENEW":
        if user.role == Role.CUSTOMER:
            raise HTTPException(status_code=403, detail="Customers cannot renew subscriptions")
        return subscription_service.renew(db, sub, user.id)
    if user.role == Role.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customers cannot change subscription status")
    return subscription_service.transition(db, sub, payload.action, user.id)


@router.get("/{subscription_id}/events", response_model=list[AuditEventOut])
def get_subscription_events(
    subscription_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    sub = _get_scoped(db, subscription_id, user)
    return audit_ledger.subscription_events(db, sub.id)


@router.get("/{subscription_id}/state-at", response_model=SubscriptionStateAt)
def get_state_at(
    subscription_id: int,
    at: datetime = Query(..., description="ISO-8601 timestamp to reconstruct state at"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_scoped(db, subscription_id, user)
    return subscription_service.state_at(db, sub.id, at)
