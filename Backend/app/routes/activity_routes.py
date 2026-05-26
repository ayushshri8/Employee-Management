from fastapi import APIRouter, Depends, Query
from app.auth.oauth2 import require_roles
from app.database.db import db

router = APIRouter(prefix="/activity", tags=["Activity Logs"])
activity_col = db["activity_logs"]


@router.get("/logs")
def get_activity_logs(
    actor_id: str = Query(None),
    action: str = Query(None),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_roles(["HR", "CEO", "CFO", "CIO", "CTO"]))
):
    query = {}
    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}

    logs = list(activity_col.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {"total": len(logs), "logs": logs}
