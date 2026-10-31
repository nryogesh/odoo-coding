"""SHA-256 hash-chained append-only audit ledger.

event_hash = SHA256(canonical_event_content + previous_hash)

Canonical content includes: sequence number, event UUID, aggregate type/ID,
event type, payload, actor ID, timestamp and previous hash — serialized as
deterministic JSON (sorted keys, fixed separators, fixed timestamp format).

Honest security note: a hash chain stored in the same database is
tamper-*evident*, not absolutely immutable. A privileged attacker able to
rewrite every row and recompute the whole chain can evade detection. An
external checkpoint anchor would strengthen this design (not implemented
in the 6-hour prototype).
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from ..models import AuditEvent

GENESIS_HASH = "0" * 64


def _canonical(obj: Any) -> str:
    """Deterministic JSON: sorted keys, tight separators, stable types."""

    def default(o):
        if isinstance(o, Decimal):
            return str(o)
        if isinstance(o, (datetime,)):
            return o.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        raise TypeError(f"Not serializable in canonical payload: {type(o)}")

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=default)


def _compute_hash(content: dict) -> str:
    return hashlib.sha256(_canonical(content).encode("utf-8")).hexdigest()


def append_event(
    db: Session,
    *,
    aggregate_type: str,
    aggregate_id: str | int,
    event_type: str,
    payload: dict,
    actor_user_id: int | None = None,
) -> AuditEvent:
    """Append a hash-chained event. Must be called inside the caller's transaction
    so the business state change and its event commit (or roll back) together."""
    last = db.query(AuditEvent).order_by(AuditEvent.sequence_num.desc()).first()
    sequence_num = (last.sequence_num + 1) if last else 1
    previous_hash = last.event_hash if last else GENESIS_HASH

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    event_id = str(uuid.uuid4())
    canonical_payload = _canonical(payload)

    content = {
        "sequence_num": sequence_num,
        "event_id": event_id,
        "aggregate_type": aggregate_type,
        "aggregate_id": str(aggregate_id),
        "event_type": event_type,
        "payload": canonical_payload,
        "actor_user_id": actor_user_id,
        "timestamp": timestamp,
        "previous_hash": previous_hash,
    }
    event = AuditEvent(
        sequence_num=sequence_num,
        event_id=event_id,
        aggregate_type=aggregate_type,
        aggregate_id=str(aggregate_id),
        event_type=event_type,
        payload=canonical_payload,
        actor_user_id=actor_user_id,
        timestamp=timestamp,
        previous_hash=previous_hash,
        event_hash=_compute_hash(content),
    )
    db.add(event)
    db.flush()  # surface constraint errors inside the caller's transaction
    return event


def verify_chain(db: Session) -> dict:
    """Recompute the whole chain. Returns verification result and the first
    invalid sequence number if tampering is detected."""
    events = db.query(AuditEvent).order_by(AuditEvent.sequence_num.asc()).all()
    previous_hash = GENESIS_HASH
    expected_seq = 1
    for ev in events:
        if ev.sequence_num != expected_seq:
            return {
                "valid": False,
                "checked_events": len(events),
                "first_invalid_sequence": ev.sequence_num,
                "message": f"Sequence gap or reordering detected at sequence {ev.sequence_num}",
            }
        if ev.previous_hash != previous_hash:
            return {
                "valid": False,
                "checked_events": len(events),
                "first_invalid_sequence": ev.sequence_num,
                "message": "Previous-hash link broken",
            }
        content = {
            "sequence_num": ev.sequence_num,
            "event_id": ev.event_id,
            "aggregate_type": ev.aggregate_type,
            "aggregate_id": ev.aggregate_id,
            "event_type": ev.event_type,
            "payload": ev.payload,
            "actor_user_id": ev.actor_user_id,
            "timestamp": ev.timestamp,
            "previous_hash": ev.previous_hash,
        }
        if _compute_hash(content) != ev.event_hash:
            return {
                "valid": False,
                "checked_events": len(events),
                "first_invalid_sequence": ev.sequence_num,
                "message": "Hash mismatch detected",
            }
        previous_hash = ev.event_hash
        expected_seq += 1
    return {
        "valid": True,
        "checked_events": len(events),
        "first_invalid_sequence": None,
        "message": "Audit chain verified",
    }


def subscription_events(db: Session, subscription_id: int) -> list[AuditEvent]:
    return (
        db.query(AuditEvent)
        .filter(
            AuditEvent.aggregate_type == "subscription",
            AuditEvent.aggregate_id == str(subscription_id),
        )
        .order_by(AuditEvent.sequence_num.asc())
        .all()
    )
