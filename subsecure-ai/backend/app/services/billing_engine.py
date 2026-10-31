"""Billing engine: invoice preview, dry-run simulation and safe execution.

Calculation order (documented prototype policy):
  1. Line subtotal  = quantity x unit price (unit price already includes variant surcharge)
  2. Eligible discount rules applied once, on the subtotal
  3. Tax computed on the discounted taxable amount
  4. Total = subtotal - discount + tax

Duplicate-billing protection: a unique constraint on billing_idempotency.idempotency_key
(subscription_id + billing_period_key) plus a unique constraint on
invoices(subscription_id, billing_period_key). Concurrent duplicate requests lose the
race at the database level and are returned as DUPLICATE results.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import (
    BillingIdempotency,
    BillingRun,
    BillingRunStatus,
    DiscountRule,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    SecurityAlert,
    Subscription,
    SubscriptionStatus,
    TaxRule,
)
from ..utils.dates import add_interval, parse_period_key, period_key_for
from ..utils.money import money
from . import audit_ledger, idempotency_service, rule_engine


def _default_period_key(today: date | None = None) -> str:
    today = today or date.today()
    return f"{today.year:04d}-{today.month:02d}"


def evaluate_discounts(
    db: Session,
    sub: Subscription,
    subtotal: Decimal,
    today: date,
    *,
    consume_usage: bool = False,
) -> tuple[Decimal, list[str]]:
    """Apply all eligible discount rules once each. Returns (discount_total, applied_rule_names)."""
    total_qty = sum(line.quantity for line in sub.lines)
    discount_total = Decimal("0")
    applied: list[str] = []
    rules = db.query(DiscountRule).filter(DiscountRule.is_active.is_(True)).all()
    for rule in rules:
        try:
            spec = rule_engine.parse_discount_rule(rule.rule_json)
        except ValueError:
            continue  # skip malformed stored rules rather than crash billing
        for line in sub.lines:
            context = {
                "quantity": total_qty,
                "subtotal": str(subtotal),
                "product_id": line.product_id,
                "customer_region": getattr(sub, "customer_region", None),
                "subscription_type": sub.plan.billing_interval.value if sub.plan else None,
            }
            if rule_engine.rule_applies(spec, context=context, usage_count=rule.usage_count, today=today):
                discount_total += rule_engine.discount_amount(spec, subtotal)
                applied.append(spec.name)
                if consume_usage:
                    rule.usage_count = (rule.usage_count or 0) + 1
                break  # apply each rule at most once per invoice
    return money(min(discount_total, subtotal)), applied


def active_tax(db: Session) -> Decimal:
    rule = db.query(TaxRule).filter(TaxRule.is_active.is_(True)).first()
    return rule.percentage if rule else Decimal("0")


def compute_invoice_preview(
    db: Session,
    sub: Subscription,
    today: date | None = None,
    *,
    consume_discount_usage: bool = False,
) -> dict:
    today = today or date.today()
    lines = []
    subtotal = Decimal("0")
    for line in sub.lines:
        line_total = money(Decimal(line.quantity) * line.unit_price)
        subtotal += line_total
        lines.append(
            {
                "product_id": line.product_id,
                "description": f"Subscription {sub.subscription_number} - product #{line.product_id}",
                "quantity": line.quantity,
                "unit_price": money(line.unit_price),
                "line_total": line_total,
            }
        )
    subtotal = money(subtotal)
    discount_total, applied_rules = evaluate_discounts(
        db, sub, subtotal, today, consume_usage=consume_discount_usage
    )
    taxable = subtotal - discount_total
    tax_total = money(taxable * active_tax(db) / Decimal("100"))
    total = money(taxable + tax_total)
    return {
        "lines": lines,
        "subtotal": subtotal,
        "discount_total": discount_total,
        "tax_total": tax_total,
        "total": total,
        "applied_rules": applied_rules,
    }


def _anomaly_flags(db: Session, sub: Subscription, preview: dict) -> list[str]:
    """Deterministic warning signals only — they never block by themselves here."""
    flags: list[str] = []
    for line in sub.lines:
        if line.quantity >= 50:
            flags.append(f"Unusual quantity ({line.quantity}) on subscription {sub.subscription_number}")
    if subtotal := preview["subtotal"]:
        if preview["discount_total"] > subtotal * Decimal("0.5"):
            flags.append(f"Excessive discount (>50%) on subscription {sub.subscription_number}")
    return flags


def simulate_billing(db: Session, period_key: str | None, actor_user_id: int | None) -> dict:
    """Dry run. Never creates invoices or payments."""
    period_key = period_key or _default_period_key()
    period_start, period_end = parse_period_key(period_key)
    today = date.today()

    subs = (
        db.query(Subscription)
        .filter(
            Subscription.status.in_(
                [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PAUSED,
                    SubscriptionStatus.CLOSED,
                    SubscriptionStatus.EXPIRED,
                ]
            )
        )
        .all()
    )

    items, warnings = [], []
    ready = skipped = blocked = 0
    expected_total = tax_total = discount_total = Decimal("0")

    for sub in subs:
        item = {
            "subscription_id": sub.id,
            "subscription_number": sub.subscription_number,
            "customer_id": sub.customer_id,
            "status": None,
            "reason": None,
            "subtotal": None,
            "discount_total": None,
            "tax_total": None,
            "total": None,
            "anomaly_flags": [],
        }
        if sub.status != SubscriptionStatus.ACTIVE:
            item["status"] = "SKIPPED"
            item["reason"] = f"Subscription is {sub.status.value}"
            skipped += 1
        elif sub.next_billing_date and sub.next_billing_date > period_end:
            item["status"] = "SKIPPED"
            item["reason"] = f"Not due yet (next billing {sub.next_billing_date.isoformat()})"
            skipped += 1
        elif sub.expiry_date and sub.expiry_date < period_start:
            item["status"] = "SKIPPED"
            item["reason"] = "Subscription expired before this period"
            skipped += 1
        elif idempotency_service.is_billed(db, sub.id, period_key):
            item["status"] = "SKIPPED"
            item["reason"] = "Already billed for this period"
            skipped += 1
        elif not sub.lines:
            item["status"] = "BLOCKED"
            item["reason"] = "Subscription has no billable lines"
            blocked += 1
            warnings.append(f"{sub.subscription_number}: no billable lines")
        else:
            preview = compute_invoice_preview(db, sub, today)
            flags = _anomaly_flags(db, sub, preview)
            item.update(
                status="READY",
                subtotal=preview["subtotal"],
                discount_total=preview["discount_total"],
                tax_total=preview["tax_total"],
                total=preview["total"],
                anomaly_flags=flags,
            )
            warnings.extend(flags)
            ready += 1
            expected_total += preview["total"]
            tax_total += preview["tax_total"]
            discount_total += preview["discount_total"]
        items.append(item)

    return {
        "period": period_key,
        "eligible_count": ready + skipped + blocked,
        "ready_count": ready,
        "skipped_count": skipped,
        "blocked_count": blocked,
        "expected_total": money(expected_total),
        "tax_total": money(tax_total),
        "discount_total": money(discount_total),
        "items": items,
        "warnings": warnings,
        "dry_run": True,
    }


def _generate_invoice(db: Session, sub: Subscription, period_key: str, actor_user_id: int | None) -> Invoice:
    """Create invoice + idempotency key + audit event in one transaction.

    Relies on the DB unique constraint to defeat concurrent duplicates."""
    today = date.today()
    period_start, period_end = parse_period_key(period_key)
    preview = compute_invoice_preview(db, sub, today, consume_discount_usage=True)

    invoice = Invoice(
        invoice_number=f"INV-{sub.subscription_number}-{period_key}",
        subscription_id=sub.id,
        customer_id=sub.customer_id,
        billing_period_key=period_key,
        billing_period_start=period_start,
        billing_period_end=period_end,
        issue_date=today,
        due_date=today + timedelta(days=14),
        subtotal=preview["subtotal"],
        tax_total=preview["tax_total"],
        discount_total=preview["discount_total"],
        total=preview["total"],
        status=InvoiceStatus.CONFIRMED,
    )
    db.add(invoice)
    db.flush()

    for line in preview["lines"]:
        db.add(InvoiceLine(invoice_id=invoice.id, **line))

    key = idempotency_service.build_key(sub.id, period_key)
    db.add(
        BillingIdempotency(
            idempotency_key=key,
            subscription_id=sub.id,
            billing_period_key=period_key,
            invoice_id=invoice.id,
        )
    )
    db.flush()  # IntegrityError raised here on duplicate key

    audit_ledger.append_event(
        db,
        aggregate_type="invoice",
        aggregate_id=invoice.id,
        event_type="InvoiceGenerated",
        payload={
            "invoice_number": invoice.invoice_number,
            "subscription_id": sub.id,
            "billing_period_key": period_key,
            "subtotal": preview["subtotal"],
            "discount_total": preview["discount_total"],
            "tax_total": preview["tax_total"],
            "total": preview["total"],
            "applied_rules": preview["applied_rules"],
        },
        actor_user_id=actor_user_id,
    )
    if preview["applied_rules"]:
        audit_ledger.append_event(
            db,
            aggregate_type="invoice",
            aggregate_id=invoice.id,
            event_type="DiscountApplied",
            payload={"rules": preview["applied_rules"], "discount_total": preview["discount_total"]},
            actor_user_id=actor_user_id,
        )

    # advance the subscription's next billing date by its plan interval
    if sub.plan and sub.next_billing_date:
        sub.next_billing_date = add_interval(sub.next_billing_date, sub.plan.billing_interval.value)
    return invoice


def execute_billing(db: Session, period_key: str | None, actor_user_id: int | None) -> dict:
    """Real billing run. Revalidates eligibility; safe against duplicates via DB constraint."""
    period_key = period_key or _default_period_key()
    sim = simulate_billing(db, period_key, actor_user_id)  # revalidation, records SIMULATED run

    items = []
    generated = duplicates = failed = 0

    for item in sim["items"]:
        if item["status"] != "READY":
            # Surface already-billed subscriptions as explicit DUPLICATE results
            if item["status"] == "SKIPPED" and item["reason"] == "Already billed for this period":
                existing = (
                    db.query(Invoice)
                    .filter(
                        Invoice.subscription_id == item["subscription_id"],
                        Invoice.billing_period_key == period_key,
                    )
                    .first()
                )
                items.append(
                    {
                        "subscription_id": item["subscription_id"],
                        "subscription_number": item["subscription_number"],
                        "result": "DUPLICATE",
                        "invoice_id": existing.id if existing else None,
                        "invoice_number": existing.invoice_number if existing else None,
                        "message": "Already billed for this period; existing invoice returned",
                    }
                )
                duplicates += 1
                _record_duplicate_attempt(
                    db, db.get(Subscription, item["subscription_id"]), period_key, actor_user_id
                )
            continue
        sub = db.get(Subscription, item["subscription_id"])
        entry = {
            "subscription_id": sub.id,
            "subscription_number": sub.subscription_number,
            "result": None,
            "invoice_id": None,
            "invoice_number": None,
            "message": None,
        }
        try:
            # Nested transaction: a duplicate/failure rolls back only this invoice.
            with db.begin_nested():
                invoice = _generate_invoice(db, sub, period_key, actor_user_id)
            db.commit()
            entry.update(result="GENERATED", invoice_id=invoice.id, invoice_number=invoice.invoice_number)
            generated += 1
        except IntegrityError:
            db.rollback()
            existing = (
                db.query(Invoice)
                .filter(Invoice.subscription_id == sub.id, Invoice.billing_period_key == period_key)
                .first()
            )
            entry.update(
                result="DUPLICATE",
                invoice_id=existing.id if existing else None,
                invoice_number=existing.invoice_number if existing else None,
                message="Already billed for this period; existing invoice returned",
            )
            duplicates += 1
            _record_duplicate_attempt(db, sub, period_key, actor_user_id)
        except Exception as exc:  # noqa: BLE001 - per-item failure isolation
            db.rollback()
            entry.update(result="FAILED", message=str(exc)[:200])
            failed += 1
        items.append(entry)

    run = BillingRun(
        billing_period_key=period_key,
        status=BillingRunStatus.EXECUTED if failed == 0 else BillingRunStatus.FAILED,
        eligible_count=sim["eligible_count"],
        ready_count=generated,
        skipped_count=duplicates,
        blocked_count=failed,
        expected_total=sim["expected_total"],
        tax_total=sim["tax_total"],
        discount_total=sim["discount_total"],
        created_by=actor_user_id,
    )
    db.add(run)
    db.flush()
    audit_ledger.append_event(
        db,
        aggregate_type="billing_run",
        aggregate_id=run.id,
        event_type="BillingBatchExecuted",
        payload={
            "billing_period_key": period_key,
            "generated": generated,
            "duplicates": duplicates,
            "failed": failed,
        },
        actor_user_id=actor_user_id,
    )
    db.commit()

    return {
        "period": period_key,
        "generated_count": generated,
        "duplicate_count": duplicates,
        "failed_count": failed,
        "items": items,
    }


def _record_duplicate_attempt(db: Session, sub: Subscription, period_key: str, actor_user_id: int | None) -> None:
    recent = (
        db.query(SecurityAlert)
        .filter(
            SecurityAlert.alert_type == "DUPLICATE_BILLING_ATTEMPT",
            SecurityAlert.related_entity_id == str(sub.id),
            SecurityAlert.resolved.is_(False),
        )
        .count()
    )
    severity = "MEDIUM" if recent >= 1 else "LOW"  # repeated attempts escalate
    db.add(
        SecurityAlert(
            alert_type="DUPLICATE_BILLING_ATTEMPT",
            severity=severity,
            description=f"Duplicate billing attempt blocked for {sub.subscription_number} period {period_key}",
            related_entity_type="subscription",
            related_entity_id=str(sub.id),
        )
    )
    db.commit()


def refresh_overdue(db: Session) -> int:
    """Mark confirmed invoices past due date as OVERDUE. Returns count changed."""
    today = date.today()
    updated = 0
    for inv in db.query(Invoice).filter(Invoice.status == InvoiceStatus.CONFIRMED).all():
        if inv.due_date < today:
            inv.status = InvoiceStatus.OVERDUE
            updated += 1
    if updated:
        db.commit()
    return updated
