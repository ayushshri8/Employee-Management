from app.database.db import db
from app.utils.generate_id import generate_notification_id
from app.utils.date_utils import utc_now

notifications_col = db["notifications"]


def create_notification(
    recipient_id: str,
    title: str,
    message: str,
    notification_type: str,   # hiring | onboarding | resignation | termination | hierarchy | general
    reference_id: str = None,
    priority: str = "normal",  # normal | high | critical
):
    doc = {
        "notification_id": generate_notification_id(),
        "recipient_id": recipient_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "reference_id": reference_id,
        "priority": priority,
        "is_read": False,
        "created_at": utc_now(),
    }
    notifications_col.insert_one(doc)
    return doc


def notify_many(recipient_ids: list, title: str, message: str, notification_type: str,
                reference_id: str = None, priority: str = "normal"):
    for rid in recipient_ids:
        create_notification(rid, title, message, notification_type, reference_id, priority)


def get_hr_ids() -> list:
    """Return all active HR employee IDs."""
    return [u["employee_id"] for u in db["users"].find({"role": "HR", "is_active": True}, {"employee_id": 1})]


def get_ceo_ids() -> list:
    return [u["employee_id"] for u in db["users"].find({"role": "CEO", "is_active": True}, {"employee_id": 1})]
