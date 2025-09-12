function test() {
document.getElementById('demo').innerHTML=Date();
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

    wineK = document.getElementById('InputWineKassa').value;
    wineZ = document.getElementById('InputWineZahler').value;
    wineP = Math.floor((wineZ-wineK)/6);
    wineG = Math.floor(((wineZ - wineK) % 6) / 3);

    gossK = document.getElementById('InputGosserKassa').value;
    gossZ = document.getElementById('InputGosserZahler').value;
    gossP = calculatePitcher(gossK, gossZ);
    gossG = calculateGlasses(gossK, gossZ);

    cidK = document.getElementById('InputCiderKassa').value;
    cidZ = document.getElementById('InputCiderZahler').value;
    cidP = calculatePitcher(cidK, cidZ);
    cidG = calculateGlasses(cidK, cidZ);

    stieK = document.getElementById('InputStieglKassa').value;
    stieZ = document.getElementById('InputStieglZahler').value;
    stieP = calculatePitcher(stieK, stieZ);
    stieG = calculateGlasses(stieK, stieZ);

    tahlK = document.getElementById('InputThalheimKassa').value;
    thalZ = document.getElementById('InputThalheimZahler').value;
    thalP = calculatePitcher(tahlK,thalZ);
    thalG = calculateGlasses(tahlK,thalZ);

    starK = document.getElementById('InputStaroKassa').value;
    starZ = document.getElementById('InputStaroZahler').value;
    starP = calculatePitcher(starK,starZ);
    starG = calculateGlasses(starK,starZ);

    kilK = document.getElementById('InputKilkennyKassa').value;
    kilZ = document.getElementById('InputKilkennyZahler').value;
    kilP = calculatePitcher(kilK, kilZ);
    kilG = calculateGlasses(kilK, kilZ);

    hopK = document.getElementById('InputHopHouseKassa').value;
    hopZ = document.getElementById('InputHopHouseZahler').value;
    hopP = calculatePitcher(hopK, hopZ);
    hopG = calculateGlasses(hopK, hopZ);

    guinK = document.getElementById('InputGuinnessKassa').value;
    guinZ = document.getElementById('InputGuinnessZahler').value;
    guinG = Math.floor((guinZ-guinK)/5);

    createOutput(wineP, wineG, gossP, gossG, cidP, cidG, stieP, stieG, thalP, thalG, starP, starG, kilP, kilG, hopP, hopG, guinG);
}

function calculatePitcher(kassa, zahler) {
    let diff = zahler - kassa;
    let pitcher = Math.floor(diff/15);
    return pitcher;
}

function calculateGlasses(kassa, zahler) {
    let diff = zahler - kassa;
    let rest = diff % 15;
    if(rest >= 10) {
        return 2;
    }
    if(rest >= 5) {
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