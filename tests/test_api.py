"""
Integration tests for the Canada Labour Market API.
Uses a real DB connection — no mocks — so these tests catch actual data issues.
"""


# ---------------------------------------------------------------------------
# 1. GET /health
# ---------------------------------------------------------------------------

def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_body(client):
    response = client.get("/health")
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# 2. GET /api/summary
# ---------------------------------------------------------------------------

def test_summary_returns_200(client):
    response = client.get("/api/summary")
    assert response.status_code == 200


def test_summary_has_required_keys(client):
    data = client.get("/api/summary").json()
    assert "canada_rate" in data
    assert "worst_province" in data
    assert "most_recent_month" in data
    assert "jobs_lost" in data


def test_summary_canada_rate_is_valid_float(client):
    data = client.get("/api/summary").json()
    rate = data["canada_rate"]
    assert isinstance(rate, float)
    assert 0 < rate < 25


def test_summary_jobs_lost_is_non_zero_int(client):
    data = client.get("/api/summary").json()
    jobs = data["jobs_lost"]
    assert jobs is not None
    assert isinstance(jobs, int)
    assert jobs != 0


# ---------------------------------------------------------------------------
# 3. GET /api/unemployment — valid params
# ---------------------------------------------------------------------------

def test_unemployment_returns_200(client):
    response = client.get("/api/unemployment", params={"geo": "Canada", "year_from": 2023, "year_to": 2024})
    assert response.status_code == 200


def test_unemployment_has_labels(client):
    data = client.get("/api/unemployment", params={"geo": "Canada", "year_from": 2023, "year_to": 2024}).json()
    assert "labels" in data
    assert isinstance(data["labels"], list)
    assert len(data["labels"]) > 0


def test_unemployment_canada_series_is_floats(client):
    data = client.get("/api/unemployment", params={"geo": "Canada", "year_from": 2023, "year_to": 2024}).json()
    assert "Canada" in data
    series = data["Canada"]
    assert isinstance(series, list)
    assert len(series) > 0
    assert all(isinstance(v, float) for v in series)


# ---------------------------------------------------------------------------
# 4. GET /api/unemployment — invalid geo returns 400
# ---------------------------------------------------------------------------

def test_unemployment_invalid_geo_returns_400(client):
    response = client.get("/api/unemployment", params={"geo": "InvalidPlace"})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# 5. GET /api/industries — valid params
# ---------------------------------------------------------------------------

def test_industries_returns_200(client):
    response = client.get("/api/industries", params={"geo": "Canada", "year_from": 2020, "year_to": 2024})
    assert response.status_code == 200


def test_industries_has_required_keys(client):
    data = client.get("/api/industries", params={"geo": "Canada", "year_from": 2020, "year_to": 2024}).json()
    assert "industries" in data
    assert "pct_change" in data
    assert "base" in data
    assert "current" in data


def test_industries_lists_are_non_empty(client):
    data = client.get("/api/industries", params={"geo": "Canada", "year_from": 2020, "year_to": 2024}).json()
    assert len(data["industries"]) > 0
    assert len(data["pct_change"]) > 0
    assert len(data["base"]) > 0
    assert len(data["current"]) > 0


# ---------------------------------------------------------------------------
# 6. GET /api/summary — contract: jobs_lost must be int, never float
#    Regression test for the /1000 bug that produced "-0K" in the UI.
# ---------------------------------------------------------------------------

def test_summary_jobs_lost_is_not_float(client):
    data = client.get("/api/summary").json()
    jobs = data["jobs_lost"]
    # Must be int (or None), never a float like -0.084
    assert not isinstance(jobs, float), (
        f"jobs_lost should be int but got float: {jobs}. "
        "This likely means the /1000 division bug was re-introduced."
    )
