from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Role, User
from ..schemas.billing import (
    BillingExecuteRequest,
    BillingExecuteResponse,
    BillingSimulateRequest,
    BillingSimulationResponse,
)
from ..security.dependencies import require_roles
from ..services import billing_engine

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/simulate", response_model=BillingSimulationResponse)
def simulate(
    payload: BillingSimulateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    """Billing Day Rehearsal: dry-run only, never writes invoices or payments."""
    return billing_engine.simulate_billing(db, payload.billing_period_key, user.id)


@router.post("/execute", response_model=BillingExecuteResponse)
def execute(
    payload: BillingExecuteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    if not payload.confirm:
        raise HTTPException(
            status_code=400,
            detail="Execution requires explicit confirmation (confirm=true). Run /billing/simulate first.",
        )
    return billing_engine.execute_billing(db, payload.billing_period_key, user.id)
