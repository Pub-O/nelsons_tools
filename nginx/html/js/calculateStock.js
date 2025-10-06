function test() {
    document.getElementById('demo').innerHTML = Date();
}

let currentSummary = null;

function sanitizeNumericValue(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}

function getNumericValue(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        return 0;
    }

    const parsedValue = Number(element.value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function calculateStock() {
    let wineK, wineZ, wineP, wineG,
        gossK, gossZ, gossP, gossG,
        cidK, cidZ, cidP, cidG,
        stieK, stieZ, stieP, stieG,
        tahlK, thalZ, thalP, thalG,
        starK, starZ, starP, starG,
        kilK, kilZ, kilP, kilG,
        hopK, hopZ, hopP, hopG,
        guinK, guinZ, guinG;

    wineK = getNumericValue('InputWineKassa');
    wineZ = getNumericValue('InputWineZahler');
    wineP = Math.floor((wineZ - wineK) / 6);
    wineG = Math.floor(((wineZ - wineK) % 6) / 3);

    gossK = getNumericValue('InputGosserKassa');
    gossZ = getNumericValue('InputGosserZahler');
    gossP = calculatePitcher(gossK, gossZ);
    gossG = calculateGlasses(gossK, gossZ);

    cidK = getNumericValue('InputCiderKassa');
    cidZ = getNumericValue('InputCiderZahler');
    cidP = calculatePitcher(cidK, cidZ);
    cidG = calculateGlasses(cidK, cidZ);

    stieK = getNumericValue('InputStieglKassa');
    stieZ = getNumericValue('InputStieglZahler');
    stieP = calculatePitcher(stieK, stieZ);
    stieG = calculateGlasses(stieK, stieZ);

    tahlK = getNumericValue('InputThalheimKassa');
    thalZ = getNumericValue('InputThalheimZahler');
    thalP = calculatePitcher(tahlK, thalZ);
    thalG = calculateGlasses(tahlK, thalZ);

    starK = getNumericValue('InputStaroKassa');
    starZ = getNumericValue('InputStaroZahler');
    starP = calculatePitcher(starK, starZ);
    starG = calculateGlasses(starK, starZ);

    kilK = getNumericValue('InputKilkennyKassa');
    kilZ = getNumericValue('InputKilkennyZahler');
    kilP = calculatePitcher(kilK, kilZ);
    kilG = calculateGlasses(kilK, kilZ);

    hopK = getNumericValue('InputHopHouseKassa');
    hopZ = getNumericValue('InputHopHouseZahler');
    hopP = calculatePitcher(hopK, hopZ);
    hopG = calculateGlasses(hopK, hopZ);

    guinK = getNumericValue('InputGuinnessKassa');
    guinZ = getNumericValue('InputGuinnessZahler');
    guinG = Math.floor((guinZ - guinK) / 5);

    currentSummary = buildSummary(
        { column: 'wine', name: 'Wine', stock: wineZ, pitchers: wineP, glasses: wineG },
        { column: 'gosser', name: 'Gösser', stock: gossZ, pitchers: gossP, glasses: gossG },
        { column: 'cider', name: 'Cider', stock: cidZ, pitchers: cidP, glasses: cidG },
        { column: 'stiegl', name: 'Stiegl', stock: stieZ, pitchers: stieP, glasses: stieG },
        { column: 'thalheim', name: 'Thalheim', stock: thalZ, pitchers: thalP, glasses: thalG },
        { column: 'staro', name: 'Staro', stock: starZ, pitchers: starP, glasses: starG },
        { column: 'kilkenny', name: 'Kilkenny', stock: kilZ, pitchers: kilP, glasses: kilG },
        { column: 'hophouse', name: 'Hop House', stock: hopZ, pitchers: hopP, glasses: hopG },
        { column: 'guinness', name: 'Guinness', stock: guinZ, pitchers: 0, glasses: guinG }
    );

    createOutput(wineP, wineG, gossP, gossG, cidP, cidG, stieP, stieG, thalP, thalG, starP, starG, kilP, kilG, hopP, hopG, guinG);

    persistStockEntry(currentSummary);
}

function calculatePitcher(kassa, zahler) {
    let diff = zahler - kassa;
    let pitcher = Math.floor(diff / 15);
    return pitcher;
}

function calculateGlasses(kassa, zahler) {
    let diff = zahler - kassa;
    let rest = diff % 15;
    if (rest >= 10) {
        return 2;
    }
    if (rest >= 5) {
        return 1;
    }
    else {
        return 0;
    }
}

function createOutput(wineP, wineG, gossP, gossG, cidP, cidG, stieP, stieG, thalP, thalG, starP, starG, kilP, kilG, hopP, hopG, guinG) {
    document.getElementById('wineP').textContent = wineP;
    document.getElementById('wineG').textContent = wineG;

    document.getElementById('gosP').textContent = gossP;
    document.getElementById('gosG').textContent = gossG;

    document.getElementById('cidP').textContent = cidP;
    document.getElementById('cidG').textContent = cidG;

    document.getElementById('stieP').textContent = stieP;
    document.getElementById('stieG').textContent = stieG;

    document.getElementById('thalP').textContent = thalP;
    document.getElementById('thalG').textContent = thalG;

    document.getElementById('starP').textContent = starP;
    document.getElementById('starG').textContent = starG;

    document.getElementById('kilP').textContent = kilP;
    document.getElementById('kilG').textContent = kilG;

    document.getElementById('hopP').textContent = hopP;
    document.getElementById('hopG').textContent = hopG;

    document.getElementById('guinG').textContent = guinG;
}

function buildSummary(...items) {
    const totals = items.reduce((accumulator, item) => {
        accumulator.stock += item.stock ?? 0;
        accumulator.pitchers += item.pitchers;
        accumulator.glasses += item.glasses;
        return accumulator;
    }, { stock: 0, pitchers: 0, glasses: 0 });

    return { items, totals };
}

function showSummary() {
    calculateStock();
    if (!currentSummary) {
        return;
    }

    sessionStorage.setItem('stockSummary', JSON.stringify(currentSummary));
    window.location.href = './summary.html';
}

function renderSummaryPage() {
    const container = document.getElementById('summaryContent');
    if (!container) {
        return;
    }

    const rawData = sessionStorage.getItem('stockSummary');
    if (!rawData) {
        container.innerHTML = '<p class="text-danger">Keine Daten vorhanden. Bitte gehen Sie zurück und tragen Sie die Bestände ein.</p>';
        return;
    }

    let summary;
    try {
        summary = JSON.parse(rawData);
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Die Zusammenfassung konnte nicht geladen werden.</p>';
        return;
    }

    const tableBody = document.getElementById('summaryTableBody');
    const totalStock = document.getElementById('totalStock');
    const totalPitchers = document.getElementById('totalPitchers');
    const totalGlasses = document.getElementById('totalGlasses');

    if (!tableBody || !totalStock || !totalPitchers || !totalGlasses) {
        container.innerHTML = '<p class="text-danger">Die Zusammenfassung konnte nicht dargestellt werden.</p>';
        return;
    }

    if (!summary.items || !Array.isArray(summary.items)) {
        container.innerHTML = '<p class="text-danger">Die Zusammenfassung konnte nicht geladen werden.</p>';
        return;
    }

    tableBody.innerHTML = summary.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.stock ?? ''}</td>
            <td>${item.pitchers}</td>
            <td>${item.glasses}</td>
        </tr>
    `).join('');

    totalStock.textContent = summary.totals.stock;
    totalPitchers.textContent = summary.totals.pitchers;
    totalGlasses.textContent = summary.totals.glasses;

    renderWeeklyConsumption();
}

function persistStockEntry(summary) {
    if (!summary || !Array.isArray(summary.items) || typeof fetch === 'undefined') {
        return;
    }

    const entry = {
        timestamp: new Date().toISOString(),
        stocks: summary.items.map(item => ({
            name: item.name,
            column: item.column,
            stock: sanitizeNumericValue(item.stock)
        }))
    };

    fetch('/api/stock-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    }).catch(error => {
        console.error('Der Lagerstand konnte nicht gespeichert werden.', error);
    });
}

async function loadStockHistory() {
    if (typeof fetch === 'undefined') {
        throw new Error('fetch is not available in this environment');
    }

    const response = await fetch('/api/stock-history', {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Unexpected response status: ${response.status}`);
    }

    const parsed = await response.json();
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter(entry => entry && typeof entry === 'object' && Array.isArray(entry.stocks) && typeof entry.timestamp === 'string')
        .map(entry => ({
            timestamp: entry.timestamp,
            stocks: entry.stocks
                .filter(stock => stock && typeof stock === 'object' && typeof stock.name === 'string')
                .map(stock => ({
                    name: stock.name,
                    stock: sanitizeNumericValue(stock.stock)
                }))
        }));
}

