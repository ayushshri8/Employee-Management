from fastapi import APIRouter, HTTPException, Depends
from app.schemas.resignation_schema import ResignationRequestSchema, ResignationActionSchema
from app.auth.oauth2 import get_current_user, require_roles
from app.services.notification_service import create_notification, notify_many, get_hr_ids
from app.services.activity_service import log_activity
from app.utils.generate_id import generate_resignation_id
from app.utils.date_utils import utc_now, notice_period_end, days_remaining
from app.config.settings import NOTICE_PERIOD_DAYS
from app.database.db import db

router = APIRouter(prefix="/resignations", tags=["Resignations"])
resignation_col = db["resignations"]
users_col = db["users"]


@router.post("/submit", status_code=201)
def submit_resignation(
    payload: ResignationRequestSchema,
    current_user: dict = Depends(require_roles(["Employee", "Manager", "Intern"]))
):
    """Employee submits resignation request."""
    existing = resignation_col.find_one({
        "employee_id": current_user["employee_id"],
        "status": {"$in": ["pending_manager", "pending_hr"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending resignation request")

    manager_id = current_user.get("manager_id")
    if not manager_id:
        raise HTTPException(status_code=400, detail="No manager assigned. Contact HR.")

    resignation_id = generate_resignation_id()
    doc = {
        "resignation_id": resignation_id,
        "employee_id": current_user["employee_id"],
        "employee_name": f"{current_user['first_name']} {current_user['last_name']}",
        "department": current_user["department"],
        "manager_id": manager_id,
        "reason": payload.reason,
        "last_working_day_preference": payload.last_working_day_preference,
        "status": "pending_manager",
        "manager_remarks": None,
        "hr_remarks": None,
        "notice_start_date": None,
        "notice_end_date": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    resignation_col.insert_one(doc)
    log_activity(current_user["employee_id"], "submit_resignation", resignation_id)

    create_notification(manager_id, "Resignation Request",
                        f"{doc['employee_name']} has submitted a resignation request.",
                        "resignation", resignation_id, priority="high")

    return {"message": "Resignation submitted. Awaiting manager approval.", "resignation_id": resignation_id}


@router.get("/")
def list_resignations(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role in ("HR", "CEO"):
        docs = list(resignation_col.find({}, {"_id": 0}))
    elif role in ("Manager", "CFO", "CIO", "CTO"):
        docs = list(resignation_col.find({"manager_id": current_user["employee_id"]}, {"_id": 0}))
    else:
        docs = list(resignation_col.find({"employee_id": current_user["employee_id"]}, {"_id": 0}))

    # Attach days_remaining for approved ones
    for doc in docs:
        if doc.get("notice_end_date"):
            doc["days_remaining"] = days_remaining(doc["notice_end_date"])
    return {"total": len(docs), "resignations": docs}


@router.patch("/{resignation_id}/manager-action")
def manager_action(
    resignation_id: str,
    payload: ResignationActionSchema,
    current_user: dict = Depends(require_roles(["Manager", "HR", "CEO", "CFO", "CIO", "CTO"]))
):
    doc = resignation_col.find_one({"resignation_id": resignation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resignation not found")
    if doc["status"] != "pending_manager":
        raise HTTPException(status_code=400, detail=f"Not pending manager review (status: {doc['status']})")
    if doc["manager_id"] != current_user["employee_id"] and current_user["role"] not in ("HR", "CEO"):
        raise HTTPException(status_code=403, detail="Not your team member's resignation")

    if payload.action == "approve":
        new_status = "pending_hr"
        notify_many(get_hr_ids(), "Resignation Forwarded to HR",
                    f"Manager approved resignation for {doc['employee_name']}. Awaiting HR final decision.",
                    "resignation", resignation_id, priority="high")
    elif payload.action == "reject":
        new_status = "rejected"
        create_notification(doc["employee_id"], "Resignation Rejected",
                            f"Your resignation was rejected by your manager. Remarks: {payload.remarks}",
                            "resignation", resignation_id)
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    resignation_col.update_one({"resignation_id": resignation_id}, {"$set": {
        "status": new_status, "manager_remarks": payload.remarks, "updated_at": utc_now()
    }})
    log_activity(current_user["employee_id"], f"manager_{payload.action}_resignation", resignation_id)
    return {"message": f"Resignation {payload.action}d", "new_status": new_status}


@router.patch("/{resignation_id}/hr-action")
def hr_action(
    resignation_id: str,
    payload: ResignationActionSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    doc = resignation_col.find_one({"resignation_id": resignation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resignation not found")
    if doc["status"] != "pending_hr":
        raise HTTPException(status_code=400, detail=f"Not pending HR review (status: {doc['status']})")

    if payload.action == "approve":
        notice_start = utc_now()
        notice_end = notice_period_end(notice_start, NOTICE_PERIOD_DAYS)
        resignation_col.update_one({"resignation_id": resignation_id}, {"$set": {
            "status": "approved",
            "hr_remarks": payload.remarks,
            "notice_start_date": notice_start,
            "notice_end_date": notice_end,
            "updated_at": utc_now(),
        }})
        users_col.update_one({"employee_id": doc["employee_id"]},
                             {"$set": {"status": "Notice Period"}})
        create_notification(doc["employee_id"], "Resignation Approved",
                            f"Your resignation is approved. Notice period: {NOTICE_PERIOD_DAYS} days. "
                            f"Last working day: {notice_end.strftime('%Y-%m-%d')}",
                            "resignation", resignation_id, priority="high")
        log_activity(current_user["employee_id"], "hr_approve_resignation", resignation_id)
        return {"message": "Resignation approved. Notice period started.",
                "notice_end_date": notice_end.isoformat()}

    elif payload.action == "reject":
        resignation_col.update_one({"resignation_id": resignation_id}, {"$set": {
            "status": "rejected", "hr_remarks": payload.remarks, "updated_at": utc_now()
        }})
        create_notification(doc["employee_id"], "Resignation Rejected",
                            f"Your resignation was rejected by HR. Remarks: {payload.remarks}",
                            "resignation", resignation_id)
        log_activity(current_user["employee_id"], "hr_reject_resignation", resignation_id)
        return {"message": "Resignation rejected"}

    raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")


@router.post("/{resignation_id}/complete-notice")
def complete_notice_period(
    resignation_id: str,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR marks notice period as complete — deactivates employee."""
    doc = resignation_col.find_one({"resignation_id": resignation_id})
    if not doc or doc["status"] != "approved":
        raise HTTPException(status_code=400, detail="Resignation not in approved/notice state")

    users_col.update_one({"employee_id": doc["employee_id"]}, {"$set": {
        "is_active": False,
        "status": "Resigned",
        "manager_id": "",
    }})
    resignation_col.update_one({"resignation_id": resignation_id}, {"$set": {
        "status": "completed", "updated_at": utc_now()
    }})
    create_notification(doc["employee_id"], "Exit Completed",
                        "Your notice period is complete. Your account has been deactivated.",
                        "resignation", resignation_id)
    log_activity(current_user["employee_id"], "complete_resignation", doc["employee_id"])
    return {"message": "Notice period completed. Employee deactivated."}
