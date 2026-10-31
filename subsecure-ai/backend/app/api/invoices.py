from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Invoice, InvoiceStatus, Role, User
from ..schemas.invoice import InvoiceBalanceOut, InvoiceOut
from ..security.dependencies import get_current_user, require_roles, scoped_customer_id
from ..services import audit_ledger, billing_engine
from ..utils.money import money

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _serialize(inv: Invoice) -> dict:
    paid = sum(p.amount for p in inv.payments)
    data = InvoiceOut.model_validate(inv).model_dump()
    data["amount_paid"] = money(paid)
    data["balance"] = money(inv.total - paid)
    return data


def _get_scoped(db: Session, invoice_id: int, user: User) -> Invoice:
    inv = db.get(Invoice, invoice_id)
    scope = scoped_customer_id(user)
    if not inv or (scope is not None and inv.customer_id != scope):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.get("", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    billing_engine.refresh_overdue(db)
    query = db.query(Invoice)
    scope = scoped_customer_id(user)
    if scope is not None:
        query = query.filter(Invoice.customer_id == scope)
    return [_serialize(i) for i in query.order_by(Invoice.id.desc()).all()]


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    billing_engine.refresh_overdue(db)
    return _serialize(_get_scoped(db, invoice_id, user))


@router.get("/{invoice_id}/balance", response_model=InvoiceBalanceOut)
def get_balance(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = _get_scoped(db, invoice_id, user)
    paid = money(sum(p.amount for p in inv.payments))
    return InvoiceBalanceOut(
        invoice_id=inv.id,
        invoice_number=inv.invoice_number,
        total=money(inv.total),
        amount_paid=paid,
        balance=money(inv.total - paid),
        status=inv.status.value,
    )


@router.post("/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Only DRAFT invoices can be confirmed (current: {inv.status.value})")
    inv.status = InvoiceStatus.CONFIRMED
    audit_ledger.append_event(
        db,
        aggregate_type="invoice",
        aggregate_id=inv.id,
        event_type="InvoiceConfirmed",
        payload={"invoice_number": inv.invoice_number},
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(inv)
    return _serialize(inv)


@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="Paid invoices cannot be cancelled")
    inv.status = InvoiceStatus.CANCELLED
    audit_ledger.append_event(
        db,
        aggregate_type="invoice",
        aggregate_id=inv.id,
        event_type="InvoiceCancelled",
        payload={"invoice_number": inv.invoice_number},
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(inv)
    return _serialize(inv)
