from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Role, User
from ..schemas.auth import (
    LoginRequest,
    RegisterRequest,
    StaffCreateRequest,
    TokenResponse,
    UserOut,
)
from ..security.dependencies import create_access_token, get_current_user, require_roles
from ..services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Customer self-registration. Role is always CUSTOMER — never trust client input."""
    user = auth_service.register_customer(
        db, name=payload.name, email=payload.email, password=payload.password, company=payload.company
    )
    return TokenResponse(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return TokenResponse(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/staff", response_model=UserOut, status_code=201)
def create_staff(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.ADMIN)),
):
    """Only Admin can create staff users."""
    user = auth_service.create_staff(
        db, name=payload.name, email=payload.email, password=payload.password, actor=admin
    )
    return UserOut.model_validate(user)
