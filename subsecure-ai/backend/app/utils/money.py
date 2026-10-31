from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")


def money(value) -> Decimal:
    """Quantize any numeric input to 2 decimal places, ROUND_HALF_UP."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def money_str(value) -> str:
    """Serialize a monetary value as a fixed 2-decimal string (API contract format)."""
    return str(money(value))
