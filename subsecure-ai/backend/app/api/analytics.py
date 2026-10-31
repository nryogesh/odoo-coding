from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security.dependencies import get_current_user, scoped_customer_id
from ..services import anomaly_engine, billing_engine, revenue_engine

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    billing_engine.refresh_overdue(db)
    data = revenue_engine.dashboard(db)
    scope = scoped_customer_id(user)
    if scope is not None:
        # Customers see a reduced, own-scope dashboard
        from ..models import Invoice, InvoiceStatus, Subscription

        subs = db.query(Subscription).filter(Subscription.customer_id == scope).all()
        invoices = db.query(Invoice).filter(Invoice.customer_id == scope).all()
        outstanding = sum(
            i.total - sum(p.amount for p in i.payments)
            for i in invoices
            if i.status in (InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE)
        )
        return {
            "active_subscriptions": sum(1 for s in subs if s.status.value == "ACTIVE"),
            "subscriptions": len(subs),
            "invoices": len(invoices),
            "outstanding_amount": outstanding,
            "overdue_invoice_count": sum(1 for i in invoices if i.status == InvoiceStatus.OVERDUE),
        }
    data["churn_risk"] = anomaly_engine.churn_risk_list(db)[:10]
    data["ml_anomaly"] = anomaly_engine.ml_anomaly_scores(db)
    return data


@router.get("/mrr")
def mrr(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scope = scoped_customer_id(user)
    if scope is not None:
        from ..models import Subscription, SubscriptionStatus

        subs = (
            db.query(Subscription)
            .filter(Subscription.customer_id == scope, Subscription.status == "ACTIVE")
            .all()
        )
        total = sum(revenue_engine.subscription_monthly_amount(s) for s in subs)
        return {"mrr": total, "arr": total * 12, "components": [], "scope": "own"}
    return revenue_engine.mrr_breakdown(db)


@router.get("/churn-risk")
def churn_risk(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    billing_engine.refresh_overdue(db)
    return anomaly_engine.churn_risk_list(db, customer_scope=scoped_customer_id(user))
