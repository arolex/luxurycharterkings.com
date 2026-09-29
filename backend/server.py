from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import logging
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import httpx
import requests
from html import escape
from urllib.parse import urlparse

from fastapi import (FastAPI, APIRouter, HTTPException, Request, Response, Depends,
                     BackgroundTasks, UploadFile, File, Header, Query)
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
PROXY_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
EMAIL_BASE_URL = PROXY_BASE.rstrip("/")
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "LuxuryCharterKings"
STORAGE_URL = PROXY_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "luxurycharterkings"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")


# ------------------------------------------------------------------ object storage
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}


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
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""),
            "role": u.get("role", "customer"), "phone": u.get("phone", ""),
            "vip": u.get("vip", False), "vip_since": u.get("vip_since"),
            "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at")}


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


async def optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


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
    await db.login_attempts.update_one({"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"email": email, "last_attempt": datetime.now(timezone.utc)}}, upsert=True)


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
            logger.error("Password reset email not configured")
        return False
    brand = escape(EMAIL_FROM_NAME)
    html = (f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
            f'<p>We received a request to reset your {brand} password.</p>'
            f'<p><a href="{escape(link)}">Reset your password</a></p>'
            f'<p>This link expires in 1 hour and can be used once.</p></td></tr></table>')
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            resp = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Reset your {EMAIL_FROM_NAME} password", "html": html, "from_name": EMAIL_FROM_NAME})
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False


# ------------------------------------------------------------------ helpers
def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or uuid.uuid4().hex[:8]


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"key": "site"}, {"_id": 0})
    if not doc:
        doc = {"key": "site", "company_name": "LuxuryCharterKings", "logo_url": "",
               "whatsapp_number": "", "concierge_email": os.environ.get("ADMIN_EMAIL", ""),
               "concierge_phone": "", "vip_discount": 10}
        await db.settings.insert_one({**doc})
    doc.pop("key", None)
    return doc


# ------------------------------------------------------------------ schemas
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = ""
    phone: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class ProfileIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class ConversationIn(BaseModel):
    customer_name: str
    customer_email: EmailStr
    message: str
    listing_id: Optional[str] = None


class MessageIn(BaseModel):
    body: str


class RequestIn(BaseModel):
    listing_id: str
    request_type: str = "book"          # book | quote
    full_name: str
    email: EmailStr
    phone: str = ""
    start_date: str = ""
    end_date: str = ""
    destination: str = ""
    guests: Optional[int] = None
    duration: str = ""
    chauffeur: bool = False
    requirements: List[str] = []
    message: str = ""


class StatusIn(BaseModel):
    status: str


class SettingsIn(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    concierge_email: Optional[str] = None
    concierge_phone: Optional[str] = None
    vip_discount: Optional[float] = None


class ListingIn(BaseModel):
    slug: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    name: str
    location: str = ""
    tagline: str = ""
    description: str = ""
    images: List[str] = []
    passenger_capacity: int = 0
    price_per_day: Optional[float] = None
    price_multiday: Optional[float] = None
    price_weekly: Optional[float] = None
    request_quote: bool = False
    chauffeur_option: Optional[str] = None
    rental_durations: List[str] = ["Daily", "Multi-Day", "Weekly"]
    availability: str = "Available"
    included_services: List[str] = []
    features: List[str] = []
    amenities: List[str] = []
    rental_requirements: List[str] = []
    pickup_delivery: Optional[str] = None
    vehicle_type: Optional[str] = None
    bedrooms: Optional[int] = None
    guests: Optional[int] = None
    specs: List = []
    featured: bool = False
    published: bool = True


# ------------------------------------------------------------------ auth routes
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name or email.split("@")[0],
           "phone": body.phone, "role": "customer", "vip": False, "token_version": 0,
           "created_at": datetime.now(timezone.utc)}
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


