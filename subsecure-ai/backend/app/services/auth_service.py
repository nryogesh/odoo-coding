from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import Customer, Role, User
from ..security.password import hash_password, validate_password_policy, verify_password
from . import audit_ledger


def register_customer(db: Session, *, name: str, email: str, password: str, company: str | None) -> User:
    errors = validate_password_policy(password)
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)
    if db.query(User).filter(User.email == email.lower()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    customer = Customer(name=name, email=email.lower(), company=company)
    db.add(customer)
    db.flush()

    user = User(
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        role=Role.CUSTOMER,
        customer_id=customer.id,
    )
    db.add(user)
    db.flush()
    audit_ledger.append_event(
        db,
        aggregate_type="user",
        aggregate_id=user.id,
        event_type="UserCreated",
        payload={"email": user.email, "role": user.role.value, "customer_id": customer.id},
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(user)
    return user


def create_staff(db: Session, *, name: str, email: str, password: str, actor: User) -> User:
    errors = validate_password_policy(password)
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)
    if db.query(User).filter(User.email == email.lower()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        name=name, email=email.lower(), password_hash=hash_password(password), role=Role.STAFF
    )
    db.add(user)
    db.flush()
    audit_ledger.append_event(
        db,
        aggregate_type="user",
        aggregate_id=user.id,
        event_type="UserCreated",
        payload={"email": user.email, "role": user.role.value},
        actor_user_id=actor.id,
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, *, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
