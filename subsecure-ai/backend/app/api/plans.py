from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import BillingInterval, Plan, Product, Role, User
from ..schemas.product import PlanCreate, PlanOut
from ..security.dependencies import get_current_user, require_roles
from ..services import audit_ledger

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Plan).filter(Plan.is_active.is_(True)).all()


@router.post("", response_model=PlanOut, status_code=201)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    if not db.get(Product, payload.product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    plan = Plan(
        name=payload.name,
        product_id=payload.product_id,
        price=payload.price,
        billing_interval=BillingInterval(payload.billing_interval),
        minimum_quantity=payload.minimum_quantity,
        available_from=date.fromisoformat(payload.available_from) if payload.available_from else None,
        available_until=date.fromisoformat(payload.available_until) if payload.available_until else None,
        auto_close=payload.auto_close,
        allow_early_close=payload.allow_early_close,
        allow_pause=payload.allow_pause,
        allow_renewal=payload.allow_renewal,
    )
    db.add(plan)
    db.flush()
    audit_ledger.append_event(
        db,
        aggregate_type="plan",
        aggregate_id=plan.id,
        event_type="PlanCreated",
        payload={"name": plan.name, "price": plan.price, "interval": plan.billing_interval.value},
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(plan)
    return plan
