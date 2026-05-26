from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user_schema import (
    UserLoginSchema, TokenResponseSchema, UserOutSchema,
    MFASetupResponseSchema, MFAVerifySchema, ChangePasswordSchema
)
from app.models.user_model import serialize_user
from app.auth.hash import verify_password, hash_password
from app.auth.jwt_handler import create_access_token
from app.auth.oauth2 import get_current_user
from app.services.activity_service import log_activity
from app.database.db import db
import pyotp

router = APIRouter(prefix="/auth", tags=["Authentication"])
users_col = db["users"]


@router.post("/login", response_model=TokenResponseSchema)
def login(payload: UserLoginSchema):
    user = users_col.find_one({"employee_id": payload.employee_id.upper()})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid Employee ID or password")

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is inactive. Contact HR.")

    # MFA check
    if user.get("mfa_enabled") and user.get("mfa_secret"):
        if not payload.mfa_code:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA code required")
        totp = pyotp.TOTP(user["mfa_secret"])
        if not totp.verify(payload.mfa_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code")

    token = create_access_token({
        "sub": user["employee_id"],
        "role": user["role"],
        "department": user["department"],
    })

    log_activity(user["employee_id"], "login")
    return TokenResponseSchema(
        access_token=token,
        employee_id=user["employee_id"],
        role=user["role"],
        full_name=f"{user['first_name']} {user['last_name']}",
        mfa_enabled=user.get("mfa_enabled", False),
    )


@router.get("/me", response_model=UserOutSchema)
def get_me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)


@router.post("/mfa/setup", response_model=MFASetupResponseSchema)
def setup_mfa(current_user: dict = Depends(get_current_user)):
    secret = pyotp.random_base32()
    uri = pyotp.TOTP(secret).provisioning_uri(
        name=current_user["email"], issuer_name="DiagonalHRMS"
    )
    print(uri)
    print(secret)
    # Always reset mfa_enabled to False when setting up fresh
    users_col.update_one(
        {"employee_id": current_user["employee_id"]},
        {"$set": {"mfa_secret": secret, "mfa_enabled": False}}
    )
    return MFASetupResponseSchema(otp_uri=uri, secret=secret,
        message="Scan QR with authenticator app then verify")


@router.post("/mfa/verify")
def verify_mfa(payload: MFAVerifySchema, current_user: dict = Depends(get_current_user)):
    # Always re-fetch fresh from DB
    fresh = users_col.find_one({"employee_id": current_user["employee_id"]})
    if not fresh:
        raise HTTPException(status_code=404, detail="User not found")
    secret = fresh.get("mfa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Call /auth/mfa/setup first")
    totp = pyotp.TOTP(secret)
    
    print(totp)
    
    if not totp.verify(payload.code, valid_window=2):
        raise HTTPException(status_code=400, detail="Invalid or expired code. Wait for a fresh code and try again.")
    users_col.update_one(
        {"employee_id": current_user["employee_id"]},
        {"$set": {"mfa_enabled": True}}
    )
    log_activity(current_user["employee_id"], "mfa_enabled")
    return {"message": "MFA enabled successfully"}


@router.post("/mfa/disable")
def disable_mfa(payload: MFAVerifySchema, current_user: dict = Depends(get_current_user)):
    """Disable MFA after verifying current code."""
    secret = current_user.get("mfa_secret")
    if not secret or not current_user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=400, detail="Invalid MFA code")
    users_col.update_one(
        {"employee_id": current_user["employee_id"]},
        {"$set": {"mfa_enabled": False, "mfa_secret": None}}
    )
    return {"message": "MFA disabled successfully"}


@router.post("/change-password")
def change_password(payload: ChangePasswordSchema, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    users_col.update_one(
        {"employee_id": current_user["employee_id"]},
        {"$set": {"password": hash_password(payload.new_password)}}
    )
    log_activity(current_user["employee_id"], "change_password")
    return {"message": "Password changed successfully"}


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    log_activity(current_user["employee_id"], "logout")
    return {"message": "Logged out successfully"}
