const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
    host: process.env.DB_HOST || 'nelsons-tools-db-1',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'nelsons-tools',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
};

const pool = new Pool(dbConfig);

const STOCK_DEFINITIONS = [
    { column: 'wine', label: 'Wine', aliases: [] },
    { column: 'gosser', label: 'Gösser', aliases: ['Gosser'] },
    { column: 'cider', label: 'Cider', aliases: [] },
    { column: 'stiegl', label: 'Stiegl', aliases: [] },
    { column: 'thalheim', label: 'Thalheim', aliases: [] },
    { column: 'staro', label: 'Staro', aliases: [] },
    { column: 'kilkenny', label: 'Kilkenny', aliases: [] },
    { column: 'hophouse', label: 'Hop House', aliases: ['Hop'] },
    { column: 'guinness', label: 'Guinness', aliases: [] }
];

const labelLookup = new Map();

function normalizeLabel(label) {
    if (!label) {
        return '';
    }

    return label
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');
}

for (const definition of STOCK_DEFINITIONS) {
    const candidates = new Set([definition.column, definition.label, ...(definition.aliases || [])]);
    for (const candidate of candidates) {
        const normalized = normalizeLabel(candidate);
        if (normalized) {
            labelLookup.set(normalized, definition.column);
        }
    }
}

async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS lagerstand (
            id SERIAL PRIMARY KEY,
            zeitpunkt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            wine INTEGER,
            gosser INTEGER,
            cider INTEGER,
            stiegl INTEGER,
            thalheim INTEGER,
            staro INTEGER,
            kilkenny INTEGER,
            hophouse INTEGER,
            guinness INTEGER
        )
    `);
}

function sanitizeNumericValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return null;
    }

    return Math.round(number);
}

function getColumnForName(rawName) {
    const normalized = normalizeLabel(rawName);
    if (!normalized) {
        return null;
    }

    return labelLookup.get(normalized) || null;
}

function normalizeStocks(rawStocks) {
    const values = {};
    let hasRecognisedValue = false;

    for (const definition of STOCK_DEFINITIONS) {
        values[definition.column] = 0;
    }

    if (!Array.isArray(rawStocks)) {
        return { values, hasRecognisedValue };
    }

    for (const stock of rawStocks) {
        if (!stock || typeof stock !== 'object') {
            continue;
        }

        const { name, column, label, stock: amount, value, quantity } = stock;
        const columnName = getColumnForName(column || name || label);

        if (!columnName) {
            continue;
        }

        const parsedValue = sanitizeNumericValue(amount ?? value ?? quantity);
        if (parsedValue === null) {
            continue;
        }

        values[columnName] = parsedValue;
        hasRecognisedValue = true;
    }

    return { values, hasRecognisedValue };
}

app.use(cors());
app.use(express.json());

app.get('/api/stock-history', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `
                SELECT zeitpunkt, wine, gosser, cider, stiegl, thalheim, staro, kilkenny, hophouse, guinness
                FROM lagerstand
                ORDER BY zeitpunkt ASC
            `
        );

        const payload = rows.map(row => ({
            timestamp: row.zeitpunkt instanceof Date ? row.zeitpunkt.toISOString() : row.zeitpunkt,
            stocks: STOCK_DEFINITIONS.map(definition => ({
                name: definition.label,
                column: definition.column,
                stock: sanitizeNumericValue(row[definition.column]) ?? 0
            }))
        }));

        res.json(payload);
    } catch (error) {
        console.error('Failed to read stock history', error);
        res.status(500).json({ error: 'Die gespeicherten Lagerstände konnten nicht geladen werden.' });
    }
});

app.post('/api/stock-history', async (req, res) => {
    const { timestamp, stocks } = req.body || {};

    const parsedDate = new Date(timestamp || Date.now());
    if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Das angegebene Datum ist ungültig.' });
    }

    const { values: normalizedStocks, hasRecognisedValue } = normalizeStocks(stocks);
    if (!hasRecognisedValue) {
        return res.status(400).json({ error: 'Es wurden keine gültigen Lagerstände übermittelt.' });
    }

    try {
        const columnNames = STOCK_DEFINITIONS.map(definition => definition.column);
        const placeholders = columnNames.map((_, index) => `$${index + 2}`);

        await pool.query(
            `
                INSERT INTO lagerstand (zeitpunkt, ${columnNames.join(', ')})
                VALUES ($1, ${placeholders.join(', ')})
            `,
            [
                parsedDate.toISOString(),
                ...columnNames.map(name => normalizedStocks[name])
            ]
        );

        res.status(201).json({ status: 'stored' });
    } catch (error) {
        console.error('Failed to store stock history entry', error);
        res.status(500).json({ error: 'Der Lagerstand konnte nicht gespeichert werden.' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

ensureSchema()
    .then(() => {
        app.listen(port, () => {
            console.log(`Stock history service is running on port ${port}`);
        });
    })
    .catch(error => {
        console.error('Failed to initialise the database schema', error);
        process.exit(1);
    });
