from datetime import date, timedelta


def add_interval(d: date, interval: str) -> date:
    """Advance a date by one billing interval."""
    if interval == "DAILY":
        return d + timedelta(days=1)
    if interval == "WEEKLY":
        return d + timedelta(weeks=1)
    if interval == "MONTHLY":
        return add_months(d, 1)
    if interval == "YEARLY":
        return add_months(d, 12)
    raise ValueError(f"Unknown billing interval: {interval}")


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)
    return (nxt - date(year, month, 1)).days


def parse_period_key(key: str) -> tuple[date, date]:
    """Parse a billing period key into (start, end) dates (end inclusive).

    Supported formats:
      - "2026-10"                      -> whole month
      - "2026-10-01_to_2026-10-07"     -> explicit range
    """
    if "_to_" in key:
        a, b = key.split("_to_", 1)
        return date.fromisoformat(a), date.fromisoformat(b)
    year, month = key.split("-")
    start = date(int(year), int(month), 1)
    end = start.replace(day=_days_in_month(start.year, start.month))
    return start, end


def period_key_for(d: date, interval: str) -> str:
    """Build a deterministic billing period key for a date and interval."""
    if interval == "MONTHLY":
        return f"{d.year:04d}-{d.month:02d}"
    if interval == "YEARLY":
        return f"{d.year:04d}"
    if interval == "WEEKLY":
        start = d - timedelta(days=d.weekday())
        end = start + timedelta(days=6)
        return f"{start.isoformat()}_to_{end.isoformat()}"
    if interval == "DAILY":
        return d.isoformat()
    raise ValueError(f"Unknown billing interval: {interval}")
