// ============================================
// CANADA LABOUR MARKET DASHBOARD
// Interactive Chart.js visualizations
// ============================================

const COLORS = {
    canada: '#4f8ef7',
    ontario: '#f59e0b',
    alberta: '#10b981',
    negative: '#ef4444',
    positive: '#10b981',
    grid: '#1a2030',
    text: '#8892a4'
}

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            labels: {
                color: '#e8edf5',
                padding: 20,
                font: { family: 'IBM Plex Mono', size: 11 }
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#161b27',
            borderColor: '#3a4a65',
            borderWidth: 1,
            titleColor: '#f0f4ff',
            bodyColor: '#8892a4',
            titleFont: { family: 'IBM Plex Mono', size: 11, weight: 'bold' },
            bodyFont: { family: 'IBM Plex Mono', size: 11 },
            padding: 14,
            caretSize: 6,
            callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${parseFloat(ctx.parsed.y.toFixed(1))}%`
            }
        }
    },
    scales: {
        x: {
            ticks: {
                color: COLORS.text,
                maxTicksLimit: 12,
                font: { family: 'IBM Plex Mono', size: 10 }
            },
            grid: { color: COLORS.grid }
        },
        y: {
            ticks: {
                color: COLORS.text,
                font: { family: 'IBM Plex Mono', size: 10 },
                callback: val => parseFloat(val.toFixed(1)) + '%'
            },
            grid: { color: COLORS.grid }
        }
    }
}

let unemploymentChart, compareChart, ontarioGapChart, industryChart
window._insightParams = {}
window._insightFull = {}

// ============================================
// AI INSIGHTS
// ============================================
async function fetchInsight(params, outputId, btnId) {
    const btn = document.getElementById(btnId)
    const output = document.getElementById(outputId)

    btn.disabled = true
    btn.textContent = '⟳ Analyzing...'
    output.innerHTML = '<p class="insights-loading">Claude is analyzing the data...</p>'
    output.style.display = 'block'

    try {
        window._insightParams[outputId] = { ...params }

        const queryString = new URLSearchParams(params).toString()
        const res = await fetch(`/api/insights?${queryString}`)
        const data = await res.json()

        const fullText = data.insight
        const parts = fullText.split('[MORE]')
        const preview = parts[0].trim()
        const rest = parts[1] ? parts[1].trim() : ''

        const previewParts = preview.split('→')
        const summary = previewParts[0].trim()
        const implication = previewParts[1] ? previewParts[1].trim() : ''

        window._insightFull[outputId] = rest

        // Fix 8: build DOM nodes with textContent — never inject AI text via innerHTML
        output.innerHTML = ''

        const summaryEl = document.createElement('p')
        summaryEl.className = 'insights-text'
        summaryEl.textContent = summary
        output.appendChild(summaryEl)

        if (implication) {
            const implEl = document.createElement('p')
            implEl.className = 'insights-implication'
            implEl.textContent = '\u2192 ' + implication
            output.appendChild(implEl)
        }

        if (rest) {
            const readMoreBtn = document.createElement('button')
            readMoreBtn.className = 'read-more-btn'
            readMoreBtn.textContent = 'Read full analysis \u2193'
            readMoreBtn.addEventListener('click', () => expandInsight(outputId))
            output.appendChild(readMoreBtn)
        }
    } catch (err) {
        output.innerHTML = '<p class="insights-error">Error generating analysis. Please try again.</p>'
    }

    btn.disabled = false
    btn.textContent = '✦ Analyze'
}

function expandInsight(outputId) {
    const output = document.getElementById(outputId)
    const rest = window._insightFull[outputId]

    if (!rest) return

    const btn = output.querySelector('.read-more-btn')
    if (btn) btn.remove()

    const paragraphs = rest.split('\n\n').filter(p => p.trim())
    paragraphs.forEach(p => {
        const el = document.createElement('p')
        el.className = 'insights-text'
        el.textContent = p.trim()
        output.appendChild(el)
    })
}

// ============================================
// CHART 1 — Unemployment Trend
// ============================================
async function loadUnemploymentChart(yearFrom = 2020, yearTo = 2026, provinces = ['Canada', 'Ontario', 'Alberta']) {
    yearFrom = parseInt(yearFrom)
    yearTo = parseInt(yearTo)

    const res = await fetch(`/api/unemployment?year_from=${yearFrom}&year_to=${yearTo}`)
    const data = await res.json()

    const datasets = []
    const colorMap = { Canada: COLORS.canada, Ontario: COLORS.ontario, Alberta: COLORS.alberta }

    provinces.forEach(geo => {
        if (data[geo]?.length) {
            datasets.push({
                label: geo,
                data: data[geo],
                borderColor: colorMap[geo],
                backgroundColor: colorMap[geo] + '15',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: colorMap[geo],
                fill: false,
                tension: 0.3
            })
        }
    })

    const annotations = {}
    if (yearFrom <= 2020 && yearTo >= 2020) {
        annotations.covid = {
            type: 'line', xMin: '2020-04', xMax: '2020-04',
            borderColor: '#ef444466', borderWidth: 1, borderDash: [4, 4],
            label: { content: 'COVID Peak', display: true, color: '#ef4444', font: { family: 'IBM Plex Mono', size: 10 }, position: 'start', backgroundColor: 'transparent' }
        }
    }
    if (yearFrom <= 2025 && yearTo >= 2025) {
        annotations.tariffs = {
            type: 'line', xMin: '2025-02', xMax: '2025-02',
            borderColor: '#f59e0b66', borderWidth: 1, borderDash: [4, 4],
            label: { content: 'US Tariffs', display: true, color: '#f59e0b', font: { family: 'IBM Plex Mono', size: 10 }, position: 'start', backgroundColor: 'transparent' }
        }
    }
    if (yearTo >= 2026) {
        annotations.crisis = {
            type: 'line', xMin: '2026-02', xMax: '2026-02',
            borderColor: '#ef444466', borderWidth: 1, borderDash: [4, 4],
            label: { content: '-84K Jobs', display: true, color: '#ef4444', font: { family: 'IBM Plex Mono', size: 10 }, position: 'start', backgroundColor: 'transparent' }
        }
    }

    if (unemploymentChart) unemploymentChart.destroy()

    unemploymentChart = new Chart(document.getElementById('unemploymentChart'), {
        type: 'line',
        data: { labels: data.labels, datasets },
        options: {
            ...baseOptions,
            plugins: { ...baseOptions.plugins, annotation: { annotations } }
        }
    })
}

function getSelectedProvinces() {
    const checkboxes = document.querySelectorAll('.province-checkbox:checked')
    return Array.from(checkboxes).map(cb => cb.value)
}

function applyUnemploymentFilter() {
    const yearFrom = document.getElementById('yearFrom').value
    const yearTo = document.getElementById('yearTo').value
    const provinces = getSelectedProvinces()
    if (provinces.length === 0) {
        alert('Select at least one province.')
        return
    }
    loadUnemploymentChart(yearFrom, yearTo, provinces)
}

function analyzeUnemployment() {
    const yearFrom = document.getElementById('yearFrom').value
    const yearTo = document.getElementById('yearTo').value
    const provinces = getSelectedProvinces()
    const geo = provinces.length === 1 ? provinces[0] : 'Canada'
    fetchInsight(
        { chart: 'unemployment', geo, year_from: yearFrom, year_to: yearTo },
        'insightUnemployment',
        'btnUnemployment'
    )
}

// ============================================
// CHART 2 — Year Comparison
// ============================================
async function loadCompareChart(yearA = 2023, yearB = 2026, geo = 'Canada') {
    const res = await fetch(`/api/compare?year_a=${yearA}&year_b=${yearB}&geo=${geo}`)
    const data = await res.json()

    if (compareChart) compareChart.destroy()

    compareChart = new Chart(document.getElementById('compareChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: `${yearA}`,
                    data: data[String(yearA)],
                    borderColor: COLORS.canada,
                    backgroundColor: COLORS.canada + '15',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: COLORS.canada,
                    tension: 0.3
                },
                {
                    label: `${yearB}`,
                    data: data[String(yearB)],
                    borderColor: COLORS.ontario,
                    backgroundColor: COLORS.ontario + '15',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: COLORS.ontario,
                    tension: 0.3,
                    borderDash: [5, 3]
                }
            ]
        },
        options: { ...baseOptions }
    })
}

function applyCompareFilter() {
    const yearA = document.getElementById('compareYearA').value
    const yearB = document.getElementById('compareYearB').value
    const geo = document.getElementById('compareGeo').value
    loadCompareChart(yearA, yearB, geo)
}

function analyzeCompare() {
    const yearA = document.getElementById('compareYearA').value
    const yearB = document.getElementById('compareYearB').value
    const geo = document.getElementById('compareGeo').value
    fetchInsight(
        { chart: 'compare', geo, year_from: yearA, year_to: yearB, extra: `${yearA},${yearB}` },
        'insightCompare',
        'btnCompare'
    )
}

// ============================================
// CHART 3 — Ontario Gap
// ============================================
async function loadOntarioGapChart(yearFrom = 2022, yearTo = 2026) {
    const res = await fetch(`/api/ontario-gap?year_from=${yearFrom}&year_to=${yearTo}`)
    const data = await res.json()

    if (ontarioGapChart) ontarioGapChart.destroy()

    ontarioGapChart = new Chart(document.getElementById('ontarioGapChart'), {
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
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: COLORS.canada,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Ontario',
                    data: data.ontario,
                    borderColor: COLORS.ontario,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: COLORS.ontario,
                    fill: '+1',
                    backgroundColor: COLORS.ontario + '10',
                    tension: 0.3
                }
            ]
        },
        options: { ...baseOptions }
    })
}

function applyGapFilter() {
    const yearFrom = document.getElementById('gapYearFrom').value
    const yearTo = document.getElementById('gapYearTo').value
    loadOntarioGapChart(yearFrom, yearTo)
}

function analyzeGap() {
    const yearFrom = document.getElementById('gapYearFrom').value
    const yearTo = document.getElementById('gapYearTo').value
    fetchInsight(
        { chart: 'gap', year_from: yearFrom, year_to: yearTo },
        'insightGap',
        'btnGap'
    )
}

// ============================================
// CHART 4 — Industry Winners & Losers
// ============================================
async function loadIndustryChart(yearFrom = 2023, yearTo = 2026, geo = 'Canada') {
    const res = await fetch(`/api/industries?year_from=${yearFrom}&year_to=${yearTo}&geo=${geo}`)
    const data = await res.json()

    const colors = data.pct_change.map(v => v >= 0 ? COLORS.positive + '99' : COLORS.negative + '99')
    const borderColors = data.pct_change.map(v => v >= 0 ? COLORS.positive : COLORS.negative)

    if (industryChart) industryChart.destroy()

    industryChart = new Chart(document.getElementById('industryChart'), {
        type: 'bar',
        data: {
            labels: data.industries,
            datasets: [{
                label: '% Change',
                data: data.pct_change,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            ...baseOptions,
            indexAxis: 'y',
            plugins: {
                ...baseOptions.plugins,
                tooltip: {
                    ...baseOptions.plugins.tooltip,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.x > 0 ? '+' : ''}${parseFloat(ctx.parsed.x.toFixed(1))}%`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: COLORS.text,
                        font: { family: 'IBM Plex Mono', size: 10 },
                        callback: val => parseFloat(val.toFixed(1)) + '%'
                    },
                    grid: { color: COLORS.grid }
                },
                y: {
                    ticks: {
                        color: COLORS.text,
                        font: { family: 'IBM Plex Mono', size: 10 },
                        callback: function(val) {
                            const label = this.getLabelForValue(val)
                            return label.length > 28 ? label.substring(0, 28) + '...' : label
                        }
                    },
                    grid: { color: COLORS.grid }
                }
            }
        }
    })
}

function applyIndustryFilter() {
    const yearFrom = document.getElementById('industryYearFrom').value
    const yearTo = document.getElementById('industryYearTo').value
    const geo = document.getElementById('industryGeo').value
    loadIndustryChart(yearFrom, yearTo, geo)
}

function analyzeIndustry() {
    const yearFrom = document.getElementById('industryYearFrom').value
    const yearTo = document.getElementById('industryYearTo').value
    const geo = document.getElementById('industryGeo').value
    fetchInsight(
        { chart: 'industry', geo, year_from: yearFrom, year_to: yearTo },
        'insightIndustry',
        'btnIndustry'
    )
}

// ============================================
// STAT CARDS
// ============================================
document.querySelectorAll('.stat-card[data-geo]').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'))
        card.classList.add('active')
        const geo = card.dataset.geo

        document.querySelectorAll('.province-checkbox').forEach(cb => {
            cb.checked = cb.value === geo
        })

        const yearFrom = document.getElementById('yearFrom').value
        const yearTo = document.getElementById('yearTo').value
        loadUnemploymentChart(yearFrom, yearTo, [geo])
    })
})

// ============================================
// INIT
// ============================================
loadUnemploymentChart()
loadCompareChart()
loadOntarioGapChart()
loadIndustryChart()