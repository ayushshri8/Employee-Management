from fastapi import APIRouter, Depends
from app.auth.oauth2 import get_current_user, require_roles
from app.utils.date_utils import utc_now, days_remaining
from app.database.db import db
from datetime import datetime, timezone

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

users_col       = db["users"]
hiring_col      = db["hiring_requests"]
onboarding_col  = db["onboarding_requests"]
resignation_col = db["resignations"]
termination_col = db["terminations"]
activity_col    = db["activity_logs"]
notifications_col = db["notifications"]


def _get_events() -> dict:
    """Birthdays and work anniversaries for current month."""
    now = utc_now()
    current_month = now.month
    employees = list(users_col.find({"is_active": True}, {"_id": 0, "password": 0, "mfa_secret": 0}))

    birthdays, anniversaries, new_joiners = [], [], []
    for emp in employees:
        # Work anniversary
        if emp.get("joining_date"):
            try:
                jd = datetime.strptime(emp["joining_date"], "%Y-%m-%d")
                if jd.month == current_month and jd.day >= now.day:
                    years = now.year - jd.year
                    anniversaries.append({
                        "employee_id": emp["employee_id"],
                        "name": f"{emp['first_name']} {emp['last_name']}",
                        "years": years,
                        "date": emp["joining_date"],
                    })
            except Exception:
                pass
        # DOB birthday
        if emp.get("dob"):
            try:
                dob = datetime.strptime(emp["dob"], "%Y-%m-%d")
                if dob.month == current_month:
                    birthdays.append({
                        "employee_id": emp["employee_id"],
                        "name": f"{emp['first_name']} {emp['last_name']}",
                        "date": emp["dob"],
                    })
            except Exception:
                pass
        # New joiners this month
        if emp.get("joining_date"):
            try:
                jd = datetime.strptime(emp["joining_date"], "%Y-%m-%d")
                if jd.month == current_month and jd.year == now.year:
                    new_joiners.append({
                        "employee_id": emp["employee_id"],
                        "name": f"{emp['first_name']} {emp['last_name']}",
                        "role": emp["role"],
                        "department": emp["department"],
                    })
            except Exception:
                pass

    return {"birthdays": birthdays, "work_anniversaries": anniversaries, "new_joiners": new_joiners}


# ── Executive Dashboard ───────────────────────────────────────────────────────
@router.get("/executive")
def executive_dashboard(
    current_user: dict = Depends(require_roles(["CEO", "CFO", "CIO", "CTO"]))
):
    all_users = list(users_col.find({}, {"_id": 0, "password": 0, "mfa_secret": 0}))
    role_counts, dept_counts = {}, {}
    for u in all_users:
        role_counts[u["role"]] = role_counts.get(u["role"], 0) + 1
        dept_counts[u["department"]] = dept_counts.get(u["department"], 0) + 1

    unread = notifications_col.count_documents(
        {"recipient_id": current_user["employee_id"], "is_read": False}
    )
    recent_activity = list(activity_col.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(10))

    return {
        "welcome": f"Welcome, {current_user['first_name']} {current_user['last_name']}",
        "role": current_user["role"],
        "stats": {
            "total_employees": len(all_users),
            "active": sum(1 for u in all_users if u.get("is_active")),
            "inactive": sum(1 for u in all_users if not u.get("is_active")),
            "by_role": role_counts,
            "by_department": dept_counts,
        },
        "pending": {
            "hiring_requests": hiring_col.count_documents({"status": {"$in": ["pending_hr", "pending_ceo"]}}),
            "onboarding_requests": onboarding_col.count_documents({"status": "profile_submitted"}),
            "resignations": resignation_col.count_documents({"status": {"$in": ["pending_manager", "pending_hr"]}}),
            "terminations": termination_col.count_documents({"status": {"$in": ["pending_hr", "pending_ceo"]}}),
        },
        "unread_notifications": unread,
        "recent_activity": recent_activity,
        "events": _get_events(),
    }


# ── HR Dashboard ──────────────────────────────────────────────────────────────
@router.get("/hr")
def hr_dashboard(current_user: dict = Depends(require_roles(["HR", "CEO"]))):
    all_users = list(users_col.find({}, {"_id": 0, "password": 0, "mfa_secret": 0}))
    dept_counts = {}
    for u in all_users:
        dept_counts[u["department"]] = dept_counts.get(u["department"], 0) + 1

    unread = notifications_col.count_documents(
        {"recipient_id": current_user["employee_id"], "is_read": False}
    )

    return {
        "welcome": f"Welcome, {current_user['first_name']} {current_user['last_name']}",
        "role": current_user["role"],
        "stats": {
            "total_employees": len(all_users),
            "active": sum(1 for u in all_users if u.get("is_active")),
            "by_department": dept_counts,
        },
        "pending": {
            "onboarding_requests": onboarding_col.count_documents({"status": "profile_submitted"}),
            "hiring_requests": hiring_col.count_documents({"status": "pending_hr"}),
            "resignations": resignation_col.count_documents({"status": "pending_hr"}),
            "terminations": termination_col.count_documents({"status": "pending_hr"}),
        },
        "unread_notifications": unread,
        "events": _get_events(),
    }


# ── Employee / Intern Dashboard ───────────────────────────────────────────────
@router.get("/employee")
def employee_dashboard(current_user: dict = Depends(get_current_user)):
    manager = None
    if current_user.get("manager_id"):
        mgr = users_col.find_one(
            {"employee_id": current_user["manager_id"]},
            {"_id": 0, "password": 0, "mfa_secret": 0}
        )
        if mgr:
            manager = {
                "employee_id": mgr["employee_id"],
                "full_name": f"{mgr['first_name']} {mgr['last_name']}",
                "role": mgr["role"],
                "email": mgr["email"],
            }

    unread = notifications_col.count_documents(
        {"recipient_id": current_user["employee_id"], "is_read": False}
    )

    # Active resignation notice countdown
    active_resignation = resignation_col.find_one(
        {"employee_id": current_user["employee_id"], "status": "approved"}
    )
    notice_info = None
    if active_resignation and active_resignation.get("notice_end_date"):
        notice_info = {
            "notice_end_date": active_resignation["notice_end_date"].isoformat(),
            "days_remaining": days_remaining(active_resignation["notice_end_date"]),
        }

    return {
        "welcome": f"Welcome, {current_user['first_name']} {current_user['last_name']}",
        "employee_id": current_user["employee_id"],
        "role": current_user["role"],
        "department": current_user["department"],
        "email": current_user["email"],
        "joining_date": current_user.get("joining_date"),
        "status": current_user.get("status"),
        "reports_to": manager,
        "unread_notifications": unread,
        "notice_period": notice_info,
        "events": _get_events(),
    }
