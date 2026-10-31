# Role matrix is enforced through require_roles() dependencies in each router.
# Kept as a module per project structure; the authoritative checks live in
# app/security/dependencies.py and are applied per-endpoint.
from ..models import Role

ADMIN_ONLY = (Role.ADMIN,)
ADMIN_STAFF = (Role.ADMIN, Role.STAFF)
ALL_ROLES = (Role.ADMIN, Role.STAFF, Role.CUSTOMER)
