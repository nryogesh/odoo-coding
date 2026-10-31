from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Customer,
    Product,
    ProductVariant,
    Quotation,
    QuotationLine,
    QuotationStatus,
    Role,
    User,
)
from ..schemas.subscription import QuotationCreate, QuotationOut, TransitionRequest
from ..security.dependencies import get_current_user, require_roles, scoped_customer_id
from ..services import audit_ledger, billing_engine, subscription_service
from ..utils.money import money

router = APIRouter(prefix="/quotations", tags=["quotations"])

_QUOTATION_TRANSITIONS = {
    QuotationStatus.DRAFT: {QuotationStatus.QUOTATION, QuotationStatus.CLOSED},
    QuotationStatus.QUOTATION: {QuotationStatus.CONFIRMED, QuotationStatus.CLOSED},
    QuotationStatus.CONFIRMED: {QuotationStatus.ACTIVE, QuotationStatus.CLOSED},
    QuotationStatus.ACTIVE: {QuotationStatus.CLOSED},
    QuotationStatus.CLOSED: set(),
}


@router.get("", response_model=list[QuotationOut])
def list_quotations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Quotation)
    scope = scoped_customer_id(user)
    if scope is not None:
        query = query.filter(Quotation.customer_id == scope)
    return query.all()


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    if not db.get(Customer, payload.customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")

    count = db.query(Quotation).count()
    quotation = Quotation(
        quotation_number=f"QUO-{1000 + count + 1}",
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        valid_until=payload.valid_until,
        status=QuotationStatus.DRAFT,
        created_by=user.id,
    )
    db.add(quotation)
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
            unit_price = money(unit_price + variant.price_adjustment)  # variant surcharge
        db.add(
            QuotationLine(
                quotation_id=quotation.id,
                product_id=product.id,
                variant_id=line.variant_id,
                quantity=line.quantity,
                unit_price=unit_price,
            )
        )
    db.flush()

    quotation.subtotal = money(sum(l.quantity * l.unit_price for l in quotation.lines))
    quotation.discount_total = money(quotation.subtotal * payload.discount_percent / 100)
    taxable = quotation.subtotal - quotation.discount_total
    quotation.tax_total = money(taxable * payload.tax_percent / 100)
    quotation.total = money(taxable + quotation.tax_total)
    audit_ledger.append_event(
        db,
        aggregate_type="quotation",
        aggregate_id=quotation.id,
        event_type="QuotationCreated",
        payload={
            "quotation_number": quotation.quotation_number,
            "customer_id": quotation.customer_id,
            "subtotal": quotation.subtotal,
            "discount_total": quotation.discount_total,
            "tax_total": quotation.tax_total,
            "total": quotation.total,
        },
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/{quotation_id}/transition", response_model=QuotationOut)
def transition_quotation(
    quotation_id: int,
    payload: TransitionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    quotation = db.get(Quotation, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    try:
        target = QuotationStatus[payload.action.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown action {payload.action!r}")

    allowed = _QUOTATION_TRANSITIONS.get(quotation.status, set())
    if target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition {quotation.status.value} -> {target.value}. Allowed: {sorted(s.value for s in allowed) or 'none'}",
        )

    quotation.status = target
    audit_ledger.append_event(
        db,
        aggregate_type="quotation",
        aggregate_id=quotation.id,
        event_type="QuotationConfirmed" if target == QuotationStatus.CONFIRMED else f"Quotation{target.value.title()}",
        payload={"quotation_number": quotation.quotation_number, "to": target.value},
        actor_user_id=user.id,
    )

    if target == QuotationStatus.ACTIVE:
        # Confirmed quotation converts to a subscription (creates subscription event).
        quotation.status = QuotationStatus.CONFIRMED
        db.flush()
        subscription_service.create_from_quotation(db, quotation, user.id)
        db.refresh(quotation)
        return quotation

    db.commit()
    db.refresh(quotation)
    return quotation
