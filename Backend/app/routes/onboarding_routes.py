from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.onboarding_schema import (
    InviteCreateSchema, OnboardingProfileSchema, HROnboardingActionSchema
)
from app.schemas.employee_schema import ManagerActionSchema
from app.auth.oauth2 import get_current_user, require_roles
from app.auth.hash import hash_password
from app.services.notification_service import create_notification, notify_many, get_hr_ids
from app.services.activity_service import log_activity
from app.services.hierarchy_service import would_create_cycle
from app.utils.generate_id import generate_invite_id, generate_onboarding_id
from app.utils.date_utils import utc_now, is_expired
from app.config.settings import INVITE_EXPIRE_HOURS
from app.database.db import db
from datetime import timedelta
import secrets

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
invites_col = db["invites"]
onboarding_col = db["onboarding_requests"]
users_col = db["users"]
hierarchy_col = db["hierarchy_assignments"]


# ── HR: Generate Invite ───────────────────────────────────────────────────────
@router.post("/invite", status_code=201)
def create_invite(
    payload: InviteCreateSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR generates a 24-hour invite for a new employee."""
    if invites_col.find_one({"email": payload.email, "used": False}):
        raise HTTPException(status_code=409, detail="Active invite already exists for this email")

    temp_password = secrets.token_urlsafe(8)
    invite_id = generate_invite_id()
    expires_at = utc_now() + timedelta(hours=INVITE_EXPIRE_HOURS)

    doc = {
        "invite_id": invite_id,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "email": payload.email,
        "role": payload.role,
        "department": payload.department,
        "manager_id": payload.manager_id,
        "job_title": payload.job_title,
        "temp_password": temp_password,
        "expires_at": expires_at,
        "used": False,
        "created_by": current_user["employee_id"],
        "created_at": utc_now(),
    }
    invites_col.insert_one(doc)
    log_activity(current_user["employee_id"], "create_invite", invite_id,
                 f"Invite for {payload.email}")

    return {
        "message": "Invite created successfully",
        "invite_id": invite_id,
        "temp_password": temp_password,
        "expires_at": expires_at.isoformat(),
        "note": "Share invite_id and temp_password with the employee. Valid for 24 hours.",
    }


# ── Employee: Submit Profile Using Invite ─────────────────────────────────────
@router.post("/setup/{invite_id}", status_code=201)
def setup_profile(invite_id: str, payload: OnboardingProfileSchema):
    """New employee submits their profile using the invite link."""
    invite = invites_col.find_one({"invite_id": invite_id})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite ID")
    if invite.get("used"):
        raise HTTPException(status_code=400, detail="Invite already used")
    if is_expired(invite["expires_at"]):
        raise HTTPException(status_code=400, detail="Invite has expired")

    if users_col.find_one({"email": invite["email"]}):
        raise HTTPException(status_code=409, detail="Employee already exists")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    onboarding_id = generate_onboarding_id()
    doc = {
        "onboarding_id": onboarding_id,
        "invite_id": invite_id,
        "first_name": invite["first_name"],
        "last_name": invite["last_name"],
        "email": invite["email"],
        "role": invite["role"],
        "department": invite["department"],
        "manager_id": invite["manager_id"],
        "job_title": invite["job_title"],
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "phone": payload.phone,
        "dob": payload.dob,
        "address": payload.address,
        "emergency_contact": payload.emergency_contact,
        "blood_group": payload.blood_group,
        "skills": payload.skills,
        "status": "profile_submitted",
        "hr_remarks": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    onboarding_col.insert_one(doc)
    invites_col.update_one({"invite_id": invite_id}, {"$set": {"used": True}})

    notify_many(get_hr_ids(), "New Employee Profile Submitted",
                f"{invite['first_name']} {invite['last_name']} submitted onboarding profile.",
                "onboarding", onboarding_id)

    return {"message": "Profile submitted successfully. Awaiting HR approval.", "onboarding_id": onboarding_id}


@router.get("/requests")
def list_onboarding_requests(current_user: dict = Depends(require_roles(["HR", "CEO"]))):
    requests = list(onboarding_col.find({}, {"_id": 0, "password_hash": 0}))
    return {"total": len(requests), "requests": requests}


# ── HR: Approve / Reject / Request Correction ────────────────────────────────
@router.patch("/requests/{onboarding_id}/hr-action")
def hr_onboarding_action(
    onboarding_id: str,
    payload: HROnboardingActionSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    req = onboarding_col.find_one({"onboarding_id": onboarding_id})
    if not req:
        raise HTTPException(status_code=404, detail="Onboarding request not found")
    if req["status"] not in ("profile_submitted", "correction_requested"):
        raise HTTPException(status_code=400, detail=f"Cannot action request in status: {req['status']}")

    if payload.action == "approve":
        # Create the actual user account
        new_emp_id = _generate_employee_id()
        user_doc = {
            "employee_id": new_emp_id,
            "first_name": req["first_name"],
            "last_name": req["last_name"],
            "email": req["email"],
            "password": req["password_hash"],
            "role": req["role"],
            "department": req["department"],
            "manager_id": req["manager_id"],
            "joining_date": utc_now().strftime("%Y-%m-%d"),
            "status": "Active",
            "is_active": True,
            "mfa_enabled": False,
            "phone": req.get("phone"),
            "dob": req.get("dob"),
            "address": req.get("address"),
            "emergency_contact": req.get("emergency_contact"),
            "blood_group": req.get("blood_group"),
            "skills": req.get("skills", []),
            "created_at": utc_now(),
        }
        users_col.insert_one(user_doc)
        onboarding_col.update_one({"onboarding_id": onboarding_id}, {"$set": {
            "status": "hr_approved",
            "assigned_employee_id": new_emp_id,
            "hr_remarks": payload.remarks,
            "updated_at": utc_now(),
        }})

        # Send hierarchy assignment request to manager
        _create_hierarchy_assignment(new_emp_id, req["manager_id"], onboarding_id)

        log_activity(current_user["employee_id"], "approve_onboarding", onboarding_id)
        return {"message": "Employee approved and account created", "employee_id": new_emp_id}

    elif payload.action == "reject":
        onboarding_col.update_one({"onboarding_id": onboarding_id}, {"$set": {
            "status": "hr_rejected",
            "hr_remarks": payload.remarks,
            "updated_at": utc_now(),
        }})
        log_activity(current_user["employee_id"], "reject_onboarding", onboarding_id)
        return {"message": "Onboarding request rejected"}

    elif payload.action == "request_correction":
        onboarding_col.update_one({"onboarding_id": onboarding_id}, {"$set": {
            "status": "correction_requested",
            "hr_remarks": payload.remarks,
            "updated_at": utc_now(),
        }})
        return {"message": "Correction requested from employee"}

    raise HTTPException(status_code=400, detail="Action must be approve | reject | request_correction")


# ── Manager: Accept / Reject Hierarchy Assignment ────────────────────────────
@router.get("/hierarchy-assignments")
def list_hierarchy_assignments(current_user: dict = Depends(get_current_user)):
    """Manager sees pending assignments for them."""
    if current_user["role"] in ("HR", "CEO"):
        assignments = list(hierarchy_col.find({}, {"_id": 0}))
    else:
        assignments = list(hierarchy_col.find(
            {"manager_id": current_user["employee_id"]}, {"_id": 0}
        ))
    return {"total": len(assignments), "assignments": assignments}


@router.patch("/hierarchy-assignments/{assignment_id}/manager-action")
def manager_hierarchy_action(
    assignment_id: str,
    payload: ManagerActionSchema,
    current_user: dict = Depends(require_roles(["Manager", "HR", "CEO", "CFO", "CIO", "CTO"]))
):
    assignment = hierarchy_col.find_one({"assignment_id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment["manager_id"] != current_user["employee_id"] and current_user["role"] not in ("HR", "CEO"):
        raise HTTPException(status_code=403, detail="Not your assignment")
    if assignment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Assignment already actioned")

    emp_id = assignment["employee_id"]

    if payload.action == "accept":
        # Validate no circular hierarchy
        if would_create_cycle(emp_id, current_user["employee_id"]):
            raise HTTPException(status_code=400, detail="Circular hierarchy detected")

        users_col.update_one({"employee_id": emp_id},
                             {"$set": {"manager_id": current_user["employee_id"]}})
        hierarchy_col.update_one({"assignment_id": assignment_id}, {"$set": {
            "status": "accepted", "remarks": payload.remarks, "updated_at": utc_now()
        }})
        create_notification(emp_id, "Manager Assigned",
                            f"You have been assigned to manager {current_user['first_name']} {current_user['last_name']}",
                            "hierarchy", assignment_id)
        log_activity(current_user["employee_id"], "accept_hierarchy_assignment", emp_id)
        return {"message": "Employee accepted into your team"}

    elif payload.action == "reject":
        hierarchy_col.update_one({"assignment_id": assignment_id}, {"$set": {
            "status": "rejected", "remarks": payload.remarks, "updated_at": utc_now()
        }})
        notify_many(get_hr_ids(), "Hierarchy Assignment Rejected",
                    f"Manager {current_user['first_name']} rejected assignment for employee {emp_id}",
                    "hierarchy", assignment_id)
        log_activity(current_user["employee_id"], "reject_hierarchy_assignment", emp_id)
        return {"message": "Assignment rejected. HR notified."}

    raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")


# ── Helpers ───────────────────────────────────────────────────────────────────
def _generate_employee_id() -> str:
    last = users_col.find_one(
        {"employee_id": {"$regex": "^EMP"}},
        sort=[("employee_id", -1)]
    )
    if last:
        num = int(last["employee_id"].replace("EMP", "")) + 1
    else:
        num = 1
    return f"EMP{num:03d}"


def _create_hierarchy_assignment(employee_id: str, manager_id: str, onboarding_id: str):
    assignment_id = f"ASN-{employee_id}-{manager_id}"
    hierarchy_col.insert_one({
        "assignment_id": assignment_id,
        "employee_id": employee_id,
        "manager_id": manager_id,
        "onboarding_id": onboarding_id,
        "status": "pending",
        "remarks": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    })
    create_notification(manager_id, "New Employee Assignment",
                        f"Employee {employee_id} has been assigned to your team. Please accept or reject.",
                        "hierarchy", assignment_id)
