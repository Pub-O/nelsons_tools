export const EASY_COUNT_DEFAULT_UNIT_QTY = 0.1;
export const EASY_COUNT_POINT_STEP = 0.5;

export type EasyCountMeasureUnit = 'Liter' | 'Milliliter' | 'Centiliter';

export const easyCountMeasureUnits: EasyCountMeasureUnit[] = ['Liter', 'Milliliter', 'Centiliter'];

export const easyCountPresets = [
  {
    name: 'Viertel',
    points: 2.5,
    liters: 0.25,
    totalLiters: 0.25
  },
  {
    name: 'Glas',
    points: 5,
    liters: 0.5,
    totalLiters: 0.5
  },
  {
    name: 'Pitcher',
    points: 15,
    liters: 1.5,
    totalLiters: 1.5
  }
];

export function easyCountUnitQty(value?: string | number | null) {
  return Number(value ?? EASY_COUNT_DEFAULT_UNIT_QTY) || EASY_COUNT_DEFAULT_UNIT_QTY;
}

export function easyCountQtyFromLiters(litersInput?: string | number | null, unit: EasyCountMeasureUnit = 'Centiliter') {
  const liters = easyCountUnitQty(litersInput);
  if (unit === 'Milliliter') {
    return liters * 1000;
  }
  if (unit === 'Centiliter') {
    return liters * 100;
  }
  return liters;
}

export function easyCountQtyToLiters(valueInput: string | number, unit: EasyCountMeasureUnit = 'Centiliter') {
  const value = Number(valueInput || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return EASY_COUNT_DEFAULT_UNIT_QTY;
  }
  if (unit === 'Milliliter') {
    return value / 1000;
  }
  if (unit === 'Centiliter') {
    return value / 100;
  }
  return value;
}

export function inferEasyCountMeasureUnit(litersInput?: string | number | null): EasyCountMeasureUnit {
  const liters = easyCountUnitQty(litersInput);
  const centiliters = liters * 100;
  if (Number.isInteger(centiliters)) {
    return 'Centiliter';
  }
  const milliliters = liters * 1000;
  if (Number.isInteger(milliliters)) {
    return 'Milliliter';
  }
  return 'Liter';
}

export function normalizeEasyCountPoints(value: string | number) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.round(numeric * 1000) / 1000;
}

export function easyCountPresetSummary(unitQtyInput?: string | number | null) {
  const unitQty = easyCountUnitQty(unitQtyInput);
  return easyCountPresets
    .map((preset) => `${preset.name}: ${formatLiters(preset.points)} Punkte = ${formatLiters(preset.points * unitQty)} Liter`)
    .join(', ');
}

function formatLiters(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatEasyCountQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
