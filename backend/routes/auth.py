"""Auth routes — register / login / me."""
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.auth_service import (
    UserRegister, UserLogin, AuthResponse, UserPublic,
    hash_password, verify_password, issue_token, serialize_user,
    get_current_user,
)


def build_auth_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    @router.post("/register", response_model=AuthResponse)
    async def register(body: UserRegister):
        existing = await db.users.find_one({"email": body.email})
        if existing:
            raise HTTPException(400, "Email already registered")
        doc = {
            "id": str(uuid.uuid4()),
            "email": body.email,
            "password_hash": hash_password(body.password),
            "full_name": body.full_name,
            "role": body.role,
            "organization": body.organization,
            "state_code": body.state_code,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        token = issue_token(doc["id"], doc["role"])
        return AuthResponse(token=token, user=serialize_user(doc))

    @router.post("/login", response_model=AuthResponse)
    async def login(body: UserLogin):
        doc = await db.users.find_one({"email": body.email})
        if not doc or not verify_password(body.password, doc["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        token = issue_token(doc["id"], doc["role"])
        return AuthResponse(token=token, user=serialize_user(doc))

    @router.get("/me", response_model=UserPublic)
    async def me(user=Depends(get_current_user)):
        doc = await db.users.find_one({"id": user["sub"]}, {"_id": 0, "password_hash": 0})
        if not doc:
            raise HTTPException(404, "User not found")
        return serialize_user(doc)

    return router
