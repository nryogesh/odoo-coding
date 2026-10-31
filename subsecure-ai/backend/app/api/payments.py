from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Invoice, InvoiceStatus, Payment, Role, User
from ..schemas.payment import PaymentCreate, PaymentOut
from ..security.dependencies import get_current_user, require_roles, scoped_customer_id
from ..services import audit_ledger
from ..utils.money import money

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Payment).join(Invoice, Payment.invoice_id == Invoice.id)
    scope = scoped_customer_id(user)
    if scope is not None:
        query = query.filter(Invoice.customer_id == scope)
    return query.order_by(Payment.id.desc()).all()


@router.post("", response_model=PaymentOut, status_code=201)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    """Simulated payment entry — no real payment gateway is connected.
    Partial payments are supported; the invoice becomes PAID only when
    allocated payments cover the total."""
    inv = db.get(Invoice, payload.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status in (InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT):
        raise HTTPException(status_code=400, detail=f"Cannot pay a {inv.status.value} invoice")

    paid = sum(p.amount for p in inv.payments)
    balance = inv.total - paid
    if balance <= 0:
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")
    if payload.amount > balance:
        raise HTTPException(
            status_code=400,
            detail=f"Amount {payload.amount} exceeds outstanding balance {money(balance)}",
        )

    payment = Payment(
        invoice_id=inv.id,
        amount=payload.amount,
        method=payload.method,
        payment_date=payload.payment_date or date.today(),
        reference=payload.reference,
        note=payload.note,
        created_by=user.id,
    )
    db.add(payment)
    db.flush()

    new_paid = paid + payload.amount
    fully_paid = new_paid >= inv.total
    if fully_paid:
        inv.status = InvoiceStatus.PAID

    audit_ledger.append_event(
        db,
        aggregate_type="invoice",
        aggregate_id=inv.id,
        event_type="PaymentReceived",
        payload={
            "invoice_number": inv.invoice_number,
            "amount": payload.amount,
            "method": payment.method,
            "reference": payment.reference,
            "invoice_now_paid": fully_paid,
        },
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(payment)
    return payment