@api.patch("/auth/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user.update(updates)
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
    recent = await db.password_reset_requests.count_documents({"email": email, "created_at": {"$gt": now - timedelta(minutes=15)}})
    if recent > 5:
        return generic
    app_wide = await db.password_reset_requests.count_documents({"created_at": {"$gt": now - timedelta(minutes=10)}})
    if app_wide > 10:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({"token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "user_id": str(user["_id"]), "email": user["email"], "expires_at": now + timedelta(hours=1), "used": False})
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return generic


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    h = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    doc = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now}}, {"$set": {"used": True}})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    await db.users.update_one({"_id": ObjectId(doc["user_id"])},
        {"$set": {"password_hash": hash_password(body.password)}, "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": doc["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": doc["email"]})
    return {"message": "Password reset successful"}


@api.post("/vip/register")
async def vip_register(user: dict = Depends(get_current_user)):
    if not user.get("vip"):
        await db.users.update_one({"_id": user["_id"]},
            {"$set": {"vip": True, "vip_since": datetime.now(timezone.utc).isoformat()}})
        user["vip"] = True
        user["vip_since"] = datetime.now(timezone.utc).isoformat()
    return public_user(user)


# ------------------------------------------------------------------ settings
@api.get("/settings")
async def settings_public():
    return await get_settings_doc()


@api.put("/admin/settings")
async def settings_update(body: SettingsIn, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"key": "site"}, {"$set": updates}, upsert=True)
    return await get_settings_doc()


# ------------------------------------------------------------------ catalog
@api.get("/categories")
async def get_categories():
    return CATEGORIES


@api.get("/listings")
async def get_listings(category: Optional[str] = None, subcategory: Optional[str] = None,
                       location: Optional[str] = None, featured: Optional[bool] = None):
    q = {"published": {"$ne": False}}
    if category:
        q["category"] = category
    if subcategory:
        q["subcategory"] = subcategory
    if location:
        q["location"] = location
    if featured is not None:
        q["featured"] = featured
    return await db.listings.find(q, {"_id": 0}).to_list(500)


