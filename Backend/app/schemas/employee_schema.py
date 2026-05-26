from pydantic import BaseModel
from typing import Optional, List


class CreateEmployeeSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    role: str
    department: str
    joining_date: str
    manager_id: Optional[str] = None
    status: Optional[str] = "Active"


class EmployeeUpdateSchema(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    skills: Optional[List[str]] = None
    profile_photo: Optional[str] = None


class HierarchyAssignSchema(BaseModel):
    employee_id: str
    manager_id: str


class ManagerActionSchema(BaseModel):
    action: str          # "accept" or "reject"
    remarks: Optional[str] = None
