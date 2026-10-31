import re

import bcrypt

_SPECIAL = re.compile(r"[^A-Za-z0-9]")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def validate_password_policy(password: str) -> list[str]:
    """Return a list of policy violations (empty list = valid).

    Policy: more than 8 characters, at least one uppercase, one lowercase,
    one special character.
    """
    errors: list[str] = []
    if len(password) <= 8:
        errors.append("Password must be more than 8 characters long")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    if not _SPECIAL.search(password):
        errors.append("Password must contain at least one special character")
    return errors
