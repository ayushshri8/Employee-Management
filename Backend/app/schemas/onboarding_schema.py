from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class InviteCreateSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    department: str
    manager_id: str
    job_title: str


class OnboardingProfileSchema(BaseModel):
    username: str
    password: str
    phone: str
    dob: str
    address: str
    emergency_contact: str
    blood_group: str
    skills: List[str] = []


class HROnboardingActionSchema(BaseModel):
    action: str          # "approve" | "reject" | "request_correction"
    remarks: Optional[str] = None


class OnboardingOutSchema(BaseModel):
    onboarding_id: str
    invite_id: str
    first_name: str
    last_name: str
    email: str
    role: str
    department: str
    manager_id: str
    status: str          # invited | profile_submitted | hr_approved | hr_rejected | completed
    hr_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
