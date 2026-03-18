import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

# --- CONSTANTS ---
PROVINCES = ['Canada', 'Ontario', 'Alberta']
START_DATE = '2020-01'  # Post-pandemic focus

def extract_monthly_unemployment():
    """Extract unemployment rate data from StatsCan table 14100287"""
    print("Loading monthly unemployment data...")
    
    df = pd.read_csv('data/raw/14100287.csv', usecols=[
        'REF_DATE', 'GEO', 'Labour force characteristics', 
        'Data type', 'VALUE'
    ])
    
    return df

def transform_monthly_unemployment(df):
    """Filter and clean unemployment data"""
    print("Transforming unemployment data...")
    
    df_filtered = df[
        (df['GEO'].isin(PROVINCES)) &
        (df['Labour force characteristics'] == 'Unemployment rate') &
        (df['Data type'] == 'Seasonally adjusted') &
        (df['REF_DATE'] >= START_DATE)
    ].copy()
    
    df_filtered = df_filtered.rename(columns={
        'REF_DATE': 'ref_date',
        'GEO': 'geography',
        'Labour force characteristics': 'characteristic',
        'Data type': 'data_type',
        'VALUE': 'value'
    })
    
    df_filtered['ref_date'] = pd.to_datetime(df_filtered['ref_date'])
    df_filtered = df_filtered.dropna(subset=['value'])
    
    print(f"  Rows after filter: {len(df_filtered)}")
    return df_filtered

def extract_monthly_industry():
    """Extract employment by industry from StatsCan table 14100355"""
    print("Loading monthly industry data...")
    
    df = pd.read_csv('data/raw/14100355.csv', usecols=[
        'REF_DATE', 'GEO', 
        'North American Industry Classification System (NAICS)',
        'Data type', 'VALUE'
    ])
    
    return df

def transform_monthly_industry(df):
    """Filter and clean industry employment data"""
    print("Transforming industry data...")
    
    # Key industries for our story
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
    
    df_filtered = df[
        (df['GEO'].isin(PROVINCES)) &
        (df['North American Industry Classification System (NAICS)'].isin(TARGET_INDUSTRIES)) &
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
    
    df_filtered['ref_date'] = pd.to_datetime(df_filtered['ref_date'])
    df_filtered = df_filtered.dropna(subset=['value'])
    
    print(f"  Rows after filter: {len(df_filtered)}")
    return df_filtered

def load_to_postgres(df, table_name):
    """Load dataframe to PostgreSQL"""
    print(f"Loading {table_name} to PostgreSQL...")
    
    df.to_sql(table_name, engine, if_exists='replace', index=False)
    print(f"  Done — {len(df)} rows loaded into {table_name}")

def run_etl():
    print("=== STARTING ETL ===")
    
    # Unemployment data
    df_unemployment = extract_monthly_unemployment()
    df_unemployment = transform_monthly_unemployment(df_unemployment)
    load_to_postgres(df_unemployment, 'unemployment_monthly')
    
    # Industry data
    df_industry = extract_monthly_industry()
    df_industry = transform_monthly_industry(df_industry)
    load_to_postgres(df_industry, 'employment_by_industry')
    
    print("\n=== ETL COMPLETE ===")

if __name__ == '__main__':
    run_etl()