from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, ProductVariant, Role, User
from ..schemas.product import ProductCreate, ProductOut
from ..security.dependencies import get_current_user, require_roles
from ..services import audit_ledger

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Product).filter(Product.is_active.is_(True)).all()


@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN, Role.STAFF)),
):
    product = Product(
        name=payload.name,
        product_type=payload.product_type,
        sales_price=payload.sales_price,
        cost_price=payload.cost_price,
        notes=payload.notes,
    )
    db.add(product)
    db.flush()
    for v in payload.variants:
        db.add(ProductVariant(product_id=product.id, name=v.name, price_adjustment=v.price_adjustment))
    audit_ledger.append_event(
        db,
        aggregate_type="product",
        aggregate_id=product.id,
        event_type="ProductCreated",
        payload={"name": product.name, "sales_price": product.sales_price},
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
