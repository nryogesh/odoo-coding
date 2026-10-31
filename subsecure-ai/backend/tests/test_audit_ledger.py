"""Test 2 (ledger integrity + controlled tampering)."""

from app.database import SessionLocal
from app.models import AuditEvent
from app.services import audit_ledger


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_chain_verifies(client, admin_token):
    resp = client.post("/api/v1/audit/verify", headers=auth(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert body["checked_events"] > 0
    assert body["first_invalid_sequence"] is None


def test_genesis_hash(client, admin_token):
    events = client.get("/api/v1/audit/events?limit=500", headers=auth(admin_token)).json()
    first = min(events, key=lambda e: e["sequence_num"])
    assert first["sequence_num"] == 1
    assert first["previous_hash"] == "0" * 64
    assert len(first["event_hash"]) == 64


def test_tampering_detected(client, admin_token):
    db = SessionLocal()
    try:
        victim = db.query(AuditEvent).filter(AuditEvent.sequence_num == 3).first()
        original = victim.payload
        victim.payload = '{"tampered":true}'
        db.commit()

        result = audit_ledger.verify_chain(db)
        assert result["valid"] is False
        assert result["first_invalid_sequence"] == 3
        assert "mismatch" in result["message"].lower() or "detected" in result["message"].lower()
    finally:
        # Restore the database so other tests see an intact chain
        victim.payload = original
        db.commit()
        db.close()

    resp = client.post("/api/v1/audit/verify", headers=auth(admin_token))
    assert resp.json()["valid"] is True


def test_events_are_append_only_shape(client, admin_token):
    events = client.get("/api/v1/audit/events?limit=500", headers=auth(admin_token)).json()
    seqs = sorted(e["sequence_num"] for e in events)
    assert seqs == list(range(1, len(seqs) + 1)), "Sequence numbers must be gapless"
