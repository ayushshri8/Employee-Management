from app.database.db import db

users_col = db["users"]


def get_all_reports(manager_id: str, visited: set = None) -> list:
    """Recursively get all direct and indirect reports of a manager."""
    if visited is None:
        visited = set()
    if manager_id in visited:
        return []
    visited.add(manager_id)

    direct_reports = list(users_col.find(
        {"manager_id": manager_id, "is_active": True},
        {"_id": 0, "password": 0}
    ))
    result = []
    for emp in direct_reports:
        emp["reports"] = get_all_reports(emp["employee_id"], visited)
        result.append(emp)
    return result


def would_create_cycle(employee_id: str, new_manager_id: str) -> bool:
    """
    Check if assigning new_manager_id as manager of employee_id
    would create a circular hierarchy.
    """
    # Walk up the chain from new_manager_id — if we hit employee_id, it's a cycle
    current = new_manager_id
    visited = set()
    while current:
        if current == employee_id:
            return True
        if current in visited:
            break
        visited.add(current)
        mgr = users_col.find_one({"employee_id": current}, {"manager_id": 1})
        if not mgr:
            break
        current = mgr.get("manager_id")
    return False


def build_org_tree() -> list:
    """Build full org chart starting from employees with no manager (CEO level)."""
    top_level = list(users_col.find(
        {"$or": [{"manager_id": ""}, {"manager_id": None}], "is_active": True},
        {"_id": 0, "password": 0}
    ))
    for emp in top_level:
        emp["reports"] = get_all_reports(emp["employee_id"])
    return top_level
