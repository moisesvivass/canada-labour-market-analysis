// ============================================
// CANADA LABOUR MARKET DASHBOARD
// Chart.js visualizations
// ============================================

const COLORS = {
    canada: '#60a5fa',
    ontario: '#f59e0b',
    alberta: '#10b981',
    negative: '#ef4444',
    positive: '#10b981',
    grid: '#2a3a4a',
    text: '#8892a4'
}

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#e0e0e0', padding: 20 }
        }
    },
    scales: {
        x: {
            ticks: { color: COLORS.text, maxTicksLimit: 12 },
            grid: { color: COLORS.grid }
        },
        y: {
            ticks: { color: COLORS.text },
            grid: { color: COLORS.grid }
        }
    }
}

// ============================================
// CHART 1 — Unemployment Trend
// ============================================
async function loadUnemploymentChart() {
    const res = await fetch('/api/unemployment')
    const data = await res.json()

    new Chart(document.getElementById('unemploymentChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Canada',
                    data: data.Canada,
                    borderColor: COLORS.canada,
                    backgroundColor: COLORS.canada + '20',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Ontario',
                    data: data.Ontario,
                    borderColor: COLORS.ontario,
                    backgroundColor: COLORS.ontario + '20',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Alberta',
                    data: data.Alberta,
                    borderColor: COLORS.alberta,
                    backgroundColor: COLORS.alberta + '20',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            ...defaultOptions,
            plugins: {
                ...defaultOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            },
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    ticks: {
                        color: COLORS.text,
                        callback: val => val + '%'
                    }
                }
            }
        }
    })
}

// ============================================
// CHART 2 — Ontario Gap
// ============================================
async function loadOntarioGapChart() {
    const res = await fetch('/api/ontario-gap')
    const data = await res.json()

    new Chart(document.getElementById('ontarioGapChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Canada',
                    data: data.canada,
                    borderColor: COLORS.canada,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Ontario',
                    data: data.ontario,
                    borderColor: COLORS.ontario,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            ...defaultOptions,
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    ticks: {
                        color: COLORS.text,
                        callback: val => val + '%'
                    }
                }
            }
        }
    })
}

// ============================================
// CHART 3 — Industry Winners & Losers
// ============================================
async function loadIndustryChart() {
    const res = await fetch('/api/industries')
    const data = await res.json()

    const colors = data.pct_change.map(v => v >= 0 ? COLORS.positive : COLORS.negative)

    new Chart(document.getElementById('industryChart'), {
        type: 'bar',
        data: {
            labels: data.industries,
            datasets: [
                {
                    label: '% Change vs 2023',
                    data: data.pct_change,
                    backgroundColor: colors,
                    borderRadius: 6
                }
            ]
        },
        options: {
            ...defaultOptions,
            indexAxis: 'y',
            plugins: {
                ...defaultOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.x > 0 ? '+' : ''}${ctx.parsed.x}%`
                    }
                }
            },
            scales: {
                ...defaultOptions.scales,
                x: {
                    ...defaultOptions.scales.x,
                    ticks: {
                        color: COLORS.text,
                        callback: val => val + '%'
                    }
                }
            }
        }
    })
}

// Load all charts
loadUnemploymentChart()
loadOntarioGapChart()
loadIndustryChart()