async function renderWeeklyConsumption() {
    const cardBody = document.getElementById('weeklyConsumptionBody');
    if (!cardBody) {
        return;
    }

    cardBody.innerHTML = '<p class="text-muted mb-0">Lade Verbrauchsdaten...</p>';

    let history;
    try {
        history = await loadStockHistory();
    } catch (error) {
        console.error('Die Verbrauchsdaten konnten nicht geladen werden.', error);
        cardBody.innerHTML = '<p class="text-danger mb-0">Die Verbrauchsdaten konnten nicht geladen werden.</p>';
        return;
    }

    if (!history.length) {
        cardBody.innerHTML = '<p class="text-muted mb-0">Es liegen noch keine gespeicherten Lagerstände vor.</p>';
        return;
    }

    const orderedHistory = history
        .map(entry => ({
            ...entry,
            date: new Date(entry.timestamp)
        }))
        .filter(entry => !Number.isNaN(entry.date.getTime()))
        .sort((a, b) => a.date - b.date);

    if (orderedHistory.length < 2) {
        cardBody.innerHTML = '<p class="text-muted mb-0">Es werden mindestens zwei Einträge benötigt, um den Verbrauch zu berechnen.</p>';
        return;
    }

    const latestEntry = orderedHistory[orderedHistory.length - 1];
    const threshold = new Date(latestEntry.date.getTime() - (7 * 24 * 60 * 60 * 1000));

    let baselineEntry = null;
    for (let index = orderedHistory.length - 2; index >= 0; index -= 1) {
        if (orderedHistory[index].date <= threshold) {
            baselineEntry = orderedHistory[index];
            break;
        }
    }

    if (!baselineEntry) {
        baselineEntry = orderedHistory[0];
    }

    if (!baselineEntry || !Array.isArray(latestEntry.stocks) || !Array.isArray(baselineEntry.stocks)) {
        cardBody.innerHTML = '<p class="text-muted mb-0">Der Verbrauch konnte nicht berechnet werden.</p>';
        return;
    }

    const baselineStocks = Object.fromEntries(baselineEntry.stocks.map(stock => [stock.name, sanitizeNumericValue(stock.stock)]));
    const latestStocks = Object.fromEntries(latestEntry.stocks.map(stock => [stock.name, sanitizeNumericValue(stock.stock)]));

    const rows = latestEntry.stocks.map(stock => {
        const startValue = sanitizeNumericValue(baselineStocks[stock.name]);
        const endValue = sanitizeNumericValue(latestStocks[stock.name]);
        const consumption = startValue - endValue;

        return `
            <tr>
                <td>${stock.name}</td>
                <td>${startValue}</td>
                <td>${endValue}</td>
                <td>${consumption}</td>
            </tr>
        `;
    }).join('');

    const formatterOptions = { dateStyle: 'short', timeStyle: 'short' };
    const startLabel = baselineEntry.date.toLocaleString('de-DE', formatterOptions);
    const endLabel = latestEntry.date.toLocaleString('de-DE', formatterOptions);

    cardBody.innerHTML = `
        <p class="mb-3">Zeitraum: <strong>${startLabel}</strong> bis <strong>${endLabel}</strong></p>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th scope="col">Produkt</th>
                        <th scope="col">Start</th>
                        <th scope="col">Ende</th>
                        <th scope="col">Verbrauch</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}


