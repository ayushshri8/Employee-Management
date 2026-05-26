from app.database.db import db
from app.utils.date_utils import utc_now

activity_col = db["activity_logs"]


def log_activity(
    actor_id: str,
    action: str,
    target_id: str = None,
    details: str = None,
    status: str = "success",
):
    """Log any system action to activity_logs collection."""
    activity_col.insert_one({
        "actor_id": actor_id,
        "action": action,
        "target_id": target_id,
        "details": details,
        "status": status,
        "timestamp": utc_now(),
    })
