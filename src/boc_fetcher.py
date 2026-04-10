import logging
import threading

import requests
from sqlalchemy import Engine

from src.statcan_fetcher import _load_with_swap

logger = logging.getLogger(__name__)

BOC_VALET_BASE = "https://www.bankofcanada.ca/valet/observations"
START_DATE = "2020-01-01"

SERIES = {
    "V39079": "overnight_rate",
    "STATIC_INFLATIONCALC": "cpi",
}

# Prevents concurrent scheduler + manual refresh from running simultaneously.
_boc_lock = threading.Lock()


def _fetch_series(series_key: str) -> list[dict]:
    url = f"{BOC_VALET_BASE}/{series_key}/json?start_date={START_DATE}"
    logger.info("Fetching BoC series %s...", series_key)
    response = requests.get(url, timeout=(10, 60))
    response.raise_for_status()
    return response.json()["observations"]


def _to_dataframe(observations: list[dict], series_key: str, series_label: str):
    import pandas as pd
    rows = []
    for obs in observations:
        raw = obs.get(series_key, {}).get("v")
        if raw is None or raw == "":
            continue
        try:
            value = float(raw)
        except (ValueError, TypeError):
            continue
        rows.append({"ref_date": obs["d"], "series": series_label, "value": value})

    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["ref_date"] = pd.to_datetime(df["ref_date"])
    return df


def fetch_and_load_boc(engine: Engine) -> None:
    """Fetch overnight rate and CPI from Bank of Canada Valet API and reload the DB table."""
    if not _boc_lock.acquire(blocking=False):
        raise RuntimeError("A BoC refresh is already in progress.")

    try:
        logger.info("=== STARTING BOC FETCH ===")
        dfs = []
        for series_key, series_label in SERIES.items():
            try:
                observations = _fetch_series(series_key)
                df = _to_dataframe(observations, series_key, series_label)
                if not df.empty:
                    dfs.append(df)
                    logger.info("Fetched %d rows for %s", len(df), series_label)
            except Exception:
                logger.exception("Failed to fetch BoC series %s", series_key)

        if dfs:
            import pandas as pd
            df_all = pd.concat(dfs, ignore_index=True)
            _load_with_swap(df_all, "bank_of_canada_indicators", engine)

        logger.info("=== BOC FETCH COMPLETE ===")
    finally:
        _boc_lock.release()
