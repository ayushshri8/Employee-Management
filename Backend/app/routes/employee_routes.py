from fastapi import APIRouter, HTTPException, Depends, Query
from app.schemas.employee_schema import EmployeeUpdateSchema, CreateEmployeeSchema
from app.auth.oauth2 import get_current_user
from app.auth.oauth2 import get_current_user, require_roles
from app.services.activity_service import log_activity
from app.utils.date_utils import utc_now
from app.database.db import db
from app.models.user_model import build_user_document
import bcrypt

router = APIRouter(prefix="/employees", tags=["Employees"])
users_col = db["users"]

ALL_ROLES = ["CEO", "CFO", "CIO", "CTO", "HR", "Manager", "Employee", "Intern"]


def _clean(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in ("_id", "password", "mfa_secret")}


@router.get("/")
def list_employees(
    department: str = Query(None),
    role: str = Query(None),
    status: str = Query(None),
    search: str = Query(None, description="Search by name or email"),
    current_user: dict = Depends(require_roles(["CEO", "CFO", "CIO", "CTO", "HR"]))
):
    """List all employees with optional filters. HR/Executives only."""
    query = {}
    if department:
        query["department"] = department
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"employee_id": {"$regex": search, "$options": "i"}},
        ]

    employees = [_clean(u) for u in users_col.find(query)]
    return {"total": len(employees), "employees": employees}


@router.post("/create")
def create_employee(
    payload: CreateEmployeeSchema,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR/CEO creates a new employee directly."""
    # Auto-generate employee_id
    last = users_col.find_one({"employee_id": {"$regex": "^EMP"}}, sort=[("employee_id", -1)])
    if last:
        num = int(last["employee_id"][3:]) + 1
    else:
        num = 1
    employee_id = f"EMP{num:03d}"

    if users_col.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = bcrypt.hashpw(employee_id.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = build_user_document(
        employee_id=employee_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        hashed_password=hashed,
        role=payload.role,
        department=payload.department,
        manager_id=payload.manager_id or "",
        joining_date=payload.joining_date,
        status=payload.status or "Active",
    )
    users_col.insert_one(doc)
    log_activity(current_user["employee_id"], "create_employee", employee_id)
    return {"message": f"Employee {employee_id} created successfully", "employee_id": employee_id}


@router.get("/me")
def my_profile(current_user: dict = Depends(get_current_user)):
    return _clean(current_user)


@router.patch("/me")
def update_my_profile(
    payload: EmployeeUpdateSchema,
    current_user: dict = Depends(get_current_user)
):
    """Employee updates their own profile fields."""
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    users_col.update_one({"employee_id": current_user["employee_id"]}, {"$set": updates})
    log_activity(current_user["employee_id"], "update_profile")
    return {"message": "Profile updated successfully"}


@router.patch("/{employee_id}/deactivate")
def deactivate_employee(
    employee_id: str,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """Soft delete — deactivate an employee (HR/CEO only)."""
    target = users_col.find_one({"employee_id": employee_id.upper()})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    users_col.update_one({"employee_id": employee_id.upper()}, {"$set": {
        "is_active": False, "status": "Inactive"
    }})
    log_activity(current_user["employee_id"], "deactivate_employee", employee_id)
    return {"message": f"Employee {employee_id} deactivated"}


@router.patch("/{employee_id}/reactivate")
def reactivate_employee(
    employee_id: str,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    target = users_col.find_one({"employee_id": employee_id.upper()})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    users_col.update_one({"employee_id": employee_id.upper()}, {"$set": {
        "is_active": True, "status": "Active"
    }})
    log_activity(current_user["employee_id"], "reactivate_employee", employee_id)
    return {"message": f"Employee {employee_id} reactivated"}


@router.post("/{employee_id}/reset-password")
def reset_password(
    employee_id: str,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR/CEO resets employee password back to their Employee ID."""
    import bcrypt
    target = users_col.find_one({"employee_id": employee_id.upper()})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    hashed = bcrypt.hashpw(employee_id.upper().encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    users_col.update_one({"employee_id": employee_id.upper()}, {"$set": {"password": hashed}})
    log_activity(current_user["employee_id"], "reset_password", employee_id)
    return {"message": f"Password reset to Employee ID for {employee_id}"}


@router.post("/{employee_id}/disable-mfa")
def admin_disable_mfa(
    employee_id: str,
    current_user: dict = Depends(require_roles(["HR", "CEO"]))
):
    """HR/CEO disables MFA for an employee."""
    target = users_col.find_one({"employee_id": employee_id.upper()})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    users_col.update_one({"employee_id": employee_id.upper()}, {"$set": {
        "mfa_enabled": False, "mfa_secret": None
    }})
    log_activity(current_user["employee_id"], "admin_disable_mfa", employee_id)
    return {"message": f"MFA disabled for {employee_id}"}
