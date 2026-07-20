"""Backend API tests for Inkwell Book Review app."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://review-reads-1.internal.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@bookclub.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"
    assert "access_token" in s.cookies
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    r = s.post(f"{API}/auth/register", json={"name": "Test Reader", "email": email, "password": pw})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"].lower() == email.lower()
    assert data["role"] == "user"
    s.email = email
    s.password = pw
    s.user_id = data["id"]
    return s


@pytest.fixture(scope="session")
def second_user_session():
    s = requests.Session()
    email = f"TEST_user2_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "Other Reader", "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200
    s.user_id = r.json()["id"]
    return s


# -------- Health --------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# -------- Auth --------
def test_me_unauthenticated():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_admin_login_and_me(admin_session):
    r = admin_session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_register_duplicate(user_session):
    r = requests.post(f"{API}/auth/register", json={"name": "X", "email": user_session.email, "password": "abcdef1"})
    assert r.status_code == 400


def test_login_invalid_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
    assert r.status_code == 401


def test_refresh_token(user_session):
    r = user_session.post(f"{API}/auth/refresh")
    assert r.status_code == 200


# -------- Books --------
@pytest.fixture(scope="session")
def created_book(admin_session):
    payload = {
        "title": "TEST_Book_" + uuid.uuid4().hex[:6],
        "author": "TEST Author",
        "cover_url": "https://example.com/cover.jpg",
        "description": "A test book",
        "published_year": "2024",
    }
    r = admin_session.post(f"{API}/books", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == payload["title"]
    assert "_id" in data
    return data


def test_create_book_requires_auth():
    r = requests.post(f"{API}/books", json={"title": "X", "author": "Y"})
    assert r.status_code == 401


def test_get_book(created_book):
    r = requests.get(f"{API}/books/{created_book['_id']}")
    assert r.status_code == 200
    assert r.json()["title"] == created_book["title"]


def test_list_books(created_book):
    r = requests.get(f"{API}/books")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total" in data
    assert any(b["_id"] == created_book["_id"] for b in data["items"])


def test_book_search_external():
    r = requests.get(f"{API}/books/search", params={"q": "harry potter"})
    assert r.status_code == 200, r.text
    results = r.json()
    assert isinstance(results, list)
    assert len(results) > 0
    assert "title" in results[0]


def test_get_book_invalid_id():
    r = requests.get(f"{API}/books/notavalidid")
    assert r.status_code == 404


# -------- Reviews --------
@pytest.fixture(scope="session")
def created_review(user_session, created_book):
    payload = {
        "book_id": created_book["_id"],
        "title": "TEST Review Title",
        "content": "This is a fantastic test review.",
        "rating": 5,
    }
    r = user_session.post(f"{API}/reviews", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == payload["title"]
    assert data["rating"] == 5
    assert data["book_title"] == created_book["title"]
    return data


def test_create_review_requires_auth(created_book):
    r = requests.post(f"{API}/reviews", json={"book_id": created_book["_id"], "title": "x", "content": "y", "rating": 3})
    assert r.status_code == 401


def test_create_review_invalid_rating(user_session, created_book):
    r = user_session.post(f"{API}/reviews", json={"book_id": created_book["_id"], "title": "x", "content": "y", "rating": 7})
    assert r.status_code == 422


def test_get_review(created_review):
    r = requests.get(f"{API}/reviews/{created_review['_id']}")
    assert r.status_code == 200
    d = r.json()
    assert d["title"] == created_review["title"]
    assert "likes_count" in d


def test_list_reviews_sort(created_review):
    for sort in ["newest", "top"]:
        r = requests.get(f"{API}/reviews", params={"sort": sort})
        assert r.status_code == 200
        assert "items" in r.json()


def test_like_toggle(user_session, created_review):
    r1 = user_session.post(f"{API}/reviews/{created_review['_id']}/like")
    assert r1.status_code == 200
    assert r1.json()["liked"] is True
    r2 = user_session.post(f"{API}/reviews/{created_review['_id']}/like")
    assert r2.status_code == 200
    assert r2.json()["liked"] is False


def test_non_owner_cannot_delete_review(second_user_session, created_review):
    r = second_user_session.delete(f"{API}/reviews/{created_review['_id']}")
    assert r.status_code == 403


# -------- Comments --------
def test_comment_flow(user_session, second_user_session, created_review):
    # user posts comment
    r = user_session.post(f"{API}/reviews/{created_review['_id']}/comments", json={"content": "TEST comment"})
    assert r.status_code == 200, r.text
    comment_id = r.json()["_id"]

    # list comments
    r = requests.get(f"{API}/reviews/{created_review['_id']}/comments")
    assert r.status_code == 200
    assert any(c["_id"] == comment_id for c in r.json())

    # other user cannot delete
    r = second_user_session.delete(f"{API}/comments/{comment_id}")
    assert r.status_code == 403

    # owner can delete
    r = user_session.delete(f"{API}/comments/{comment_id}")
    assert r.status_code == 200


def test_admin_can_delete_any_comment(admin_session, user_session, created_review):
    r = user_session.post(f"{API}/reviews/{created_review['_id']}/comments", json={"content": "TEST admin-del"})
    assert r.status_code == 200
    cid = r.json()["_id"]
    r = admin_session.delete(f"{API}/comments/{cid}")
    assert r.status_code == 200


# -------- Cleanup / delete review (admin) --------
def test_admin_can_delete_any_review(admin_session, created_review):
    r = admin_session.delete(f"{API}/reviews/{created_review['_id']}")
    assert r.status_code == 200
    r2 = requests.get(f"{API}/reviews/{created_review['_id']}")
    assert r2.status_code == 404


def test_logout(user_session):
    r = user_session.post(f"{API}/auth/logout")
    assert r.status_code == 200
    r2 = user_session.get(f"{API}/auth/me")
    assert r2.status_code == 401
