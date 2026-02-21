function test() {
    document.getElementById('demo').innerHTML = Date();
}

let currentSummary = null;

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
        { name: 'Wine', stock: wineZ, pitchers: wineP, glasses: wineG },
        { name: 'Gösser', stock: gossZ, pitchers: gossP, glasses: gossG },
        { name: 'Cider', stock: cidZ, pitchers: cidP, glasses: cidG },
        { name: 'Thal Dark', stock: stieZ, pitchers: stieP, glasses: stieG },
        { name: 'Thalheim', stock: thalZ, pitchers: thalP, glasses: thalG },
        { name: 'Staro', stock: starZ, pitchers: starP, glasses: starG },
        { name: 'Kilkenny', stock: kilZ, pitchers: kilP, glasses: kilG },
        { name: 'Hop', stock: hopZ, pitchers: hopP, glasses: hopG },
        { name: 'Guinness', stock: guinZ, pitchers: 0, glasses: guinG }
    );

    createOutput(wineP, wineG, gossP, gossG, cidP, cidG, stieP, stieG, thalP, thalG, starP, starG, kilP, kilG, hopP, hopG, guinG);
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
}


