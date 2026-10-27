"""Official announcements that explain or move the labour market numbers.

Sources (all official, quoted with attribution):
- Statistics Canada, The Daily (labour subject feed): each monthly Labour Force
  Survey release, its summary and its section headings (the official "why").
- Bank of Canada press releases: policy rate decisions.
- Government of Canada news API: Finance, Immigration and Employment news
  releases about tariffs, immigration levels, EI, budgets and similar policy.

Only titles, dates, links, StatCan summaries and StatCan section headings are
stored. Canada.ca release text is never copied (commercial reuse needs written
permission), so policy items are shown as a dated link only.
"""
import html
import logging
import re
import threading
from datetime import date, datetime
from html.parser import HTMLParser
from typing import Optional
from urllib.parse import urlparse

import requests
from defusedxml import ElementTree
from sqlalchemy import ARRAY, Column, Date, Engine, MetaData, Table, Text
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

STATCAN_LABOUR_FEED = "https://www150.statcan.gc.ca/n1/rss/dai-quo/14-eng.atom"
BOC_PRESS_FEED = "https://www.bankofcanada.ca/content_type/press-releases/feed/"
GC_NEWS_API = "https://api.io.canada.ca/io-server/gc/news/en/v2"

GC_DEPARTMENTS = {
    "departmentfinance": "Department of Finance Canada",
    "departmentofcitizenshipandimmigration": "Immigration, Refugees and Citizenship Canada",
    "departmentofemploymentandsocialdevelopment": "Employment and Social Development Canada",
}
POLICY_KEYWORDS = re.compile(
    r"tariff|countermeasure|immigration levels|levels plan|temporary resident|"
    r"international student|employment insurance|minimum wage|budget 20|economic statement",
    re.IGNORECASE,
)
BOC_DECISION = re.compile(r"policy (interest )?rate|monetary policy report", re.IGNORECASE)
STATCAN_RELEASES = re.compile(r"^(Labour Force Survey|Job vacancies|Payroll employment)", re.IGNORECASE)
NEWS_START = "2020-01-01"

# Links shown to visitors may only point at these official domains.
ALLOWED_HOSTS = ("statcan.gc.ca", "bankofcanada.ca", "canada.ca")

_ATOM = "{http://www.w3.org/2005/Atom}"
_RSS1 = "{http://purl.org/rss/1.0/}"
_DC = "{http://purl.org/dc/elements/1.1/}"
_TIMEOUT = (10, 60)

metadata = MetaData()
news_items = Table(
    "news_items", metadata,
    Column("url", Text, primary_key=True),
    Column("source", Text, nullable=False),
    Column("category", Text, nullable=False),  # statcan_release | rate_decision | policy
    Column("title", Text, nullable=False),
    Column("published", Date, nullable=False),
    Column("summary", Text),
    Column("key_points", ARRAY(Text)),
)

_feeds_lock = threading.Lock()


def is_allowed_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    return parsed.scheme == "https" and any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS)


def _clean(text_value: Optional[str]) -> str:
    """Plain text only: unescape entities, drop any markup, collapse whitespace."""
    text_value = html.unescape(re.sub(r"<[^>]+>", " ", text_value or ""))
    return re.sub(r"\s+", " ", text_value).strip()


def _item(url: str, source: str, category: str, title: str, published: date,
          summary: Optional[str] = None, key_points: Optional[list[str]] = None) -> dict:
    return {"url": url, "source": source, "category": category, "title": title,
            "published": published, "summary": summary, "key_points": key_points}


def _get(url: str, **kwargs) -> requests.Response:
    response = requests.get(url, timeout=_TIMEOUT, **kwargs)
    response.raise_for_status()
    return response


class _ReleaseHeadings(HTMLParser):
    """Collects the <h2> section headings of a Daily release, after "Highlights"."""

    def __init__(self):
        super().__init__()
        self.headings: list[str] = []
        self._in_h2 = False
        self._buffer: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "h2":
            self._in_h2, self._buffer = True, []

    def handle_endtag(self, tag):
        if tag == "h2" and self._in_h2:
            self._in_h2 = False
            self.headings.append(_clean("".join(self._buffer)))

    def handle_data(self, data):
        if self._in_h2:
            self._buffer.append(data)


_NOT_A_FINDING = re.compile(r"^(Chart|Infographic|Map|Table)\b", re.IGNORECASE)
_END_OF_FINDINGS = {"Note to readers", "Sustainable Development Goals", "Products", "Contact information"}


