-- ============================================
-- CANADA LABOUR MARKET ANALYSIS
-- Advanced SQL Queries
-- ============================================

-- ============================================
-- 1. UNEMPLOYMENT RATE TREND (2020-2026)
--    Canada vs Ontario vs Alberta
-- ============================================
SELECT
    geography,
    DATE_TRUNC('month', ref_date) AS month,
    ROUND(AVG(value)::numeric, 1) AS unemployment_rate
FROM unemployment_monthly
WHERE characteristic = 'Unemployment rate'
GROUP BY geography, DATE_TRUNC('month', ref_date)
ORDER BY month, geography;


-- ============================================
-- 2. PANDEMIC IMPACT vs CURRENT CRISIS
--    Compare Apr 2020 (peak pandemic) vs Feb 2026 (current)
-- ============================================
WITH pandemic_peak AS (
    SELECT geography, value AS rate_apr_2020
    FROM unemployment_monthly
    WHERE characteristic = 'Unemployment rate'
    AND DATE_TRUNC('month', ref_date) = '2020-04-01'
),
current AS (
    SELECT geography, value AS rate_feb_2026
    FROM unemployment_monthly
    WHERE characteristic = 'Unemployment rate'
    AND DATE_TRUNC('month', ref_date) = '2026-02-01'
)
SELECT
    p.geography,
    p.rate_apr_2020,
    c.rate_feb_2026,
    ROUND((c.rate_feb_2026 - p.rate_apr_2020)::numeric, 1) AS difference
FROM pandemic_peak p
JOIN current c ON p.geography = c.geography
ORDER BY c.rate_feb_2026 DESC;


-- ============================================
-- 3. INDUSTRY WINNERS vs LOSERS
--    Employment change 2023 vs 2026 by industry
-- ============================================
WITH base_2023 AS (
    SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_2023
    FROM employment_by_industry
    WHERE geography = 'Canada'
    AND ref_date BETWEEN '2023-01-01' AND '2023-12-01'
    GROUP BY industry
),
current_2026 AS (
    SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_2026
    FROM employment_by_industry
    WHERE geography = 'Canada'
    AND ref_date = '2026-02-01'
    GROUP BY industry
)
SELECT
    b.industry,
    b.employment_2023,
    c.employment_2026,
    ROUND((c.employment_2026 - b.employment_2023)::numeric, 0) AS change,
    ROUND(((c.employment_2026 - b.employment_2023) / b.employment_2023 * 100)::numeric, 1) AS pct_change
FROM base_2023 b
JOIN current_2026 c ON b.industry = c.industry
ORDER BY pct_change DESC;



-- ============================================
-- 4. ONTARIO vs CANADA GAP (WINDOW FUNCTION)
--    How much worse is Ontario vs national average?
-- ============================================
SELECT
    ref_date,
    MAX(CASE WHEN geography = 'Canada' THEN value END) AS canada_rate,
    MAX(CASE WHEN geography = 'Ontario' THEN value END) AS ontario_rate,
    ROUND((MAX(CASE WHEN geography = 'Ontario' THEN value END) -
     MAX(CASE WHEN geography = 'Canada' THEN value END))::numeric, 1) AS ontario_gap
FROM unemployment_monthly
WHERE characteristic = 'Unemployment rate'
AND ref_date >= '2023-01-01'
GROUP BY ref_date
ORDER BY ref_date;


-- ============================================
-- 5. ROLLING 3-MONTH AVERAGE (WINDOW FUNCTION)
--    Smooth out noise to see real trends
-- ============================================
SELECT
    geography,
    ref_date,
    value AS monthly_rate,
    ROUND(AVG(value) OVER (
        PARTITION BY geography
        ORDER BY ref_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    )::numeric, 2) AS rolling_3m_avg
FROM unemployment_monthly
WHERE characteristic = 'Unemployment rate'
AND ref_date >= '2022-01-01'
ORDER BY geography, ref_date;


-- ============================================
-- 6. TARIFF-EXPOSED vs TECH SECTORS
--    The key insight of the dashboard
-- ============================================
SELECT
    ref_date,
    MAX(CASE WHEN industry = 'Manufacturing [31-33]'
        THEN value END) AS manufacturing,
    MAX(CASE WHEN industry = 'Construction [23]'
        THEN value END) AS construction,
    MAX(CASE WHEN industry = 'Professional, scientific and technical services [54]'
        THEN value END) AS tech_professional,
    MAX(CASE WHEN industry = 'Health care and social assistance [62]'
        THEN value END) AS healthcare
FROM employment_by_industry
WHERE geography = 'Canada'
GROUP BY ref_date
ORDER BY ref_date;