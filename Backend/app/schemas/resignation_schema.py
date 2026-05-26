from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResignationRequestSchema(BaseModel):
    reason: str
    last_working_day_preference: Optional[str] = None


class ResignationActionSchema(BaseModel):
    action: str          # "approve" or "reject"
    remarks: Optional[str] = None


class ResignationOutSchema(BaseModel):
    resignation_id: str
    employee_id: str
    employee_name: str
    department: str
    reason: str
    status: str          # pending_manager | pending_hr | approved | rejected
    manager_remarks: Optional[str] = None
    hr_remarks: Optional[str] = None
    notice_start_date: Optional[datetime] = None
    notice_end_date: Optional[datetime] = None
    days_remaining: Optional[int] = None
    created_at: datetime
    updated_at: datetime
