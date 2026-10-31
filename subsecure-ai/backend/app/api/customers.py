from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Customer, Role, User
from ..security.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.CUSTOMER:
        # Customers only ever see their own profile
        c = db.get(Customer, user.customer_id) if user.customer_id else None
        return [_serialize(c)] if c else []
    return [_serialize(c) for c in db.query(Customer).all()]


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == Role.CUSTOMER and user.customer_id != customer_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _serialize(customer)


def _serialize(c: Customer) -> dict:
    return {"id": c.id, "name": c.name, "email": c.email, "company": c.company, "region": c.region}
