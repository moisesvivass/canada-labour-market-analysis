import io
import logging
import threading
import zipfile

import pandas as pd
import requests
from sqlalchemy import Engine, text

logger = logging.getLogger(__name__)

ALL_PROVINCES = [
    'Canada', 'Ontario', 'Quebec', 'British Columbia', 'Alberta',
    'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick',
    'Newfoundland and Labrador', 'Prince Edward Island'
]
START_DATE = '2020-01'
STATCAN_DOWNLOAD_URL = "https://www150.statcan.gc.ca/n1/tbl/csv/{table_id}-eng.zip"

TARGET_INDUSTRIES = [
    'Total employed, all industries',
    'Manufacturing [31-33]',
    'Construction [23]',
    'Professional, scientific and technical services [54]',
    'Wholesale and retail trade [41, 44-45]',
    'Health care and social assistance [62]',
    'Public administration [91]',
    'Transportation and warehousing [48-49]'
]

# Prevents concurrent scheduler + manual refresh from running simultaneously.
# blocking=False means a second caller gets False immediately instead of waiting.
_refresh_lock = threading.Lock()


def _download_statcan_csv(table_id: str) -> pd.DataFrame:
    url = STATCAN_DOWNLOAD_URL.format(table_id=table_id)
    logger.info("Downloading StatCan table %s...", table_id)
    response = requests.get(url, timeout=(10, 120))
    response.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        csv_files = [name for name in z.namelist() if name.endswith('.csv')]
        if not csv_files:
            raise ValueError(f"No CSV found in ZIP for table {table_id}")
        csv_filename = csv_files[0]
        logger.info("Found CSV in ZIP: %s", csv_filename)
        with z.open(csv_filename) as f:
            df = pd.read_csv(f)
    logger.info("Downloaded %d rows for table %s", len(df), table_id)
    return df


def _transform_unemployment(df: pd.DataFrame) -> pd.DataFrame:
    df_filtered = df[
        (df['GEO'].isin(ALL_PROVINCES)) &
        (df['Labour force characteristics'] == 'Unemployment rate') &
        (df['Statistics'] == 'Estimate') &
        (df['Data type'] == 'Seasonally adjusted') &
        (df['Gender'] == 'Total - Gender') &
        (df['Age group'] == '15 years and over') &
        (df['REF_DATE'] >= START_DATE)
    ].copy()

    df_filtered = df_filtered.rename(columns={
        'REF_DATE': 'ref_date',
        'GEO': 'geography',
        'Labour force characteristics': 'characteristic',
        'Data type': 'data_type',
        'VALUE': 'value'
    })
    df_filtered = df_filtered[['ref_date', 'geography', 'characteristic', 'data_type', 'value']]
    df_filtered['ref_date'] = pd.to_datetime(df_filtered['ref_date'])
    df_filtered = df_filtered.dropna(subset=['value'])
    return df_filtered


def _transform_labour_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df_filtered = df[
        (df['GEO'].isin(ALL_PROVINCES)) &
        (df['Labour force characteristics'].isin([
            'Unemployment rate',
            'Employment rate',
            'Participation rate'
        ])) &
        (df['Statistics'] == 'Estimate') &
        (df['Data type'] == 'Seasonally adjusted') &
        (df['Gender'] == 'Total - Gender') &
        (df['Age group'] == '15 years and over') &
        (df['REF_DATE'] >= START_DATE)
    ].copy()

    df_filtered = df_filtered.rename(columns={
        'REF_DATE': 'ref_date',
        'GEO': 'geography',
        'Labour force characteristics': 'characteristic',
        'Data type': 'data_type',
        'VALUE': 'value'
    })
    df_filtered = df_filtered[['ref_date', 'geography', 'characteristic', 'data_type', 'value']]
    df_filtered['ref_date'] = pd.to_datetime(df_filtered['ref_date'])
    df_filtered = df_filtered.dropna(subset=['value'])
    return df_filtered


def _transform_industry(df: pd.DataFrame) -> pd.DataFrame:
    df_filtered = df[
        (df['GEO'].isin(ALL_PROVINCES)) &
        (df['North American Industry Classification System (NAICS)'].isin(TARGET_INDUSTRIES)) &
        (df['Statistics'] == 'Estimate') &
        (df['Data type'] == 'Seasonally adjusted') &
        (df['REF_DATE'] >= START_DATE)
    ].copy()

    df_filtered = df_filtered.rename(columns={
        'REF_DATE': 'ref_date',
        'GEO': 'geography',
        'North American Industry Classification System (NAICS)': 'industry',
        'Data type': 'data_type',
        'VALUE': 'value'
    })
    df_filtered = df_filtered[['ref_date', 'geography', 'industry', 'data_type', 'value']]
    df_filtered['ref_date'] = pd.to_datetime(df_filtered['ref_date'])
    df_filtered = df_filtered.dropna(subset=['value'])
    return df_filtered


def _load_with_swap(df: pd.DataFrame, table_name: str, engine: Engine) -> None:
    # Write to a staging table then atomically rename it over the live table.
    # PostgreSQL DDL is transactional: if any step fails the whole transaction
    # rolls back and the live table is left untouched.
    staging = f"{table_name}_staging"
    with engine.begin() as conn:
        df.to_sql(staging, conn, if_exists='replace', index=False)
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
        conn.execute(text(f"ALTER TABLE {staging} RENAME TO {table_name}"))
    logger.info("Loaded %d rows into %s", len(df), table_name)


def fetch_and_load_all(engine: Engine) -> None:
    """Fetch both StatCan tables via the public API and reload the DB tables."""
    if not _refresh_lock.acquire(blocking=False):
        raise RuntimeError("A refresh is already in progress.")

    try:
        logger.info("=== STARTING SCHEDULED FETCH ===")

        try:
            df_raw = _download_statcan_csv("14100287")
            df_u = _transform_unemployment(df_raw)
            _load_with_swap(df_u, 'unemployment_monthly', engine)
            df_lfi = _transform_labour_indicators(df_raw)
            _load_with_swap(df_lfi, 'labour_force_indicators', engine)
        except Exception:
            logger.exception("Failed to fetch/load table 14100287")

        try:
            df_raw = _download_statcan_csv("14100355")
            df_i = _transform_industry(df_raw)
            _load_with_swap(df_i, 'employment_by_industry', engine)
        except Exception:
            logger.exception("Failed to fetch/load table 14100355")

        logger.info("=== SCHEDULED FETCH COMPLETE ===")
    finally:
        _refresh_lock.release()
