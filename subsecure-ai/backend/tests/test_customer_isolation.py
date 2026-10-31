"""Test 3 (customer isolation) — data scoping enforcement."""


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_customer_sees_only_own_invoices(client, customer_token, admin_token):
    mine = client.get("/api/v1/invoices", headers=auth(customer_token)).json()
    assert mine, "Seed customer should have invoices"
    me = client.get("/api/v1/auth/me", headers=auth(customer_token)).json()
    assert all(i["customer_id"] == me["customer_id"] for i in mine)

    all_invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    assert len(all_invoices) > len(mine)


def test_customer_cannot_read_other_invoice(client, customer_token, admin_token):
    all_invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    me = client.get("/api/v1/auth/me", headers=auth(customer_token)).json()
    foreign = next(i for i in all_invoices if i["customer_id"] != me["customer_id"])
    resp = client.get(f"/api/v1/invoices/{foreign['id']}", headers=auth(customer_token))
    assert resp.status_code == 404  # safe: no existence leak


def test_customer_cannot_read_other_subscription(client, customer_token, admin_token):
    subs = client.get("/api/v1/subscriptions", headers=auth(admin_token)).json()
    me = client.get("/api/v1/auth/me", headers=auth(customer_token)).json()
    foreign = next(s for s in subs if s["customer_id"] != me["customer_id"])
    resp = client.get(f"/api/v1/subscriptions/{foreign['id']}", headers=auth(customer_token))
    assert resp.status_code == 404


def test_customer_cannot_list_all_customers(client, customer_token):
    resp = client.get("/api/v1/customers", headers=auth(customer_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1  # only own profile
