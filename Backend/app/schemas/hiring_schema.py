from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HiringRequestSchema(BaseModel):
    job_title: str
    department: str
    required_skills: List[str]
    reason: str
    number_of_positions: int = 1


class HiringActionSchema(BaseModel):
    action: str          # "approve" or "reject"
    remarks: Optional[str] = None


class HiringOutSchema(BaseModel):
    hiring_id: str
    job_title: str
    department: str
    required_skills: List[str]
    reason: str
    number_of_positions: int
    requested_by: str
    requested_by_name: str
    status: str          # pending_hr | pending_ceo | approved | rejected
    hr_remarks: Optional[str] = None
    ceo_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
