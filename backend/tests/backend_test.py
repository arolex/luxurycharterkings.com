"""Backend tests for LuxuryCharterKings - iteration 2."""
import os
import io
import uuid
import time
import requests
import pytest

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    with open(os.path.abspath(env_path)) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "arokusiaalex@gmail.com"
ADMIN_PASSWORD = "ChangeMe123!"

SALES_WORDS = ["buy", "for sale", "seller", "dealer", "purchase"]


# ---------------- fixtures
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
    assert "access_token" in [c.name for c in r.cookies]
    return s


@pytest.fixture(scope="session")
def customer_sess():
    """A fresh, registered customer session."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "Passw0rd!", "name": "TEST User", "phone": "555-0100"})
    assert r.status_code == 200, r.text
    s.email = email  # type: ignore[attr-defined]
    return s


# ---------------- catalog
def test_categories(sess):
    r = sess.get(f"{API}/categories")
    assert r.status_code == 200
    ids = {c["id"] for c in r.json()}
    assert {"jets", "yachts", "cars", "villas", "tours", "vip"}.issubset(ids)


def test_listings_all(sess):
    r = sess.get(f"{API}/listings")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) > 0
    joined = str(items).lower()
    for w in SALES_WORDS:
        assert w not in joined, f"Sales word '{w}' found in listings"


def test_listings_cars_motor_homes(sess):
    r = sess.get(f"{API}/listings", params={"category": "cars"})
    assert r.status_code == 200
    cars = r.json()
    assert len(cars) >= 1
    subs = {c.get("subcategory") for c in cars}
    assert any(s and "motor" in s.lower() for s in subs), f"No motor homes in {subs}"


def test_listings_filter_location(sess):
    all_items = sess.get(f"{API}/listings").json()
    loc = next((i["location"] for i in all_items if i.get("location")), None)
    assert loc
    r = sess.get(f"{API}/listings", params={"location": loc})
    assert r.status_code == 200
    for i in r.json():
        assert i["location"] == loc


def test_listing_detail_and_404(sess):
    slug = sess.get(f"{API}/listings").json()[0]["slug"]
    r = sess.get(f"{API}/listings/{slug}")
    assert r.status_code == 200 and r.json()["slug"] == slug
    assert sess.get(f"{API}/listings/nonexistent-xyz").status_code == 404


# ---------------- auth
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass!!"})
    assert r.status_code in (401, 429)


def test_admin_me(admin_sess):
    r = admin_sess.get(f"{API}/auth/me")
    assert r.status_code == 200 and r.json()["role"] == "admin"


def test_customer_me(customer_sess):
    r = customer_sess.get(f"{API}/auth/me")
    assert r.status_code == 200
    u = r.json()
    assert u["role"] == "customer" and u["vip"] is False


def test_profile_update(customer_sess):
    r = customer_sess.patch(f"{API}/auth/profile", json={"name": "TEST Updated", "phone": "555-9999"})
    assert r.status_code == 200
    assert r.json()["name"] == "TEST Updated"
    # verify persisted
    me = customer_sess.get(f"{API}/auth/me").json()
    assert me["name"] == "TEST Updated" and me["phone"] == "555-9999"


def test_forgot_password_generic():
    r1 = requests.post(f"{API}/auth/forgot-password", json={"email": "nobody_xyz@example.com"})
    r2 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json() == r2.json()


# ---------------- settings
def test_settings_public(sess):
    r = sess.get(f"{API}/settings")
    assert r.status_code == 200
    d = r.json()
    assert "company_name" in d and "vip_discount" in d


def test_settings_update_admin(admin_sess):
    # Save & restore whatsapp to leave the app in initial state
    current = admin_sess.get(f"{API}/settings").json()
    orig_wa = current.get("whatsapp_number", "")
    orig_disc = current.get("vip_discount", 10)
    try:
        r = admin_sess.put(f"{API}/admin/settings",
                           json={"whatsapp_number": "+15551234567", "vip_discount": 15})
        assert r.status_code == 200
        d = r.json()
        assert d["whatsapp_number"] == "+15551234567" and d["vip_discount"] == 15
        # verify public reflects
        pub = requests.get(f"{API}/settings").json()
        assert pub["whatsapp_number"] == "+15551234567"
    finally:
        admin_sess.put(f"{API}/admin/settings",
                       json={"whatsapp_number": orig_wa, "vip_discount": orig_disc})


def test_settings_anon_forbidden():
    r = requests.put(f"{API}/admin/settings", json={"company_name": "hack"})
    assert r.status_code in (401, 403)


# ---------------- requests
def test_create_request_book(sess):
    slug = sess.get(f"{API}/listings", params={"category": "villas"}).json()[0]["slug"]
    r = sess.post(f"{API}/requests", json={
        "listing_id": slug, "request_type": "book",
        "full_name": "TEST Booker", "email": "book@test.org", "phone": "555-1",
        "destination": "Bali", "guests": 4, "message": "villa book",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["listing_id"] == slug and d["request_type"] == "book" and d["status"] == "new"


def test_create_request_quote_car(sess):
    slug = sess.get(f"{API}/listings", params={"category": "cars"}).json()[0]["slug"]
    r = sess.post(f"{API}/requests", json={
        "listing_id": slug, "request_type": "quote",
        "full_name": "TEST Quoter", "email": "q@test.org",
        "start_date": "2026-02-01", "end_date": "2026-02-05",
        "chauffeur": True, "requirements": ["Airport pickup", "Child seat"],
        "message": "quote please",
    })
    assert r.status_code == 200
    d = r.json()
    assert d["request_type"] == "quote" and d["chauffeur"] is True
    assert "Airport pickup" in d["requirements"]


def test_request_invalid_listing():
    r = requests.post(f"{API}/requests", json={
        "listing_id": "does-not-exist", "full_name": "x", "email": "a@b.com"})
    assert r.status_code == 404


def test_my_requests(customer_sess):
    slug = customer_sess.get(f"{API}/listings").json()[0]["slug"]
    r = customer_sess.post(f"{API}/requests", json={
        "listing_id": slug, "full_name": "TEST Mine",
        "email": customer_sess.email, "message": "mine test"})  # type: ignore[attr-defined]
    assert r.status_code == 200
    req_id = r.json()["id"]
    mine = customer_sess.get(f"{API}/requests/mine")
    assert mine.status_code == 200
    ids = [x["id"] for x in mine.json()]
    assert req_id in ids


def test_my_requests_anon_forbidden():
    assert requests.get(f"{API}/requests/mine").status_code in (401, 403)


def test_admin_list_requests_and_status(admin_sess, sess):
    slug = sess.get(f"{API}/listings").json()[0]["slug"]
    created = sess.post(f"{API}/requests", json={
        "listing_id": slug, "full_name": "TEST Status",
        "email": "s@test.org", "message": "status flow"}).json()
    req_id = created["id"]
    lst = admin_sess.get(f"{API}/admin/requests")
    assert lst.status_code == 200
    assert any(x["id"] == req_id for x in lst.json())
    # status change
    r = admin_sess.patch(f"{API}/admin/requests/{req_id}/status", json={"status": "contacted"})
    assert r.status_code == 200 and r.json()["status"] == "contacted"


def test_admin_requests_anon_forbidden():
    assert requests.get(f"{API}/admin/requests").status_code in (401, 403)


# ---------------- concierge
def test_concierge_create_and_message(sess):
    slug = sess.get(f"{API}/listings").json()[0]["slug"]
    r = sess.post(f"{API}/concierge/conversations", json={
        "customer_name": "TEST Visitor", "customer_email": "v@test.org",
        "message": "hi", "listing_id": slug})
    assert r.status_code == 200
    conv = r.json()
    assert conv["listing_id"] == slug and len(conv["messages"]) >= 2
    cid = conv["id"]
    # customer message
    m = sess.post(f"{API}/concierge/conversations/{cid}/messages", json={"body": "follow up"})
    assert m.status_code == 200
    # fetch back
    got = sess.get(f"{API}/concierge/conversations/{cid}").json()
    assert any(msg["body"] == "follow up" for msg in got["messages"])


def test_admin_reply_and_unread(admin_sess, sess):
    slug = sess.get(f"{API}/listings").json()[0]["slug"]
    cid = sess.post(f"{API}/concierge/conversations", json={
        "customer_name": "TEST U", "customer_email": "u@test.org",
        "message": "hi", "listing_id": slug}).json()["id"]
    r = admin_sess.post(f"{API}/admin/conversations/{cid}/messages", json={"body": "admin here"})
    assert r.status_code == 200 and r.json()["sender"] == "admin"
    # unread_customer should increment
    got = sess.get(f"{API}/concierge/conversations/{cid}").json()
    assert got["unread_customer"] >= 1
    # customer marks read
    sess.post(f"{API}/concierge/conversations/{cid}/read")
    got2 = sess.get(f"{API}/concierge/conversations/{cid}").json()
    assert got2["unread_customer"] == 0


def test_my_conversations(customer_sess):
    slug = customer_sess.get(f"{API}/listings").json()[0]["slug"]
    customer_sess.post(f"{API}/concierge/conversations", json={
        "customer_name": "TEST Me", "customer_email": customer_sess.email,  # type: ignore[attr-defined]
        "message": "mine chat", "listing_id": slug})
    r = customer_sess.get(f"{API}/concierge/conversations/mine")
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_admin_concierge_list(admin_sess):
    r = admin_sess.get(f"{API}/concierge/conversations")
    assert r.status_code == 200 and isinstance(r.json(), list)


# ---------------- vip
def test_vip_register(customer_sess):
    r = customer_sess.post(f"{API}/vip/register")
    assert r.status_code == 200 and r.json()["vip"] is True
    me = customer_sess.get(f"{API}/auth/me").json()
    assert me["vip"] is True


def test_vip_anon_forbidden():
    assert requests.post(f"{API}/vip/register").status_code in (401, 403)


# ---------------- admin inventory CRUD
def test_admin_inventory_crud(admin_sess):
    payload = {"category": "cars", "subcategory": "TEST-Sub",
               "name": f"TEST_Car_{uuid.uuid4().hex[:6]}", "location": "Test City",
               "price_per_day": 500, "published": True,
               "images": [], "specs": [], "features": []}
    r = admin_sess.post(f"{API}/admin/listings", json=payload)
    assert r.status_code == 200
    created = r.json()
    slug = created["slug"]
    # GET public
    assert admin_sess.get(f"{API}/listings/{slug}").status_code == 200
    # UPDATE - toggle publish off
    upd = {**payload, "published": False}
    r2 = admin_sess.put(f"{API}/admin/listings/{slug}", json=upd)
    assert r2.status_code == 200
    # now public should 404
    assert requests.get(f"{API}/listings/{slug}").status_code == 404
    # DELETE
    r3 = admin_sess.delete(f"{API}/admin/listings/{slug}")
    assert r3.status_code == 200
    assert admin_sess.delete(f"{API}/admin/listings/{slug}").status_code == 404


def test_admin_inventory_anon_forbidden():
    assert requests.get(f"{API}/admin/listings").status_code in (401, 403)
    assert requests.post(f"{API}/admin/listings",
                         json={"category": "cars", "name": "x"}).status_code in (401, 403)


# ---------------- upload
def test_admin_upload_and_serve(admin_sess):
    # 1x1 png
    png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90"
           b"wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01[\xac\xfd\r\x00\x00\x00\x00IEND\xaeB`\x82")
    s = requests.Session()
    # copy admin cookies for multipart request (Content-Type must not be JSON)
    for c in admin_sess.cookies:
        s.cookies.set(c.name, c.value)
    files = {"file": ("test.png", io.BytesIO(png), "image/png")}
    r = s.post(f"{API}/admin/upload", files=files)
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("/api/files/")
    # fetch served file
    r2 = requests.get(f"{BASE_URL}{url}")
    assert r2.status_code == 200
    assert r2.headers.get("Content-Type", "").startswith("image/")


# ---------------- admin customers / vip / stats
def test_admin_customers(admin_sess):
    r = admin_sess.get(f"{API}/admin/customers")
    assert r.status_code == 200 and isinstance(r.json(), list)


def test_admin_vip_members(admin_sess):
    r = admin_sess.get(f"{API}/admin/vip-members")
    assert r.status_code == 200 and isinstance(r.json(), list)


def test_admin_stats(admin_sess):
    r = admin_sess.get(f"{API}/admin/stats")
    assert r.status_code == 200
    keys = {"total_listings", "new_inquiries", "customers", "vip_members"}
    assert keys.issubset(r.json().keys())
