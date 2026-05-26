from fastapi import APIRouter, HTTPException, Depends
from app.schemas.termination_schema import TerminationRequestSchema, TerminationActionSchema
from app.auth.oauth2 import get_current_user, require_roles
from app.services.notification_service import create_notification, notify_many, get_hr_ids, get_ceo_ids
from app.services.activity_service import log_activity
from app.utils.generate_id import generate_termination_id
from app.utils.date_utils import utc_now
from app.database.db import db

router = APIRouter(prefix="/terminations", tags=["Terminations"])
termination_col = db["terminations"]
users_col = db["users"]


@router.post("/request", status_code=201)
def request_termination(
    payload: TerminationRequestSchema,
    current_user: dict = Depends(require_roles(["Manager", "HR", "CEO", "CFO", "CIO", "CTO"]))
):
    """Manager submits termination request for an employee → goes to HR."""
    target = users_col.find_one({"employee_id": payload.employee_id.upper()})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not target.get("is_active"):
        raise HTTPException(status_code=400, detail="Employee is already inactive")

    # Manager can only terminate their own team members
    if current_user["role"] == "Manager":
        if target.get("manager_id") != current_user["employee_id"]:
            raise HTTPException(status_code=403, detail="You can only terminate your direct reports")

    existing = termination_col.find_one({
        "employee_id": payload.employee_id.upper(),
        "status": {"$in": ["pending_hr", "pending_ceo"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="Active termination request already exists for this employee")

    termination_id = generate_termination_id()
    doc = {
        "termination_id": termination_id,
        "employee_id": payload.employee_id.upper(),
        "employee_name": f"{target['first_name']} {target['last_name']}",
        "department": target["department"],
        "reason": payload.reason,
        "evidence": payload.evidence,
        "requested_by": current_user["employee_id"],
        "requested_by_name": f"{current_user['first_name']} {current_user['last_name']}",
        "status": "pending_hr",
        "hr_remarks": None,
        "ceo_remarks": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    termination_col.insert_one(doc)
    log_activity(current_user["employee_id"], "request_termination", payload.employee_id)

    notify_many(get_hr_ids(), "Termination Request Received",
                f"{doc['requested_by_name']} submitted termination request for {doc['employee_name']}.",
                "termination", termination_id, priority="high")

    return {"message": "Termination request submitted to HR", "termination_id": termination_id}


@router.get("/")
def list_terminations(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role in ("HR", "CEO"):
        docs = list(termination_col.find({}, {"_id": 0}))
    elif role in ("Manager", "CFO", "CIO", "CTO"):
        docs = list(termination_col.find({"requested_by": current_user["employee_id"]}, {"_id": 0}))
    else:
        docs = list(termination_col.find({"employee_id": current_user["employee_id"]}, {"_id": 0}))
    return {"total": len(docs), "terminations": docs}


@router.patch("/{termination_id}/hr-action")
def hr_action(
    termination_id: str,
    payload: TerminationActionSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR reviews and forwards to CEO or rejects."""
    doc = termination_col.find_one({"termination_id": termination_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Termination request not found")
    if doc["status"] != "pending_hr":
        raise HTTPException(status_code=400, detail=f"Not pending HR review (status: {doc['status']})")

    if payload.action == "approve":
        termination_col.update_one({"termination_id": termination_id}, {"$set": {
            "status": "pending_ceo", "hr_remarks": payload.remarks, "updated_at": utc_now()
        }})
        notify_many(get_ceo_ids(), "Termination Request — CEO Approval Required",
                    f"HR forwarded termination request for {doc['employee_name']}. Reason: {doc['reason']}",
                    "termination", termination_id, priority="critical")
        log_activity(current_user["employee_id"], "hr_approve_termination", termination_id)
        return {"message": "Termination forwarded to CEO"}

    elif payload.action == "reject":
        termination_col.update_one({"termination_id": termination_id}, {"$set": {
            "status": "rejected", "hr_remarks": payload.remarks, "updated_at": utc_now()
        }})
        create_notification(doc["requested_by"], "Termination Request Rejected",
                            f"HR rejected termination request for {doc['employee_name']}. Remarks: {payload.remarks}",
                            "termination", termination_id)
        log_activity(current_user["employee_id"], "hr_reject_termination", termination_id)
        return {"message": "Termination request rejected"}

    raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")


@router.patch("/{termination_id}/ceo-action")
def ceo_action(
    termination_id: str,
    payload: TerminationActionSchema,
    current_user: dict = Depends(require_roles(["CEO"]))
):
    """CEO gives final approval — triggers critical alert to employee and deactivates account."""
    doc = termination_col.find_one({"termination_id": termination_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Termination request not found")
    if doc["status"] != "pending_ceo":
        raise HTTPException(status_code=400, detail=f"Not pending CEO review (status: {doc['status']})")

    if payload.action == "approve":
        # Deactivate employee immediately
        users_col.update_one({"employee_id": doc["employee_id"]}, {"$set": {
            "is_active": False,
            "status": "Terminated",
            "manager_id": "",
        }})
        termination_col.update_one({"termination_id": termination_id}, {"$set": {
            "status": "approved", "ceo_remarks": payload.remarks, "updated_at": utc_now()
        }})
        # Critical alert to employee
        create_notification(doc["employee_id"],
                            "CRITICAL: Employment Terminated",
                            f"Your employment has been terminated. Reason: {doc['reason']}. "
                            f"Your account access has been disabled immediately.",
                            "termination", termination_id, priority="critical")
        # Notify HR
        notify_many(get_hr_ids(), "Termination Approved by CEO",
                    f"CEO approved termination of {doc['employee_name']}. Account disabled.",
                    "termination", termination_id, priority="high")
        log_activity(current_user["employee_id"], "ceo_approve_termination", doc["employee_id"])
        return {"message": "Termination approved. Employee account deactivated immediately."}

    elif payload.action == "reject":
        termination_col.update_one({"termination_id": termination_id}, {"$set": {
            "status": "rejected", "ceo_remarks": payload.remarks, "updated_at": utc_now()
        }})
        create_notification(doc["requested_by"], "Termination Rejected by CEO",
                            f"CEO rejected termination for {doc['employee_name']}. Remarks: {payload.remarks}",
                            "termination", termination_id)
        log_activity(current_user["employee_id"], "ceo_reject_termination", termination_id)
        return {"message": "Termination rejected by CEO"}

    raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
