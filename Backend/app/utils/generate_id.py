import uuid
from datetime import datetime


def generate_request_id(prefix: str = "REQ") -> str:
    """Generate a unique request ID like REQ-20240101-ABCD."""
    date_str = datetime.utcnow().strftime("%Y%m%d")
    short_uuid = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{date_str}-{short_uuid}"


def generate_invite_id() -> str:
    return generate_request_id("INV")


def generate_hiring_id() -> str:
    return generate_request_id("HIR")


def generate_onboarding_id() -> str:
    return generate_request_id("ONB")


def generate_resignation_id() -> str:
    return generate_request_id("RES")


def generate_termination_id() -> str:
    return generate_request_id("TRM")


def generate_notification_id() -> str:
    return generate_request_id("NTF")