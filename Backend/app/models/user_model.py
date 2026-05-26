from datetime import datetime, timezone


def build_user_document(
    employee_id: str, first_name: str, last_name: str, email: str,
    hashed_password: str, role: str, department: str,
    manager_id: str, joining_date: str, status: str,
) -> dict:
    return {
        "employee_id": employee_id,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": hashed_password,
        "role": role,
        "department": department,
        "manager_id": manager_id,
        "joining_date": joining_date,
        "status": status,
        "is_active": status.strip().lower() == "active",
        "mfa_enabled": False,
        "mfa_secret": None,
        "phone": None,
        "dob": None,
        "address": None,
        "blood_group": None,
        "skills": [],
        "emergency_contact": None,
        "profile_photo": None,
        "created_at": datetime.now(timezone.utc),
    }


def serialize_user(user: dict) -> dict:
    return {
        "employee_id": user["employee_id"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "manager_id": user.get("manager_id", ""),
        "joining_date": user.get("joining_date", ""),
        "status": user.get("status", "Active"),
        "is_active": user.get("is_active", True),
        "mfa_enabled": user.get("mfa_enabled", False),
        "created_at": user["created_at"],
        "phone": user.get("phone"),
        "dob": user.get("dob"),
        "address": user.get("address"),
        "blood_group": user.get("blood_group"),
        "skills": user.get("skills", []),
        "emergency_contact": user.get("emergency_contact"),
        "profile_photo": user.get("profile_photo"),
    }
