from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import httpx
from html import escape
from urllib.parse import urlparse

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field

from seed_data import SEED_LISTINGS, CATEGORIES

# ------------------------------------------------------------------ config
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EMAIL_BASE_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "LuxuryCharterKings"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")


# ------------------------------------------------------------------ auth utils
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "email": email, "ver": token_version,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "ver": token_version,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def public_user(u: dict) -> dict:
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""), "role": u.get("role", "customer")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Session expired")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ------------------------------------------------------------------ brute force
async def is_locked_out(identifier: str) -> bool:
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return False
    if doc.get("count", 0) >= 5:
        last = doc.get("last_attempt")
        if last and datetime.now(timezone.utc) - last.replace(tzinfo=timezone.utc) < timedelta(minutes=15):
            return True
    return False


async def record_failed_attempt(identifier: str, email: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"email": email, "last_attempt": datetime.now(timezone.utc)}},
        upsert=True,
    )


async def clear_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ------------------------------------------------------------------ reset email
async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = FRONTEND_URL.rstrip("/")
    link = f"{base}/reset-password?token={token}"
    if not EMAIL_KEY or EMAIL_KEY.startswith("{") or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Email not configured; password reset link: %s", link)
        else:
            logger.error("Password reset email not configured (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    brand = escape(EMAIL_FROM_NAME)
    html = (
        f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f'<p>We received a request to reset your {brand} password.</p>'
        f'<p><a href="{escape(link)}">Reset your password</a></p>'
        f'<p>This link expires in 1 hour and can be used once. If you did not request it, ignore this email.</p>'
        f'<p style="font-size:12px;color:#888">Sent by {brand}. We never ask for your password by email.</p>'
        f'</td></tr></table>'
    )
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            resp = await c.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Reset your {EMAIL_FROM_NAME} password",
                      "html": html, "from_name": EMAIL_FROM_NAME},
            )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False


# ------------------------------------------------------------------ schemas
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class ConversationIn(BaseModel):
    customer_name: str
    customer_email: EmailStr
    message: str
    listing_id: Optional[str] = None


class MessageIn(BaseModel):
    body: str
    sender: str = "customer"


class BookingIn(BaseModel):
    listing_id: str
    customer_name: str
    customer_email: EmailStr
    phone: str = ""
    start_date: str = ""
    end_date: str = ""
    duration: str = ""
    chauffeur: bool = False
    notes: str = ""


