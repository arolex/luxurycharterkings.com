"""Backend tests for LuxuryCharterKings."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voyage-preview-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "arokusiaalex@gmail.com"
ADMIN_PASSWORD = "ChangeMe123!"

SALES_WORDS = ["Buy", "For Sale", "Seller", "Dealer", "Purchase"]


@pytest.fixture(scope="session")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    # Verify httpOnly cookies present
    cookies = r.cookies
    assert "access_token" in [c.name for c in cookies]
    return s


# ---------- catalog
def test_categories(sess):
    r = sess.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    ids = {c["id"] for c in cats}
    assert {"jets", "yachts", "cars", "villas", "tours", "vip"}.issubset(ids)
    assert "helicopters" not in ids and "hotels" not in ids


def test_listings_all(sess):
    r = sess.get(f"{API}/listings")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) > 0
    # No sales words in content
    joined = str(items)
    for w in SALES_WORDS:
        assert w.lower() not in joined.lower(), f"Sales word '{w}' found in listings"


def test_listings_cars(sess):
    r = sess.get(f"{API}/listings", params={"category": "cars"})
    assert r.status_code == 200
    cars = r.json()
    assert len(cars) >= 6
    subs = {c.get("subcategory") for c in cars}
    # Motor Homes subcategory should exist
    assert any(s and "motor" in s.lower() for s in subs), f"No motor homes subcategory in {subs}"


def test_listing_detail(sess):
    r = sess.get(f"{API}/listings", params={"category": "cars"})
    slug = r.json()[0]["slug"]
    r2 = sess.get(f"{API}/listings/{slug}")
    assert r2.status_code == 200
    d = r2.json()
    assert d["slug"] == slug
    assert "name" in d and "location" in d


def test_listing_not_found(sess):
    r = sess.get(f"{API}/listings/nonexistent-slug-xyz")
    assert r.status_code == 404


# ---------- concierge (public)
def test_create_conversation_with_listing(sess):
    listings = sess.get(f"{API}/listings", params={"category": "cars"}).json()
    slug = listings[0]["slug"]
    payload = {
        "customer_name": "TEST_Visitor",
        "customer_email": f"test_{uuid.uuid4().hex[:6]}@example.com",
        "message": "I would like to inquire about this vehicle.",
        "listing_id": slug,
    }
    r = sess.post(f"{API}/concierge/conversations", json=payload)
    assert r.status_code == 200, r.text
    conv = r.json()
    assert conv["listing_id"] == slug
    assert conv["listing_name"] == listings[0]["name"]
    assert len(conv["messages"]) >= 2  # customer + auto ack
    return conv["id"]


def test_add_message_to_conversation(sess):
    listings = sess.get(f"{API}/listings").json()
    slug = listings[0]["slug"]
    r = sess.post(f"{API}/concierge/conversations", json={
        "customer_name": "TEST_Reply", "customer_email": "t@example.com",
        "message": "hi", "listing_id": slug,
    })
    conv_id = r.json()["id"]
    r2 = sess.post(f"{API}/concierge/conversations/{conv_id}/messages",
                   json={"body": "Follow-up question", "sender": "customer"})
    assert r2.status_code == 200
    # Verify persisted
    r3 = sess.get(f"{API}/concierge/conversations/{conv_id}")
    assert r3.status_code == 200
    msgs = r3.json()["messages"]
    assert any(m["body"] == "Follow-up question" for m in msgs)


# ---------- booking
def test_create_booking(sess):
    listings = sess.get(f"{API}/listings").json()
    slug = listings[0]["slug"]
    r = sess.post(f"{API}/booking-requests", json={
        "listing_id": slug,
        "customer_name": "TEST_Booker",
        "customer_email": "book@example.com",
        "phone": "555-0001",
        "start_date": "2026-02-01",
        "end_date": "2026-02-05",
        "notes": "test",
    })
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["listing_id"] == slug
    assert b["listing_name"] == listings[0]["name"]


def test_booking_invalid_listing(sess):
    r = sess.post(f"{API}/booking-requests", json={
        "listing_id": "does-not-exist",
        "customer_name": "x", "customer_email": "a@b.com",
    })
    assert r.status_code == 404


# ---------- admin gating
def test_admin_conversations_anon_forbidden(sess):
    r = requests.get(f"{API}/concierge/conversations")
    assert r.status_code in (401, 403)


def test_admin_bookings_anon_forbidden(sess):
    r = requests.get(f"{API}/booking-requests")
    assert r.status_code in (401, 403)


def test_admin_can_list_conversations(admin_sess):
    r = admin_sess.get(f"{API}/concierge/conversations")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_can_list_bookings(admin_sess):
    r = admin_sess.get(f"{API}/booking-requests")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- auth
def test_login_admin_and_me(admin_sess):
    r = admin_sess.get(f"{API}/auth/me")
    assert r.status_code == 200
    u = r.json()
    assert u["email"] == ADMIN_EMAIL
    assert u["role"] == "admin"


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass!!"})
    assert r.status_code == 401


def test_register_new_customer():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "TEST User"})
    assert r.status_code == 200, r.text
    u = r.json()
    assert u["email"] == email
    assert u["role"] == "customer"
    # httpOnly cookies present
    assert "access_token" in [c.name for c in s.cookies]


def test_forgot_password_generic():
    r1 = requests.post(f"{API}/auth/forgot-password", json={"email": "nonexistent_xyz@example.com"})
    r2 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json() == r2.json()
