from fastapi import APIRouter, HTTPException, Depends
from app.schemas.employee_schema import HierarchyAssignSchema
from app.auth.oauth2 import get_current_user, require_roles
from app.services.hierarchy_service import build_org_tree, would_create_cycle
from app.services.notification_service import create_notification
from app.services.activity_service import log_activity
from app.utils.date_utils import utc_now
from app.database.db import db

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])
users_col = db["users"]


@router.get("/org-tree")
def org_tree(current_user: dict = Depends(get_current_user)):
    """Full org chart — visible to all employees."""
    return {"org_tree": build_org_tree()}


@router.patch("/reassign")
def reassign_manager(
    payload: HierarchyAssignSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR/CEO reassigns an employee to a different manager."""
    employee = users_col.find_one({"employee_id": payload.employee_id.upper()})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_manager = users_col.find_one({"employee_id": payload.manager_id.upper()})
    if not new_manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    if payload.employee_id.upper() == payload.manager_id.upper():
        raise HTTPException(status_code=400, detail="Employee cannot be their own manager")

    if would_create_cycle(payload.employee_id.upper(), payload.manager_id.upper()):
        raise HTTPException(status_code=400, detail="This assignment would create a circular hierarchy")

    old_manager_id = employee.get("manager_id")
    users_col.update_one(
        {"employee_id": payload.employee_id.upper()},
        {"$set": {"manager_id": payload.manager_id.upper()}}
    )

    create_notification(payload.employee_id.upper(), "Manager Reassigned",
                        f"You have been reassigned to {new_manager['first_name']} {new_manager['last_name']}",
                        "hierarchy")
    create_notification(payload.manager_id.upper(), "New Team Member",
                        f"{employee['first_name']} {employee['last_name']} has been assigned to your team",
                        "hierarchy")

    log_activity(current_user["employee_id"], "reassign_manager",
                 payload.employee_id, f"From {old_manager_id} to {payload.manager_id}")

    return {"message": f"Employee {payload.employee_id} reassigned to manager {payload.manager_id}"}