@api.get("/listings/{slug}")
async def get_listing(slug: str):
    item = await db.listings.find_one({"slug": slug, "published": {"$ne": False}}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item


# ------------------------------------------------------------------ admin inventory
@api.get("/admin/listings")
async def admin_listings(admin: dict = Depends(require_admin)):
    return await db.listings.find({}, {"_id": 0}).sort("category", 1).to_list(1000)


@api.post("/admin/listings")
async def admin_create_listing(body: ListingIn, admin: dict = Depends(require_admin)):
    item = body.model_dump()
    item["slug"] = item.get("slug") or slugify(item["name"])
    if await db.listings.find_one({"slug": item["slug"]}):
        item["slug"] = f"{item['slug']}-{uuid.uuid4().hex[:4]}"
    item["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.listings.insert_one({**item})
    item.pop("_id", None)
    return item


@api.put("/admin/listings/{slug}")
async def admin_update_listing(slug: str, body: ListingIn, admin: dict = Depends(require_admin)):
    existing = await db.listings.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Listing not found")
    item = body.model_dump()
    item["slug"] = slug
    await db.listings.update_one({"slug": slug}, {"$set": item})
    return await db.listings.find_one({"slug": slug}, {"_id": 0})


@api.delete("/admin/listings/{slug}")
async def admin_delete_listing(slug: str, admin: dict = Depends(require_admin)):
    res = await db.listings.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"message": "Deleted"}


# ------------------------------------------------------------------ uploads
@api.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    ext = (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    ctype = MIME.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    try:
        result = put_object(path, data, ctype)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"],
        "original_filename": file.filename, "content_type": ctype, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=record.get("content_type", ctype),
                    headers={"Cache-Control": "public, max-age=86400"})


# ------------------------------------------------------------------ requests (book / quote)
async def _create_request(body: RequestIn, user):
    listing = await db.listings.find_one({"slug": body.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "listing_id": body.listing_id, "listing_name": listing["name"],
           "category": listing.get("category"), "location": body.destination or listing.get("location"),
           "request_type": body.request_type, "customer_name": body.full_name, "customer_email": body.email.lower(),
           "phone": body.phone, "start_date": body.start_date, "end_date": body.end_date,
           "destination": body.destination, "guests": body.guests, "duration": body.duration,
           "chauffeur": body.chauffeur, "requirements": body.requirements, "notes": body.message,
           "user_id": str(user["_id"]) if user else None, "vip": bool(user and user.get("vip")),
           "status": "new", "created_at": now}
    await db.booking_requests.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api.post("/requests")
async def create_request(body: RequestIn, user=Depends(optional_user)):
    return await _create_request(body, user)


@api.get("/requests/mine")
async def my_requests(user: dict = Depends(get_current_user)):
    q = {"$or": [{"user_id": str(user["_id"])}, {"customer_email": user["email"]}]}
    return await db.booking_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/admin/requests")
async def admin_requests(admin: dict = Depends(require_admin)):
    return await db.booking_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.patch("/admin/requests/{req_id}/status")
async def admin_request_status(req_id: str, body: StatusIn, admin: dict = Depends(require_admin)):
    res = await db.booking_requests.update_one({"id": req_id}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return await db.booking_requests.find_one({"id": req_id}, {"_id": 0})


# ------------------------------------------------------------------ concierge chat
@api.post("/concierge/conversations")
async def create_conversation(body: ConversationIn, user=Depends(optional_user)):
    now = datetime.now(timezone.utc).isoformat()
    listing = await db.listings.find_one({"slug": body.listing_id}, {"_id": 0}) if body.listing_id else None
    conv_id = str(uuid.uuid4())
    conv = {"id": conv_id, "customer_name": body.customer_name, "customer_email": body.customer_email.lower(),
            "user_id": str(user["_id"]) if user else None,
            "listing_id": body.listing_id, "listing_name": listing["name"] if listing else None,
            "category": listing["category"] if listing else None, "last_message": body.message,
            "status": "open", "unread_admin": 1, "unread_customer": 0, "created_at": now, "updated_at": now}
    await db.conversations.insert_one({**conv})
    first = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "customer", "body": body.message, "created_at": now}
    ack = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "admin",
           "body": "Thank you for contacting LuxuryCharterKings. A concierge will be with you shortly.",
           "created_at": now, "auto": True}
    await db.messages.insert_many([{**first}, {**ack}])
    conv["messages"] = [first, ack]
    return conv


@api.get("/concierge/conversations/mine")
async def my_conversations(user: dict = Depends(get_current_user)):
    q = {"$or": [{"user_id": str(user["_id"])}, {"customer_email": user["email"]}]}
    return await db.conversations.find(q, {"_id": 0}).sort("updated_at", -1).to_list(200)


@api.get("/concierge/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["messages"] = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return conv


@api.post("/concierge/conversations/{conv_id}/messages")
async def add_message(conv_id: str, body: MessageIn):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    now = datetime.now(timezone.utc).isoformat()
    msg = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "customer", "body": body.body, "created_at": now}
    await db.messages.insert_one({**msg})
    await db.conversations.update_one({"id": conv_id},
        {"$set": {"updated_at": now, "status": "open", "last_message": body.body}, "$inc": {"unread_admin": 1}})
    return msg


@api.post("/concierge/conversations/{conv_id}/read")
async def customer_read(conv_id: str):
    await db.conversations.update_one({"id": conv_id}, {"$set": {"unread_customer": 0}})
    return {"ok": True}


@api.get("/concierge/conversations")
async def list_conversations(admin: dict = Depends(require_admin)):
    return await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)


@api.post("/admin/conversations/{conv_id}/messages")
async def admin_reply(conv_id: str, body: MessageIn, admin: dict = Depends(require_admin)):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    now = datetime.now(timezone.utc).isoformat()
    msg = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender": "admin", "body": body.body, "created_at": now}
    await db.messages.insert_one({**msg})
    await db.conversations.update_one({"id": conv_id},
        {"$set": {"updated_at": now, "last_message": body.body}, "$inc": {"unread_customer": 1}})
    return msg


