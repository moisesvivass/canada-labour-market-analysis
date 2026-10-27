import logging
import tempfile
import threading
import zipfile
from typing import Callable

import requests
from sqlalchemy import Engine, text

logger = logging.getLogger(__name__)

ALL_PROVINCES = [
    'Canada', 'Ontario', 'Quebec', 'British Columbia', 'Alberta',
    'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick',
    'Newfoundland and Labrador', 'Prince Edward Island'
]
START_DATE = '2020-01'
# Earnings start a year earlier so year-over-year growth is available from 2020.
EARNINGS_START_DATE = '2019-01'
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

LFS_CHARACTERISTICS = [
    'Unemployment rate', 'Employment rate', 'Participation rate',
    'Unemployment', 'Employment', 'Full-time employment', 'Part-time employment',
]
LFS_AGE_GROUPS = ['15 years and over', '15 to 24 years', '25 to 54 years', '55 years and over']
HEADLINE_RATES = ['Unemployment rate', 'Employment rate', 'Participation rate']

# StatCan publishes these three CMAs monthly; the label is "City, Province".
CITY_PROVINCES = {'Montréal': 'Quebec', 'Toronto': 'Ontario', 'Vancouver': 'British Columbia'}

ALL_INDUSTRIES_EXCL_UNCLASSIFIED = 'Industrial aggregate excluding unclassified businesses [11-91N]'
AVERAGE_WEEKLY_EARNINGS = 'Average weekly earnings including overtime for all employees'

# Columns StatCan adds to every table that the dashboard never uses.
_METADATA_COLUMNS = {
    'DGUID', 'UOM', 'UOM_ID', 'SCALAR_FACTOR', 'SCALAR_ID', 'VECTOR', 'COORDINATE',
    'STATUS', 'SYMBOL', 'TERMINATED', 'DECIMALS',
}
_CHUNK_ROWS = 200_000

# Prevents concurrent scheduler + manual refresh from running simultaneously.
# blocking=False means a second caller gets False immediately instead of waiting.
_refresh_lock = threading.Lock()


def _read_statcan_table(table_id: str, keep: Callable):
    """Download a full StatCan table and return only the rows `keep(chunk)` selects.

    Tables such as 14-10-0287-01 have millions of rows, so the CSV is read in
    chunks without metadata columns and filtered as it streams; only the
    selected rows are ever held in memory.
    """
    url = STATCAN_DOWNLOAD_URL.format(table_id=table_id)
    logger.info("Downloading StatCan table %s...", table_id)
    # Stream the zip to a temp file so the download itself isn't held in memory.
    with tempfile.TemporaryFile() as archive, requests.get(url, timeout=(10, 300), stream=True) as response:
        response.raise_for_status()
        for block in response.iter_content(chunk_size=1 << 20):
            archive.write(block)
        archive.seek(0)
        return _filter_archive(archive, table_id, keep)


def _filter_archive(archive, table_id: str, keep: Callable):
    import pandas as pd
    with zipfile.ZipFile(archive) as z:
        csv_files = [n for n in z.namelist() if n.endswith('.csv') and 'MetaData' not in n]
        if not csv_files:
            raise ValueError(f"No CSV found in ZIP for table {table_id}")
        with z.open(csv_files[0]) as f:
            columns = pd.read_csv(f, nrows=0).columns
        usecols = [c for c in columns if c not in _METADATA_COLUMNS]
        dtypes = {c: 'string' for c in usecols if c != 'VALUE'}
        with z.open(csv_files[0]) as f:
            parts = [chunk[keep(chunk)] for chunk in pd.read_csv(f, usecols=usecols, dtype=dtypes, chunksize=_CHUNK_ROWS)]
    df = pd.concat(parts, ignore_index=True)
    df['ref_date'] = pd.to_datetime(df.pop('REF_DATE'))
    df = df.rename(columns={'GEO': 'geography', 'VALUE': 'value'}).dropna(subset=['value'])
    logger.info("Kept %d rows from table %s", len(df), table_id)
    return df


def _is_sa_estimate(chunk):
    return (chunk['Statistics'] == 'Estimate') & (chunk['Data type'] == 'Seasonally adjusted')


def _keep_lfs(chunk):
    return (
        chunk['GEO'].isin(ALL_PROVINCES)
        & chunk['Labour force characteristics'].isin(LFS_CHARACTERISTICS)
        & chunk['Age group'].isin(LFS_AGE_GROUPS)
        & _is_sa_estimate(chunk)
        & (chunk['REF_DATE'] >= START_DATE)
    )


