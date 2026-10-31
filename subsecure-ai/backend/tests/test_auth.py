"""Test 4 (roles) + auth policy tests."""


def test_login_success(client, admin_token):
    assert admin_token


def test_login_wrong_password(client):
    resp = client.post(
        "/api/v1/auth/login", json={"email": "admin@brightloop.io", "password": "Wrong@12345"}
    )
    assert resp.status_code == 401


def test_register_weak_password_rejected(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Weak", "email": "weak@example.com", "password": "weakpass"},
    )
    assert resp.status_code == 422


def test_register_duplicate_email_rejected(client, admin_token):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Dup", "email": "admin@brightloop.io", "password": "Strong@123"},
    )
    assert resp.status_code == 409


def test_me(client, admin_token):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "ADMIN"


def test_customer_cannot_create_product(client, customer_token):
    resp = client.post(
        "/api/v1/products",
        json={"name": "Hacker Product", "sales_price": "1.00"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403


def test_customer_cannot_execute_billing(client, customer_token):
    resp = client.post(
        "/api/v1/billing/execute",
        json={"confirm": True},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403


def test_staff_cannot_create_staff(client, staff_token):
    resp = client.post(
        "/api/v1/auth/staff",
        json={"name": "New Staff", "email": "newstaff@brightloop.io", "password": "Strong@123"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp.status_code == 403


def test_admin_can_create_staff(client, admin_token):
    resp = client.post(
        "/api/v1/auth/staff",
        json={"name": "Second Staff", "email": "staff2@brightloop.io", "password": "Strong@123"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "STAFF"


def test_unauthenticated_rejected(client):
    assert client.get("/api/v1/invoices").status_code in (401, 403)


def test_customer_cannot_escalate_role_via_register(client):
    """Registration must always create CUSTOMER accounts regardless of input."""
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Eve", "email": "eve@example.com", "password": "Strong@123", "role": "ADMIN"},
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["role"] == "CUSTOMER"
