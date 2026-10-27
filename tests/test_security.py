"""Security checks that don't need a database connection."""
from starlette.requests import Request

from app.db import connect_args
from app.dependencies import client_ip


def _request(headers: dict[str, str], peer: str = "100.64.0.7") -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (peer, 1234),
    })


def test_rate_limit_key_uses_railway_client_ip():
    assert client_ip(_request({"X-Real-IP": "203.0.113.9"})) == "203.0.113.9"


def test_rate_limit_key_falls_back_to_peer_address():
    assert client_ip(_request({})) == "100.64.0.7"


def test_admin_refresh_rejects_missing_secret(client):
    assert client.post("/api/admin/refresh").status_code == 403


def test_admin_refresh_rejects_wrong_secret(client):
    response = client.post("/api/admin/refresh", headers={"X-Refresh-Secret": "wrong"})
    assert response.status_code == 403


def test_admin_refresh_hidden_from_openapi(client):
    assert "/api/admin/refresh" not in client.get("/openapi.json").json()["paths"]


def test_responses_carry_security_headers(client):
    headers = client.get("/health").headers
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"


def test_cors_does_not_allow_credentials(client):
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert "access-control-allow-credentials" not in response.headers


def test_remote_database_requires_tls_and_timeout():
    args = connect_args("postgresql://u:p@db.example.com:5432/x", statement_timeout_ms=10_000)
    assert args["sslmode"] == "require"
    assert "statement_timeout=10000" in args["options"]


def test_local_database_allows_plain_connection():
    assert connect_args("postgresql://u:p@localhost:5432/x") == {}


def test_explicit_sslmode_in_url_wins():
    assert "sslmode" not in connect_args("postgresql://u:p@db.example.com/x?sslmode=verify-full")


def test_insights_rejects_unknown_geo_before_calling_ai(client):
    response = client.get("/api/insights", params={"chart": "unemployment", "geos": "Canada,Atlantis"})
    assert response.status_code == 400