@api.post("/admin/conversations/{conv_id}/read")
async def admin_read(conv_id: str, admin: dict = Depends(require_admin)):
    await db.conversations.update_one({"id": conv_id}, {"$set": {"unread_admin": 0}})
    return {"ok": True}


@api.patch("/admin/conversations/{conv_id}/status")
async def admin_conv_status(conv_id: str, body: StatusIn, admin: dict = Depends(require_admin)):
    await db.conversations.update_one({"id": conv_id}, {"$set": {"status": body.status}})
    return {"ok": True}


# ------------------------------------------------------------------ admin customers + stats
@api.get("/admin/customers")
async def admin_customers(admin: dict = Depends(require_admin)):
    users = await db.users.find({"role": "customer"}).sort("created_at", -1).to_list(1000)
    out = []
    for u in users:
        out.append({"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""),
                    "phone": u.get("phone", ""), "vip": u.get("vip", False),
                    "requests": await db.booking_requests.count_documents({"user_id": str(u["_id"])}),
                    "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at")})
    return out


@api.get("/admin/vip-members")
async def admin_vip(admin: dict = Depends(require_admin)):
    users = await db.users.find({"vip": True}).sort("vip_since", -1).to_list(1000)
    return [{"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""),
             "phone": u.get("phone", ""), "vip_since": u.get("vip_since")} for u in users]


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    return {
        "total_listings": await db.listings.count_documents({}),
        "published_listings": await db.listings.count_documents({"published": {"$ne": False}}),
        "new_inquiries": await db.booking_requests.count_documents({"status": "new"}),
        "total_inquiries": await db.booking_requests.count_documents({}),
        "active_conversations": await db.conversations.count_documents({"status": "open"}),
        "unread_conversations": await db.conversations.count_documents({"unread_admin": {"$gt": 0}}),
        "customers": await db.users.count_documents({"role": "customer"}),
        "vip_members": await db.users.count_documents({"vip": True}),
    }


# ------------------------------------------------------------------ backward-compat
@api.post("/booking-requests")
async def create_booking_legacy(body: RequestIn, user=Depends(optional_user)):
    return await _create_request(body, user)


@api.get("/booking-requests")
async def list_bookings_legacy(admin: dict = Depends(require_admin)):
    return await db.booking_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


app.include_router(api)

app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL, "http://localhost:3000"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# ------------------------------------------------------------------ startup
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(password),
            "name": "Concierge Admin", "role": "admin", "vip": True, "token_version": 0,
            "created_at": datetime.now(timezone.utc)})
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


def enrich(item: dict) -> dict:
    item.setdefault("published", True)
    item.setdefault("features", item.get("included_services", []))
    specs = {k: v for k, v in (item.get("specs") or []) if isinstance(k, str)}
    cat = item.get("category")
    if cat == "cars":
        item.setdefault("vehicle_type", item.get("subcategory"))
        if item.get("price_per_day"):
            item.setdefault("price_multiday", round(item["price_per_day"] * 0.9))
        item.setdefault("pickup_delivery", "Complimentary delivery & collection at your hotel, residence or private terminal within the city.")
        item.setdefault("rental_requirements", ["Valid driving licence (self-drive)", "Passport or government ID", "Refundable security deposit", "Minimum age 25"])
    if cat == "villas":
        item.setdefault("amenities", item.get("included_services", []))
        try:
            item.setdefault("bedrooms", int(re.sub(r"\D", "", specs.get("Bedrooms", "")) or 0) or None)
            item.setdefault("guests", int(re.sub(r"\D", "", specs.get("Guests", "")) or 0) or None)
        except Exception:
            pass
    return item


async def seed_listings():
    for item in SEED_LISTINGS:
        await db.listings.update_one({"slug": item["slug"]}, {"$set": enrich(dict(item))}, upsert=True)
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
    await db.files.create_index("storage_path")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_admin()
    await seed_listings()
    await get_settings_doc()


@app.on_event("shutdown")
async def shutdown():
    client.close()
