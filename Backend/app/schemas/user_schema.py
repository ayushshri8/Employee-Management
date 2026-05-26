from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserLoginSchema(BaseModel):
    employee_id: str
    password: str
    mfa_code: Optional[str] = None  # required if MFA is enabled


class TokenResponseSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: str
    role: str
    full_name: str
    mfa_enabled: bool


class MFASetupResponseSchema(BaseModel):
    otp_uri: str
    secret: str
    message: str


class MFAVerifySchema(BaseModel):
    code: str


class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str


class UserOutSchema(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: str
    role: str
    department: str
    manager_id: Optional[str] = ""
    joining_date: Optional[str] = ""
    status: str
    is_active: bool
    mfa_enabled: bool
    created_at: datetime
    phone: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    skills: Optional[list] = []
    emergency_contact: Optional[str] = None
    profile_photo: Optional[str] = None
