from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, List

import bcrypt
import jwt
import httpx
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, EmailStr

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------- Mongo helpers ----------

def validate_object_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        if doc is None:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        return cls(**doc)

    def to_mongo(self):
        return self.model_dump(by_alias=True, exclude={"id"}, exclude_none=True)


# ---------- Password / JWT ----------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str, email: str):
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ---------- Models ----------

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class BookCreate(BaseModel):
    title: str
    author: str
    cover_url: Optional[str] = None
    description: Optional[str] = None
    published_year: Optional[str] = None
    google_books_id: Optional[str] = None


class ReviewCreate(BaseModel):
    book_id: str
    title: str
    content: str
    rating: int = Field(ge=1, le=5)


class CommentCreate(BaseModel):
    content: str


def user_to_public(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "created_at": user["created_at"],
    }


# ---------- Auth Routes ----------

@api_router.post("/auth/register")
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    set_auth_cookies(response, str(result.inserted_id), email)
    return user_to_public(user_doc)


@api_router.post("/auth/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until") and attempt["locked_until"] > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        failed_count = (attempt.get("failed_count", 0) if attempt else 0) + 1
        update = {"failed_count": failed_count, "identifier": identifier}
        if failed_count >= 5:
            update["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, str(user["_id"]), email)
    return user_to_public(user)


@api_router.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return user_to_public(current_user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"Password reset link for {email}: /reset-password?token={token}")
    return {"message": "If that email exists, a reset link has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    record = await db.password_reset_tokens.find_one({"token": payload.token})
    if not record or record.get("used") or record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await db.users.update_one({"_id": ObjectId(record["user_id"])}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    await db.password_reset_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    return {"message": "Password updated successfully"}


# ---------- Books Routes ----------

async def search_google_books_source(http_client: httpx.AsyncClient, q: str):
    resp = await http_client.get("https://www.googleapis.com/books/v1/volumes", params={"q": q, "maxResults": 12})
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        image_links = info.get("imageLinks", {})
        results.append({
            "google_books_id": item.get("id"),
            "title": info.get("title", "Untitled"),
            "author": ", ".join(info.get("authors", ["Unknown Author"])),
            "cover_url": (image_links.get("thumbnail") or image_links.get("smallThumbnail") or "").replace("http://", "https://"),
            "description": info.get("description", ""),
            "published_year": (info.get("publishedDate") or "")[:4],
        })
    return results


async def search_open_library_source(http_client: httpx.AsyncClient, q: str):
    resp = await http_client.get(
        "https://openlibrary.org/search.json",
        params={"q": q, "limit": 12, "fields": "key,title,author_name,cover_i,first_publish_year"},
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for doc in data.get("docs", []):
        cover_i = doc.get("cover_i")
        results.append({
            "google_books_id": doc.get("key", "").replace("/works/", ""),
            "title": doc.get("title", "Untitled"),
            "author": ", ".join(doc.get("author_name", ["Unknown Author"])),
            "cover_url": f"https://covers.openlibrary.org/b/id/{cover_i}-L.jpg" if cover_i else "",
            "description": "",
            "published_year": str(doc.get("first_publish_year", "")),
        })
    return results


@api_router.get("/books/search")
async def search_books(q: str = Query(..., min_length=1)):
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        try:
            return await search_google_books_source(http_client, q)
        except Exception as e:
            logger.warning(f"Google Books API unavailable, falling back to Open Library: {e}")
        try:
            return await search_open_library_source(http_client, q)
        except Exception as e:
            logger.error(f"Open Library API error: {e}")
            raise HTTPException(status_code=502, detail="Could not reach book search right now")


@api_router.get("/books")
async def list_books(q: Optional[str] = None, skip: int = 0, limit: int = 24):
    query = {}
    if q:
        query = {"$or": [{"title": {"$regex": q, "$options": "i"}}, {"author": {"$regex": q, "$options": "i"}}]}
    cursor = db.books.find(query).sort("created_at", -1).skip(skip).limit(limit)
    books = await cursor.to_list(length=limit)
    total = await db.books.count_documents(query)
    for b in books:
        b["_id"] = str(b["_id"])
    return {"items": books, "total": total}


@api_router.get("/books/{book_id}")
async def get_book(book_id: str):
    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book["_id"] = str(book["_id"])
    return book


@api_router.post("/books")
async def create_book(payload: BookCreate, current_user: dict = Depends(get_current_user)):
    if payload.google_books_id:
        existing = await db.books.find_one({"google_books_id": payload.google_books_id})
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing
    doc = payload.model_dump()
    doc["added_by"] = current_user["_id"]
    doc["added_by_name"] = current_user["name"]
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.books.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


# ---------- Reviews Routes ----------

@api_router.post("/reviews")
async def create_review(payload: ReviewCreate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(payload.book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    book = await db.books.find_one({"_id": ObjectId(payload.book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    doc = {
        "book_id": payload.book_id,
        "book_title": book["title"],
        "book_author": book["author"],
        "book_cover": book.get("cover_url"),
        "user_id": current_user["_id"],
        "user_name": current_user["name"],
        "title": payload.title,
        "content": payload.content,
        "rating": payload.rating,
        "likes": [],
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.reviews.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@api_router.get("/reviews")
async def list_reviews(
    sort: str = "newest",
    book_id: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    query = {}
    if book_id:
        query["book_id"] = book_id
    if user_id:
        query["user_id"] = user_id

    cursor = db.reviews.find(query)
    reviews = await cursor.to_list(length=1000)
    for r in reviews:
        r["_id"] = str(r["_id"])
        r["likes_count"] = len(r.get("likes", []))
        r["liked_by_me"] = bool(current_user and current_user["_id"] in r.get("likes", []))

    if sort == "top":
        reviews.sort(key=lambda r: r["likes_count"], reverse=True)
    else:
        reviews.sort(key=lambda r: r["created_at"], reverse=True)

    total = len(reviews)
    reviews = reviews[skip: skip + limit]
    return {"items": reviews, "total": total}


@api_router.get("/reviews/{review_id}")
async def get_review(review_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review["_id"] = str(review["_id"])
    review["likes_count"] = len(review.get("likes", []))
    review["liked_by_me"] = bool(current_user and current_user["_id"] in review.get("likes", []))
    return review


@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review["user_id"] != current_user["_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.reviews.delete_one({"_id": ObjectId(review_id)})
    await db.comments.delete_many({"review_id": review_id})
    return {"message": "Review deleted"}


@api_router.post("/reviews/{review_id}/like")
async def toggle_like(review_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    likes = review.get("likes", [])
    uid = current_user["_id"]
    if uid in likes:
        await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$pull": {"likes": uid}})
        liked = False
        likes_count = len(likes) - 1
    else:
        await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$push": {"likes": uid}})
        liked = True
        likes_count = len(likes) + 1
    return {"liked": liked, "likes_count": likes_count}


# ---------- Comments Routes ----------

@api_router.get("/reviews/{review_id}/comments")
async def list_comments(review_id: str):
    cursor = db.comments.find({"review_id": review_id}).sort("created_at", 1)
    comments = await cursor.to_list(length=1000)
    for c in comments:
        c["_id"] = str(c["_id"])
    return comments


@api_router.post("/reviews/{review_id}/comments")
async def create_comment(review_id: str, payload: CommentCreate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    doc = {
        "review_id": review_id,
        "user_id": current_user["_id"],
        "user_name": current_user["name"],
        "content": payload.content,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.comments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$inc": {"comments_count": 1}})
    return doc


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != current_user["_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.comments.delete_one({"_id": ObjectId(comment_id)})
    await db.reviews.update_one({"_id": ObjectId(comment["review_id"])}, {"$inc": {"comments_count": -1}})
    return {"message": "Comment deleted"}


@api_router.get("/")
async def root():
    return {"message": "Bookish API is running"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier", unique=True)
    await seed_admin()


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
