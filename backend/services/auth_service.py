"""Auth service — JWT + bcrypt with role enforcement (Policymaker/Scientist/Farmer)."""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
import bcrypt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

JWT_SECRET = os.environ.get("JWT_SECRET", "bharat-climate-twin-secret")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 12

ROLES = ["policymaker", "scientist", "farmer"]

bearer = HTTPBearer(auto_error=False)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    organization: Optional[str] = None
    state_code: Optional[str] = None
    created_at: datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    role: str = Field(pattern="^(policymaker|scientist|farmer)$")
    organization: Optional[str] = None
    state_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def issue_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXP_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def serialize_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        organization=doc.get("organization"),
        state_code=doc.get("state_code"),
        created_at=datetime.fromisoformat(doc["created_at"]) if isinstance(doc["created_at"], str) else doc["created_at"],
    )


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing authorization")
    payload = decode_token(creds.credentials)
    return payload


async def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[dict]:
    if not creds:
        return None
    try:
        return decode_token(creds.credentials)
    except HTTPException:
        return None


async def ensure_seed_users(db: AsyncIOMotorDatabase) -> None:
    """Idempotent seed of demo users for testing."""
    seeds = [
        {
            "email": "policymaker@test.in",
            "password": "Climate@2025",
            "full_name": "Dr. Priya Sharma",
            "role": "policymaker",
            "organization": "Ministry of Environment, Forest and Climate Change",
            "state_code": "DL",
        },
        {
            "email": "scientist@test.in",
            "password": "Climate@2025",
            "full_name": "Dr. Rajesh Kumar",
            "role": "scientist",
            "organization": "IITM Pune",
            "state_code": "MH",
        },
        {
            "email": "farmer@test.in",
            "password": "Climate@2025",
            "full_name": "Suresh Patel",
            "role": "farmer",
            "organization": "Krishak Sahkari Samiti",
            "state_code": "GJ",
        },
    ]
    for s in seeds:
        existing = await db.users.find_one({"email": s["email"]})
        if existing:
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "email": s["email"],
            "password_hash": hash_password(s["password"]),
            "full_name": s["full_name"],
            "role": s["role"],
            "organization": s["organization"],
            "state_code": s["state_code"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