# ------------------------------------------------------------------ auth routes
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name or email.split("@")[0],
           "role": "customer", "token_version": 0, "created_at": datetime.now(timezone.utc)}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    uid = str(res.inserted_id)
    set_auth_cookies(response, create_access_token(uid, email, 0), create_refresh_token(uid, 0))
    return public_user(doc)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    if await is_locked_out(identifier):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failed_attempt(identifier, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_attempts(identifier)
    uid = str(user["_id"])
    ver = user.get("token_version", 0)
    set_auth_cookies(response, create_access_token(uid, email, ver), create_refresh_token(uid, ver))
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    uid = str(user["_id"])
    ver = user.get("token_version", 0)
    response.set_cookie("access_token", create_access_token(uid, user["email"], ver),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    return public_user(user)


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn, background_tasks: BackgroundTasks):
    email = body.email.lower()
    generic = {"message": "If that email is registered, a reset link has been sent."}
    now = datetime.now(timezone.utc)
    await db.password_reset_requests.insert_one({"email": email, "created_at": now})
    recent = await db.password_reset_requests.count_documents(
        {"email": email, "created_at": {"$gt": now - timedelta(minutes=15)}})
    if recent > 5:
        return generic
    app_wide = await db.password_reset_requests.count_documents({"created_at": {"$gt": now - timedelta(minutes=10)}})
    if app_wide > 10:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "user_id": str(user["_id"]), "email": user["email"],
        "expires_at": now + timedelta(hours=1), "used": False,
    })
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return generic


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    h = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    doc = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True}})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    await db.users.update_one(
        {"_id": ObjectId(doc["user_id"])},
        {"$set": {"password_hash": hash_password(body.password)}, "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": doc["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": doc["email"]})
    return {"message": "Password reset successful"}


# ------------------------------------------------------------------ catalog routes
@api.get("/categories")
async def get_categories():
    return CATEGORIES


@api.get("/listings")
async def get_listings(category: Optional[str] = None, subcategory: Optional[str] = None,
                       location: Optional[str] = None, featured: Optional[bool] = None):
    q = {}
    if category:
        q["category"] = category
    if subcategory:
        q["subcategory"] = subcategory
    if location:
        q["location"] = location
    if featured is not None:
        q["featured"] = featured
    items = await db.listings.find(q, {"_id": 0}).to_list(500)
    return items


@api.get("/listings/{slug}")
async def get_listing(slug: str):
    item = await db.listings.find_one({"slug": slug}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item


# ------------------------------------------------------------------ concierge chat
@api.post("/concierge/conversations")
async def create_conversation(body: ConversationIn):
    now = datetime.now(timezone.utc).isoformat()
    listing = None
    if body.listing_id:
        listing = await db.listings.find_one({"slug": body.listing_id}, {"_id": 0})
    conv_id = str(uuid.uuid4())
    conv = {
        "id": conv_id, "customer_name": body.customer_name, "customer_email": body.customer_email.lower(),
        "listing_id": body.listing_id, "listing_name": listing["name"] if listing else None,
        "category": listing["category"] if listing else None,
        "status": "open", "created_at": now, "updated_at": now,
    }
    await db.conversations.insert_one({**conv})
    first = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "customer",
             "body": body.message, "created_at": now}
    ack = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "admin",
           "body": "Thank you for reaching out to LuxuryCharterKings. A concierge has received your request and will respond here shortly.",
           "created_at": now, "auto": True}
    await db.messages.insert_many([{**first}, {**ack}])
    conv["messages"] = [first, ack]
    return conv


@api.get("/concierge/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    conv["messages"] = msgs
    return conv


@api.post("/concierge/conversations/{conv_id}/messages")
async def add_message(conv_id: str, body: MessageIn):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    now = datetime.now(timezone.utc).isoformat()
    # Public endpoint: always a customer message. Admin replies use the admin route (next phase).
    msg = {"id": str(uuid.uuid4()), "conversation_id": conv_id,
           "sender": "customer", "body": body.body, "created_at": now}
    await db.messages.insert_one({**msg})
    await db.conversations.update_one({"id": conv_id}, {"$set": {"updated_at": now, "status": "open"}})
    return msg


@api.get("/concierge/conversations")
async def list_conversations(admin: dict = Depends(require_admin)):
    convs = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return convs


# ------------------------------------------------------------------ booking requests
@api.post("/booking-requests")
async def create_booking(body: BookingIn):
    listing = await db.listings.find_one({"slug": body.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "listing_id": body.listing_id, "listing_name": listing["name"],
           "customer_name": body.customer_name, "customer_email": body.customer_email.lower(),
           "phone": body.phone, "start_date": body.start_date, "end_date": body.end_date,
           "duration": body.duration, "chauffeur": body.chauffeur, "notes": body.notes,
           "status": "new", "created_at": now}
    await db.booking_requests.insert_one({**doc})
    return doc


@api.get("/booking-requests")
async def list_bookings(admin: dict = Depends(require_admin)):
    return await db.booking_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ startup
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(password),
                                   "name": "Concierge Admin", "role": "admin", "token_version": 0,
                                   "created_at": datetime.now(timezone.utc)})
        logger.info("Seeded admin user %s", email)
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def seed_listings():
    for item in SEED_LISTINGS:
        await db.listings.update_one({"slug": item["slug"]}, {"$set": item}, upsert=True)
    logger.info("Seeded %d listings", len(SEED_LISTINGS))


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("email")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
    await db.listings.create_index("slug", unique=True)
    await db.conversations.create_index("id", unique=True)
    await db.messages.create_index("conversation_id")
    await seed_admin()
    await seed_listings()


@app.on_event("shutdown")
async def shutdown():
    client.close()
