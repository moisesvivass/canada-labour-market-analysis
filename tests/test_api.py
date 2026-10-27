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
    assert "cpi_yoy" in data


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
# 6. GET /api/labour-indicators
# ---------------------------------------------------------------------------

def test_labour_indicators_returns_200(client):
    response = client.get(
        "/api/labour-indicators",
        params={"characteristic": "Employment rate", "geo": "Canada", "year_from": 2023, "year_to": 2024}
    )
    assert response.status_code == 200


def test_labour_indicators_has_labels_and_series(client):
    data = client.get(
        "/api/labour-indicators",
        params={"characteristic": "Employment rate", "geo": "Canada", "year_from": 2023, "year_to": 2024}
    ).json()
    assert "labels" in data
    assert isinstance(data["labels"], list)
    assert len(data["labels"]) > 0
    assert "Canada" in data
    assert all(isinstance(v, float) for v in data["Canada"])


# ---------------------------------------------------------------------------
# 8. GET /api/macro/overnight-rate and /api/macro/cpi
# ---------------------------------------------------------------------------

def test_macro_overnight_rate(client):
    response = client.get("/api/macro/overnight-rate")
    assert response.status_code == 200


def test_macro_cpi(client):
    response = client.get("/api/macro/cpi")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# 7. GET /api/summary — contract: jobs_lost must be int, never float
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


# ---------------------------------------------------------------------------
# 8. Data v2 endpoints — demographics, cities, tightness, prices, official news
# ---------------------------------------------------------------------------

def test_demographics_has_age_gender_and_part_time(client):
    data = client.get("/api/demographics", params={"geo": "Ontario"}).json()
    assert set(data["by_age"]) == {"15 to 24 years", "25 to 54 years", "55 years and over"}
    assert set(data["by_gender"]) == {"Men+", "Women+"}
    assert len(data["part_time_share"]) == len(data["labels"]) > 0


def test_demographics_rejects_unknown_characteristic(client):
    assert client.get("/api/demographics", params={"characteristic": "Happiness"}).status_code == 400


def test_cities_include_toronto_with_standard_error(client):
    toronto = client.get("/api/cities").json()["cities"]["Toronto"]
    assert toronto["province"] == "Ontario"
    assert len(toronto["standard_error"]) == len(toronto["estimate"]) > 0


def test_tightness_ratio_is_positive(client):
    data = client.get("/api/tightness").json()
    assert data["provinces"] and all(p["unemployed_per_vacancy"] > 0 for p in data["provinces"])


def test_provinces_latest_covers_every_region(client):
    assert len(client.get("/api/provinces/latest").json()["regions"]) == 11


def test_inflation_and_wages_align(client):
    inflation = client.get("/api/inflation").json()
    assert inflation["target"] == 2.0 and len(inflation["cpi_trim"]) == len(inflation["labels"])
    wages = client.get("/api/wages", params={"geo": "Canada"}).json()
    assert len(wages["real_wage_growth"]) == len(wages["labels"]) > 0


def test_news_links_point_to_official_sites(client):
    for item in client.get("/api/news", params={"limit": 50}).json():
        assert item["url"].startswith("https://")
        assert any(host in item["url"] for host in ("statcan.gc.ca", "bankofcanada.ca", "canada.ca"))


def test_events_include_rate_decisions(client):
    events = client.get("/api/events").json()
    assert any(e["category"] == "rate_decision" for e in events)
