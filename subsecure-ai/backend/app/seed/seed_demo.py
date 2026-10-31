"""Demo seed data for SubSecure AI.

All audit events are generated through the same service functions the live
application uses — no fake hashes disconnected from event content.

Run:  python -m app.seed.seed_demo          (safe to re-run; skips if seeded)
Reset: delete backend/subsecure.db and run again.

Demo logins (local demo only, never real passwords):
  admin@brightloop.io  / Admin@12345
  staff@brightloop.io  / Staff@12345
  customer@acme.io     / Customer@12345
"""

from datetime import date, timedelta
from decimal import Decimal

from ..database import SessionLocal, init_db
from ..models import (
    BillingInterval,
    Customer,
    DiscountRule,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Payment,
    Plan,
    Product,
    ProductVariant,
    Role,
    Subscription,
    SubscriptionLine,
    SubscriptionStatus,
    TaxRule,
    User,
)
from ..security.password import hash_password
from ..services import audit_ledger, billing_engine
from ..utils.money import money

TODAY = date.today()


def _user(db, name, email, password, role, customer_id=None):
    user = User(
        name=name, email=email, password_hash=hash_password(password), role=role, customer_id=customer_id
    )
    db.add(user)
    db.flush()
    audit_ledger.append_event(
        db, aggregate_type="user", aggregate_id=user.id, event_type="UserCreated",
        payload={"email": email, "role": role.value}, actor_user_id=user.id,
    )
    return user


def _product(db, actor, name, ptype, price, cost, variants=None):
    p = Product(name=name, product_type=ptype, sales_price=Decimal(price), cost_price=Decimal(cost))
    db.add(p)
    db.flush()
    for vname, adj in (variants or []):
        db.add(ProductVariant(product_id=p.id, name=vname, price_adjustment=Decimal(adj)))
    audit_ledger.append_event(
        db, aggregate_type="product", aggregate_id=p.id, event_type="ProductCreated",
        payload={"name": name, "sales_price": price}, actor_user_id=actor,
    )
    return p


def _plan(db, actor, name, product, price, interval):
    plan = Plan(name=name, product_id=product.id, price=Decimal(price), billing_interval=interval)
    db.add(plan)
    db.flush()
    audit_ledger.append_event(
        db, aggregate_type="plan", aggregate_id=plan.id, event_type="PlanCreated",
        payload={"name": name, "price": price, "interval": interval.value}, actor_user_id=actor,
    )
    return plan


def _subscription(db, actor, customer, plan, lines, status, start, expiry, next_billing=None, number=None):
    count = db.query(Subscription).count()
    sub = Subscription(
        subscription_number=number or f"SUB-{1000 + count + 1}",
        customer_id=customer.id,
        plan_id=plan.id,
        start_date=start,
        expiry_date=expiry,
        next_billing_date=next_billing or start,
        payment_terms="NET_14",
        status=status,
    )
    db.add(sub)
    db.flush()
    for product, variant, qty in lines:
        unit_price = product.sales_price + (variant.price_adjustment if variant else Decimal("0"))
        db.add(
            SubscriptionLine(
                subscription_id=sub.id, product_id=product.id,
                variant_id=variant.id if variant else None, quantity=qty, unit_price=money(unit_price),
            )
        )
    audit_ledger.append_event(
        db, aggregate_type="subscription", aggregate_id=sub.id, event_type="SubscriptionCreated",
        payload={"subscription_number": sub.subscription_number, "customer_id": customer.id, "plan_id": plan.id},
        actor_user_id=actor,
    )
    if status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED):
        audit_ledger.append_event(
            db, aggregate_type="subscription", aggregate_id=sub.id, event_type="SubscriptionActivated",
            payload={"from": "CONFIRMED", "to": "ACTIVE", "subscription_number": sub.subscription_number},
            actor_user_id=actor,
        )
    if status == SubscriptionStatus.PAUSED:
        audit_ledger.append_event(
            db, aggregate_type="subscription", aggregate_id=sub.id, event_type="SubscriptionPaused",
            payload={"from": "ACTIVE", "to": "PAUSED", "subscription_number": sub.subscription_number},
            actor_user_id=actor,
        )
    if status == SubscriptionStatus.CLOSED:
        audit_ledger.append_event(
            db, aggregate_type="subscription", aggregate_id=sub.id, event_type="SubscriptionClosed",
            payload={"from": "ACTIVE", "to": "CLOSED", "subscription_number": sub.subscription_number},
            actor_user_id=actor,
        )
    return sub


