"""Official-feed parsing and link safety. No network or database needed."""
from src.official_feeds import _clean, is_allowed_url, release_key_points

RELEASE_PAGE = """
<h2>Search</h2>
<h2>Highlights</h2><p>Employment declined by 68,000.</p>
<h2>Employment falls for second consecutive month</h2>
<h2>Chart&#160;1 Employment rate decreases</h2>
<h2>Youth employment <span>declines</span></h2>
<h2>Map 1 Unemployment rate by province</h2>
<h2>Note to readers</h2>
<h2>Contact information</h2>
"""


def test_key_points_are_release_headings_only():
    assert release_key_points(RELEASE_PAGE) == [
        "Employment falls for second consecutive month",
        "Youth employment declines",
    ]


def test_key_points_empty_without_highlights():
    assert release_key_points("<h2>Products</h2>") == []


def test_only_official_https_links_are_allowed():
    assert is_allowed_url("https://www.statcan.gc.ca/daily-quotidien/261009/dq261009a-eng.htm")
    assert is_allowed_url("https://www.bankofcanada.ca/2026/09/fad-press-release/")
    assert is_allowed_url("https://www.canada.ca/en/department-finance/news/x.html")
    assert not is_allowed_url("http://www.canada.ca/insecure")
    assert not is_allowed_url("https://canada.ca.evil.example/phish")
    assert not is_allowed_url("https://evilcanada.ca/")
    assert not is_allowed_url("javascript:alert(1)")


def test_clean_strips_markup_and_entities():
    assert _clean("<b>Employment</b> rose&#160;0.1%  <script>x</script>") == "Employment rose 0.1% x"
