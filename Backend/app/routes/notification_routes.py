from fastapi import APIRouter, HTTPException, Depends, Query
from app.auth.oauth2 import get_current_user
from app.database.db import db
from app.utils.date_utils import utc_now

router = APIRouter(prefix="/notifications", tags=["Notifications"])
notifications_col = db["notifications"]


@router.get("/")
def get_my_notifications(
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Get all notifications for the logged-in user."""
    query = {"recipient_id": current_user["employee_id"]}
    if unread_only:
        query["is_read"] = False

    notifications = list(notifications_col.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(50))

    unread_count = notifications_col.count_documents({
        "recipient_id": current_user["employee_id"], "is_read": False
    })
    return {"unread_count": unread_count, "notifications": notifications}


@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = notifications_col.update_one(
        {"notification_id": notification_id, "recipient_id": current_user["employee_id"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.patch("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    notifications_col.update_many(
        {"recipient_id": current_user["employee_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