def _lfs_headline(lfs, characteristics):
    """Total-gender, 15+ rows in the shape of the original unemployment/indicator tables."""
    df = lfs[
        (lfs['Gender'] == 'Total - Gender')
        & (lfs['Age group'] == '15 years and over')
        & lfs['Labour force characteristics'].isin(characteristics)
    ].rename(columns={'Labour force characteristics': 'characteristic', 'Data type': 'data_type'})
    return df[['ref_date', 'geography', 'characteristic', 'data_type', 'value']]


def _lfs_demographics(lfs):
    df = lfs.rename(columns={
        'Labour force characteristics': 'characteristic',
        'Gender': 'gender',
        'Age group': 'age_group',
    })
    return df[['ref_date', 'geography', 'characteristic', 'gender', 'age_group', 'value']]


def _keep_industry(chunk):
    return (
        chunk['GEO'].isin(ALL_PROVINCES)
        & chunk['North American Industry Classification System (NAICS)'].isin(TARGET_INDUSTRIES)
        & _is_sa_estimate(chunk)
        & (chunk['REF_DATE'] >= START_DATE)
    )


def _industry(df):
    df = df.rename(columns={
        'North American Industry Classification System (NAICS)': 'industry',
        'Data type': 'data_type',
    })
    return df[['ref_date', 'geography', 'industry', 'data_type', 'value']]


def _keep_cities(chunk):
    return (
        chunk['Labour force characteristics'].isin(HEADLINE_RATES)
        & chunk['Statistics'].isin(['Estimate', 'Standard error of estimate'])
        & (chunk['Data type'] == 'Seasonally adjusted')
        & (chunk['REF_DATE'] >= START_DATE)
    )


def _cities(df):
    df = df.rename(columns={'Labour force characteristics': 'characteristic', 'Statistics': 'statistic'})
    df['city'] = df['geography'].str.split(',').str[0].str.strip()
    df['province'] = df['city'].map(CITY_PROVINCES)
    return df[['ref_date', 'city', 'province', 'characteristic', 'statistic', 'value']]


def _keep_vacancies(chunk):
    return (
        chunk['GEO'].isin(ALL_PROVINCES)
        & chunk['Statistics'].isin(['Job vacancies', 'Job vacancy rate'])
        & (chunk['REF_DATE'] >= START_DATE)
    )


def _vacancies(df):
    return df.rename(columns={'Statistics': 'statistic'})[['ref_date', 'geography', 'statistic', 'value']]


def _keep_earnings(chunk):
    return (
        chunk['GEO'].isin(ALL_PROVINCES)
        & (chunk['Estimate'] == AVERAGE_WEEKLY_EARNINGS)
        & (chunk['North American Industry Classification System (NAICS)'] == ALL_INDUSTRIES_EXCL_UNCLASSIFIED)
        & (chunk['REF_DATE'] >= EARNINGS_START_DATE)
    )


def _earnings(df):
    return df[['ref_date', 'geography', 'value']]


def _load_with_swap(df, table_name: str, engine: Engine) -> None:
    # Write to a staging table then atomically rename it over the live table.
    # PostgreSQL DDL is transactional: if any step fails the whole transaction
    # rolls back and the live table is left untouched.
    staging = f"{table_name}_staging"
    with engine.begin() as conn:
        df.to_sql(staging, conn, if_exists='replace', index=False)
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
        conn.execute(text(f"ALTER TABLE {staging} RENAME TO {table_name}"))
    logger.info("Loaded %d rows into %s", len(df), table_name)


# (table id, row filter, [(transform, destination table), ...])
_TABLES = [
    ("14100287", _keep_lfs, [
        (lambda df: _lfs_headline(df, ['Unemployment rate']), 'unemployment_monthly'),
        (lambda df: _lfs_headline(df, HEADLINE_RATES), 'labour_force_indicators'),
        (_lfs_demographics, 'lfs_demographics'),
    ]),
    ("14100355", _keep_industry, [(_industry, 'employment_by_industry')]),
    ("14100460", _keep_cities, [(_cities, 'lfs_cities')]),
    ("14100432", _keep_vacancies, [(_vacancies, 'job_vacancies')]),
    ("14100223", _keep_earnings, [(_earnings, 'weekly_earnings')]),
]


def fetch_and_load_all(engine: Engine) -> None:
    """Fetch every StatCan table via the public API and reload the DB tables."""
    if not _refresh_lock.acquire(blocking=False):
        raise RuntimeError("A refresh is already in progress.")

    try:
        logger.info("=== STARTING SCHEDULED FETCH ===")
        # One failing table must not stop the others from refreshing.
        for table_id, keep, outputs in _TABLES:
            try:
                df = _read_statcan_table(table_id, keep)
                for transform, table_name in outputs:
                    _load_with_swap(transform(df), table_name, engine)
            except Exception:
                logger.exception("Failed to fetch/load table %s", table_id)
        logger.info("=== SCHEDULED FETCH COMPLETE ===")
    finally:
        _refresh_lock.release()
