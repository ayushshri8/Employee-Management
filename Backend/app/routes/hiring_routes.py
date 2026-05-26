from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.hiring_schema import HiringRequestSchema, HiringActionSchema
from app.auth.oauth2 import get_current_user, require_roles
from app.services.notification_service import create_notification, notify_many, get_hr_ids, get_ceo_ids
from app.services.activity_service import log_activity
from app.utils.generate_id import generate_hiring_id
from app.utils.date_utils import utc_now
from app.database.db import db

router = APIRouter(prefix="/hiring", tags=["Hiring"])
hiring_col = db["hiring_requests"]
users_col = db["users"]


@router.post("/request", status_code=201)
def create_hiring_request(
    payload: HiringRequestSchema,
    current_user: dict = Depends(require_roles(["Manager", "HR", "CEO", "CFO", "CIO", "CTO"]))
):
    """Manager creates a hiring request → goes to HR."""
    doc = {
        "hiring_id": generate_hiring_id(),
        "job_title": payload.job_title,
        "department": payload.department,
        "required_skills": payload.required_skills,
        "reason": payload.reason,
        "number_of_positions": payload.number_of_positions,
        "requested_by": current_user["employee_id"],
        "requested_by_name": f"{current_user['first_name']} {current_user['last_name']}",
        "status": "pending_hr",
        "hr_remarks": None,
        "ceo_remarks": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    hiring_col.insert_one(doc)
    log_activity(current_user["employee_id"], "create_hiring_request", doc["hiring_id"])

    notify_many(get_hr_ids(), "New Hiring Request",
                f"{doc['requested_by_name']} submitted a hiring request for {payload.job_title}",
                "hiring", doc["hiring_id"])

    return {"message": "Hiring request submitted", "hiring_id": doc["hiring_id"]}


@router.get("/requests")
def list_hiring_requests(current_user: dict = Depends(get_current_user)):
    """
    CEO/HR see all requests.
    Manager sees only their own requests.
    """
    role = current_user["role"]
    if role in ("CEO", "HR", "CFO", "CIO", "CTO"):
        requests = list(hiring_col.find({}, {"_id": 0}))
    else:
        requests = list(hiring_col.find(
            {"requested_by": current_user["employee_id"]}, {"_id": 0}
        ))
    return {"total": len(requests), "requests": requests}


@router.patch("/requests/{hiring_id}/hr-action")
def hr_action(
    hiring_id: str,
    payload: HiringActionSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR approves (forwards to CEO) or rejects the hiring request."""
    req = hiring_col.find_one({"hiring_id": hiring_id})
    if not req:
        raise HTTPException(status_code=404, detail="Hiring request not found")
    if req["status"] != "pending_hr":
        raise HTTPException(status_code=400, detail=f"Request is not pending HR review (status: {req['status']})")

    if payload.action == "approve":
        new_status = "pending_ceo"
        notify_many(get_ceo_ids(), "Hiring Request Awaiting Approval",
                    f"HR approved hiring request {hiring_id} for {req['job_title']}. Awaiting CEO decision.",
                    "hiring", hiring_id)
    elif payload.action == "reject":
        new_status = "rejected"
        create_notification(req["requested_by"], "Hiring Request Rejected",
                            f"Your hiring request for {req['job_title']} was rejected by HR. Remarks: {payload.remarks}",
                            "hiring", hiring_id)
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    hiring_col.update_one({"hiring_id": hiring_id}, {"$set": {
        "status": new_status,
        "hr_remarks": payload.remarks,
        "updated_at": utc_now(),
    }})
    log_activity(current_user["employee_id"], f"hr_{payload.action}_hiring", hiring_id)
    return {"message": f"Hiring request {payload.action}d", "new_status": new_status}


@router.patch("/requests/{hiring_id}/ceo-action")
def ceo_action(
    hiring_id: str,
    payload: HiringActionSchema,
    current_user: dict = Depends(require_roles(["CEO"]))
):
    """CEO gives final approval or rejection."""
    req = hiring_col.find_one({"hiring_id": hiring_id})
    if not req:
        raise HTTPException(status_code=404, detail="Hiring request not found")
    if req["status"] != "pending_ceo":
        raise HTTPException(status_code=400, detail=f"Request is not pending CEO review (status: {req['status']})")

    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    new_status = "approved" if payload.action == "approve" else "rejected"
    hiring_col.update_one({"hiring_id": hiring_id}, {"$set": {
        "status": new_status,
        "ceo_remarks": payload.remarks,
        "updated_at": utc_now(),
    }})

    msg = f"Your hiring request for {req['job_title']} was {new_status} by CEO."
    create_notification(req["requested_by"], f"Hiring Request {new_status.capitalize()}", msg, "hiring", hiring_id)
    notify_many(get_hr_ids(), f"Hiring Request {new_status.capitalize()}",
                f"CEO {new_status} hiring request {hiring_id} for {req['job_title']}.", "hiring", hiring_id)

    log_activity(current_user["employee_id"], f"ceo_{payload.action}_hiring", hiring_id)
    return {"message": f"Hiring request {new_status}", "new_status": new_status}
