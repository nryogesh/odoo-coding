from sqlalchemy.orm import Session

from ..models import BillingIdempotency


def build_key(subscription_id: int, billing_period_key: str) -> str:
    return f"{subscription_id}:{billing_period_key}"


def is_billed(db: Session, subscription_id: int, billing_period_key: str) -> bool:
    return (
        db.query(BillingIdempotency)
        .filter(BillingIdempotency.idempotency_key == build_key(subscription_id, billing_period_key))
        .first()
        is not None
    )