def release_key_points(page_html: str) -> list[str]:
    """The release's own section headings, e.g. "Youth employment declines"."""
    parser = _ReleaseHeadings()
    parser.feed(page_html)
    headings = parser.headings
    if "Highlights" not in headings:
        return []
    points = []
    for heading in headings[headings.index("Highlights") + 1:]:
        if heading in _END_OF_FINDINGS:
            break
        if heading and not _NOT_A_FINDING.match(heading):
            points.append(heading)
    return points


def _statcan_releases() -> list[dict]:
    root = ElementTree.fromstring(_get(STATCAN_LABOUR_FEED).content)
    items = []
    for entry in root.iter(f"{_ATOM}entry"):
        title = _clean("".join(entry.find(f"{_ATOM}title").itertext()))
        link = entry.find(f"{_ATOM}link")
        url = link.get("href") if link is not None else ""
        if not STATCAN_RELEASES.match(title) or not is_allowed_url(url):
            continue
        summary = entry.find(f"{_ATOM}summary")
        item = _item(
            url, "Statistics Canada, The Daily", "statcan_release", title,
            date.fromisoformat(entry.find(f"{_ATOM}updated").text[:10]),
            summary=_clean("".join(summary.itertext())) if summary is not None else None,
        )
        if title.startswith("Labour Force Survey"):
            try:
                item["key_points"] = release_key_points(_get(url).text)
            except Exception:
                logger.exception("Could not read key points from %s", url)
            if not item["key_points"]:
                # Every LFS release has section headings; none means StatCan changed the page layout.
                logger.warning("No key points found in %s; check release_key_points()", url)
        items.append(item)
    return items


def _boc_decisions() -> list[dict]:
    root = ElementTree.fromstring(_get(BOC_PRESS_FEED).content)
    items = []
    for entry in root.iter(f"{_RSS1}item"):
        title = _clean(entry.findtext(f"{_RSS1}title"))
        url = (entry.findtext(f"{_RSS1}link") or "").strip()
        published = entry.findtext(f"{_DC}date") or ""
        if not BOC_DECISION.search(title) or not is_allowed_url(url) or len(published) < 10:
            continue
        items.append(_item(url, "Bank of Canada", "rate_decision", title, date.fromisoformat(published[:10])))
    return items


def _policy_releases() -> list[dict]:
    items = []
    for dept, dept_name in GC_DEPARTMENTS.items():
        params = {
            "dept": dept, "type": "newsreleases", "sort": "publishedDate", "orderBy": "desc",
            "publishedDate>": NEWS_START, "pick": 100, "format": "json",
        }
        try:
            entries = _get(GC_NEWS_API, params=params).json().get("feed", {}).get("entry") or []
        except Exception:
            logger.exception("Failed to fetch Government of Canada news for %s", dept)
            continue
        for e in entries:
            title = _clean(e.get("title"))
            url = (e.get("link") or "").strip()
            if not POLICY_KEYWORDS.search(title) or not is_allowed_url(url):
                continue
            # No summary: Canada.ca text is linked, never copied.
            items.append(_item(url, dept_name, "policy", title, datetime.fromisoformat(e["publishedDate"]).date()))
    return items


def fetch_and_load_feeds(engine: Engine) -> None:
    """Upsert official announcements. Feeds only cover recent weeks, so rows accumulate."""
    if not _feeds_lock.acquire(blocking=False):
        raise RuntimeError("A feeds refresh is already in progress.")
    try:
        logger.info("=== STARTING OFFICIAL FEEDS FETCH ===")
        metadata.create_all(engine, checkfirst=True)
        items: list[dict] = []
        for name, fetch in (("StatCan", _statcan_releases), ("BoC", _boc_decisions), ("GC news", _policy_releases)):
            try:
                found = fetch()
                logger.info("Fetched %d %s items", len(found), name)
                items.extend(found)
            except Exception:
                logger.exception("Failed to fetch %s feed", name)
        # A joint release can appear under several departments with the same URL.
        items = list({item["url"]: item for item in items}.values())
        if items:
            stmt = insert(news_items).values(items)
            stmt = stmt.on_conflict_do_update(
                index_elements=[news_items.c.url],
                set_={c: stmt.excluded[c] for c in ("title", "published", "summary", "key_points")},
            )
            with engine.begin() as conn:
                conn.execute(stmt)
        logger.info("=== OFFICIAL FEEDS FETCH COMPLETE (%d items) ===", len(items))
    finally:
        _feeds_lock.release()
