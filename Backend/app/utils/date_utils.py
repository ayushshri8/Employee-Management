from datetime import datetime, timezone, timedelta


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def days_remaining(target_date: datetime) -> int:
    """Return days remaining until target_date from now."""
    now = utc_now()
    if target_date.tzinfo is None:
        target_date = target_date.replace(tzinfo=timezone.utc)
    delta = target_date - now
    return max(0, delta.days)


def notice_period_end(start_date: datetime, days: int = 30) -> datetime:
    return start_date + timedelta(days=days)


def is_expired(expiry_date: datetime) -> bool:
    now = utc_now()
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    return now > expiry_date


def days_since(past_date: datetime) -> int:
    now = utc_now()
    if past_date.tzinfo is None:
        past_date = past_date.replace(tzinfo=timezone.utc)
    return (now - past_date).days
