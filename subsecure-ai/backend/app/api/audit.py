from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditEvent, Role, SecurityAlert, User
from ..schemas.subscription import AuditEventOut
from ..security.dependencies import get_current_user, require_roles
from ..services import audit_ledger

router = APIRouter(tags=["audit"])


@router.get("/audit/events", response_model=list[AuditEventOut])
def list_events(
    limit: int = Query(default=100, le=500),
    aggregate_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    query = db.query(AuditEvent)
    if aggregate_type:
        query = query.filter(AuditEvent.aggregate_type == aggregate_type)
    return query.order_by(AuditEvent.sequence_num.desc()).limit(limit).all()


@router.post("/audit/verify")
def verify(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Verify the SHA-256 hash chain. Any authenticated user may verify;
    tampering is reported with the first invalid sequence number."""
    result = audit_ledger.verify_chain(db)
    if not result["valid"]:
        db.add(
            SecurityAlert(
                alert_type="AUDIT_CHAIN_INVALID",
                severity="HIGH",
                description=f"Audit verification failed: {result['message']} at sequence {result['first_invalid_sequence']}",
                related_entity_type="audit_events",
                related_entity_id=str(result["first_invalid_sequence"]),
            )
        )
        db.commit()
    return result


@router.get("/security/alerts")
def security_alerts(
    resolved: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    query = db.query(SecurityAlert)
    if resolved is not None:
        query = query.filter(SecurityAlert.resolved.is_(resolved))
    alerts = query.order_by(SecurityAlert.id.desc()).limit(200).all()
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "description": a.description,
            "related_entity_type": a.related_entity_type,
            "related_entity_id": a.related_entity_id,
            "resolved": a.resolved,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts
    ]
