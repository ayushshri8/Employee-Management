from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TerminationRequestSchema(BaseModel):
    employee_id: str
    reason: str
    evidence: Optional[str] = None


class TerminationActionSchema(BaseModel):
    action: str          # "approve" or "reject"
    remarks: Optional[str] = None


class TerminationOutSchema(BaseModel):
    termination_id: str
    employee_id: str
    employee_name: str
    department: str
    reason: str
    status: str          # pending_hr | pending_ceo | approved | rejected
    requested_by: str
    hr_remarks: Optional[str] = None
    ceo_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