def _invoice(db, actor, sub, period_key, pstart, pend, status, paid_amount=None):
    preview = billing_engine.compute_invoice_preview(db, sub)
    inv = Invoice(
        invoice_number=f"INV-{sub.subscription_number}-{period_key}",
        subscription_id=sub.id, customer_id=sub.customer_id,
        billing_period_key=period_key, billing_period_start=pstart, billing_period_end=pend,
        issue_date=pstart, due_date=pstart + timedelta(days=14),
        subtotal=preview["subtotal"], tax_total=preview["tax_total"],
        discount_total=preview["discount_total"], total=preview["total"], status=status,
    )
    db.add(inv)
    db.flush()
    for line in preview["lines"]:
        db.add(InvoiceLine(invoice_id=inv.id, **line))
    audit_ledger.append_event(
        db, aggregate_type="invoice", aggregate_id=inv.id, event_type="InvoiceGenerated",
        payload={"invoice_number": inv.invoice_number, "billing_period_key": period_key,
                 "total": preview["total"]}, actor_user_id=actor,
    )
    if status == InvoiceStatus.PAID and paid_amount:
        pay = Payment(invoice_id=inv.id, amount=money(paid_amount), method="BANK_TRANSFER",
                      payment_date=pstart + timedelta(days=5), reference=f"SEED-{inv.invoice_number}",
                      note="Seeded demo payment (simulated)", created_by=actor)
        db.add(pay)
        db.flush()
        audit_ledger.append_event(
            db, aggregate_type="invoice", aggregate_id=inv.id, event_type="PaymentReceived",
            payload={"invoice_number": inv.invoice_number, "amount": str(money(paid_amount)),
                     "invoice_now_paid": True}, actor_user_id=actor,
        )
    return inv


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded; skipping. Delete subsecure.db to reseed.")
            return

        # --- Customers (5, fictional) ---
        acme = Customer(name="Acme Technologies", email="billing@acme.io", company="Acme Technologies", region="IN-South")
        northstar = Customer(name="Northstar Retail", email="it@northstar.example", company="Northstar Retail", region="IN-North")
        pixelworks = Customer(name="PixelWorks", email="ops@pixelworks.example", company="PixelWorks Studio", region="IN-West")
        bluemont = Customer(name="Bluemont Logistics", email="finance@bluemont.example", company="Bluemont Logistics", region="IN-South")
        cider = Customer(name="Cider & Co", email="hello@cider.example", company="Cider & Co", region="IN-East")
        db.add_all([acme, northstar, pixelworks, bluemont, cider])
        db.flush()

        # --- Users (3) ---
        admin = _user(db, "Kirthi Admin", "admin@brightloop.io", "Admin@12345", Role.ADMIN)
        staff = _user(db, "Yogesh Staff", "staff@brightloop.io", "Staff@12345", Role.STAFF)
        _user(db, "Acme Customer", "customer@acme.io", "Customer@12345", Role.CUSTOMER, customer_id=acme.id)

        # --- Products (4) + Odoo variant (+₹560) ---
        crm = _product(db, admin.id, "Brightloop CRM", "SUBSCRIPTION", "5000", "1200",
                       variants=[("Odoo Brand", "560"), ("White Label", "900")])
        analytics_p = _product(db, admin.id, "Brightloop Analytics", "SUBSCRIPTION", "8000", "2000")
        support = _product(db, admin.id, "Priority Support Add-on", "ADDON", "1500", "400")
        onboarding = _product(db, admin.id, "Onboarding Package", "SERVICE", "3000", "1000")

        # --- Plans (5: daily, weekly, monthly x2, yearly) ---
        plan_crm_monthly = _plan(db, admin.id, "CRM Enterprise Monthly", crm, "5000", BillingInterval.MONTHLY)
        plan_crm_yearly = _plan(db, admin.id, "CRM Yearly", crm, "54000", BillingInterval.YEARLY)
        plan_analytics_monthly = _plan(db, admin.id, "Analytics Monthly", analytics_p, "8000", BillingInterval.MONTHLY)
        plan_support_weekly = _plan(db, admin.id, "Support Weekly", support, "1500", BillingInterval.WEEKLY)
        plan_onboarding_daily = _plan(db, admin.id, "Onboarding Daily", onboarding, "300", BillingInterval.DAILY)

        # --- Discount rules (2) + tax rule (1) ---
        db.add_all([
            DiscountRule(
                name="Enterprise Seat Discount",
                rule_json='{"name":"Enterprise Seat Discount","enabled":true,'
                          '"conditions":[{"field":"quantity","operator":"gte","value":10}],'
                          '"action":{"type":"percentage","value":15},'
                          '"valid_from":"2026-01-01","valid_until":"2026-12-31","usage_limit":100}',
                usage_limit=100,
            ),
            DiscountRule(
                name="Loyalty Fixed Discount",
                rule_json='{"name":"Loyalty Fixed Discount","enabled":true,'
                          '"conditions":[{"field":"subtotal","operator":"gte","value":20000}],'
                          '"action":{"type":"fixed","value":1000}}',
            ),
            TaxRule(name="Prototype GST 18%", region="IN", percentage=Decimal("18")),
        ])

        month_start = TODAY.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        month_key = f"{month_start.year:04d}-{month_start.month:02d}"
        last_month_key = f"{last_month_start.year:04d}-{last_month_start.month:02d}"
        month_end = month_start.replace(day=28) + timedelta(days=4)
        month_end = month_end.replace(day=1) - timedelta(days=1)

        # --- Subscriptions (10, mixed statuses) ---
        # Acme — Enterprise monthly, 12 seats (triggers discount) — ACTIVE
        sub_acme = _subscription(db, admin.id, acme, plan_crm_monthly, [(crm, None, 12)],
                                 SubscriptionStatus.ACTIVE, last_month_start, TODAY + timedelta(days=300),
                                 next_billing=month_start)
        # Northstar — yearly — ACTIVE
        sub_north = _subscription(db, admin.id, northstar, plan_crm_yearly, [(crm, None, 5)],
                                  SubscriptionStatus.ACTIVE, last_month_start, TODAY + timedelta(days=340),
                                  next_billing=month_start)
        # PixelWorks — monthly with add-on — ACTIVE
        sub_pixel = _subscription(db, admin.id, pixelworks, plan_analytics_monthly,
                                  [(analytics_p, None, 3), (support, None, 1)],
                                  SubscriptionStatus.ACTIVE, last_month_start, TODAY + timedelta(days=200),
                                  next_billing=month_start)
        # Bluemont — PAUSED
        _subscription(db, admin.id, bluemont, plan_crm_monthly, [(crm, None, 4)],
                      SubscriptionStatus.PAUSED, last_month_start, TODAY + timedelta(days=120))
        # Cider — expiring soon (4 days) — ACTIVE
        _subscription(db, admin.id, cider, plan_support_weekly, [(support, None, 2)],
                      SubscriptionStatus.ACTIVE, TODAY - timedelta(days=24), TODAY + timedelta(days=4),
                      next_billing=month_start)
        # One CLOSED subscription (churn demo)
        _subscription(db, admin.id, bluemont, plan_analytics_monthly, [(analytics_p, None, 2)],
                      SubscriptionStatus.CLOSED, last_month_start - timedelta(days=90), TODAY - timedelta(days=10))
        # Quantity-change anomaly demo: huge seat count
        sub_bulk = _subscription(db, admin.id, northstar, plan_support_weekly, [(support, None, 80)],
                                 SubscriptionStatus.ACTIVE, last_month_start, TODAY + timedelta(days=100),
                                 next_billing=month_start)
        audit_ledger.append_event(
            db, aggregate_type="subscription", aggregate_id=sub_bulk.id,
            event_type="SubscriptionQuantityChanged",
            payload={"subscription_number": sub_bulk.subscription_number, "old_quantity": 8,
                     "new_quantity": 80, "monthly_delta": "21600.00"},
            actor_user_id=admin.id,
        )
        # Two DRAFT/CONFIRMED for lifecycle demos
        _subscription(db, staff.id, cider, plan_onboarding_daily, [(onboarding, None, 1)],
                      SubscriptionStatus.CONFIRMED, TODAY, None, next_billing=TODAY)
        _subscription(db, staff.id, pixelworks, plan_crm_monthly, [(crm, None, 1)],
                      SubscriptionStatus.DRAFT, TODAY, None)

        # --- Invoices (5) incl. paid, outstanding, overdue (> ₹10,000) ---
        last_month_end = month_start - timedelta(days=1)
        # 1. PAID last month (Acme)
        _invoice(db, admin.id, sub_acme, last_month_key, last_month_start, last_month_start + timedelta(days=27),
                 InvoiceStatus.PAID, paid_amount=None)  # amount filled below
        # recompute with actual total as paid
        inv1 = db.query(Invoice).filter(Invoice.billing_period_key == last_month_key).first()
        pay1 = Payment(invoice_id=inv1.id, amount=inv1.total, method="BANK_TRANSFER",
                       payment_date=inv1.issue_date + timedelta(days=4), reference=f"SEED-{inv1.invoice_number}",
                       note="Seeded demo payment (simulated)", created_by=admin.id)
        db.add(pay1)
        db.flush()
        audit_ledger.append_event(
            db, aggregate_type="invoice", aggregate_id=inv1.id, event_type="PaymentReceived",
            payload={"invoice_number": inv1.invoice_number, "amount": str(inv1.total), "invoice_now_paid": True},
            actor_user_id=admin.id,
        )
        # 2. OVERDUE invoice above ₹10,000 (Northstar yearly partial billed monthly slice demo)
        _invoice(db, admin.id, sub_north, f"{last_month_key}-NS", last_month_start - timedelta(days=40),
                 last_month_start - timedelta(days=20), InvoiceStatus.OVERDUE)
        # 3. CONFIRMED outstanding (PixelWorks)
        _invoice(db, admin.id, sub_pixel, f"{last_month_key}-PW", last_month_start, last_month_end,
                 InvoiceStatus.CONFIRMED)
        # 4. CONFIRMED outstanding with PARTIAL payment (Acme add-on)
        inv4 = _invoice(db, admin.id, sub_acme, f"{last_month_key}-ADDON", last_month_start, last_month_end,
                        InvoiceStatus.CONFIRMED)
        pay2 = Payment(invoice_id=inv1.id, amount=money(inv1.total / 2), method="UPI",
                       payment_date=TODAY - timedelta(days=2), reference="SEED-PARTIAL",
                       note="Seeded partial payment (simulated)", created_by=staff.id)
        # attach partial payment to the outstanding invoice instead
        pay2.invoice_id = inv4.id
        pay2.amount = money(inv4.total / 2)
        db.add(pay2)
        db.flush()
        audit_ledger.append_event(
            db, aggregate_type="invoice", aggregate_id=inv4.id, event_type="PaymentReceived",
            payload={"invoice_number": inv4.invoice_number, "amount": str(money(inv4.total / 2)),
                     "invoice_now_paid": False}, actor_user_id=staff.id,
        )
        # 5. DRAFT invoice (workflow demo)
        _invoice(db, staff.id, sub_bulk, f"{month_key}-DRAFT", month_start, month_end, InvoiceStatus.DRAFT)

        db.commit()

        # --- Verify chain as a final sanity check ---
        result = audit_ledger.verify_chain(db)
        assert result["valid"], f"Seed produced an invalid audit chain: {result}"
        print(f"Seed complete: {result['checked_events']} audit events, chain verified.")
        print("Demo logins: admin@brightloop.io/Admin@12345 | staff@brightloop.io/Staff@12345 | customer@acme.io/Customer@12345")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
