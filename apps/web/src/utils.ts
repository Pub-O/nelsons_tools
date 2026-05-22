import { Product } from './types';
import {
  easyCountQtyFromLiters,
  easyCountUnitQty,
  type EasyCountMeasureUnit,
  formatEasyCountQty,
  normalizeEasyCountMeasureUnit
} from './easyCount';

export function formatPackage(product: Product) {
  const size = Number(product.containerSize ?? 0);
  const formattedSize = size > 0 ? ` ${Number.isInteger(size) ? size : size.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}` : '';
  const unit = product.containerUnit ? ` ${formatUnitLabel(product.containerUnit)}` : '';
  return `${product.containerType ?? 'Stück'}${formattedSize}${unit}`;
}

export function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatNullableAmount(value: Product[keyof Product]) {
  const amount = Number(value ?? 0);
  return formatAmount(amount);
}

export function productToForm(product?: Product) {
  const easyCountMeasureUnit = normalizeEasyCountMeasureUnit(product?.easyCountMeasureUnit)
    ?? 'Milliliter';

  return {
    name: product?.name ?? '',
    unit: formatUnitLabel(product?.unit ?? 'Stück'),
    containerType: product?.containerType ?? 'Stück',
    containerSize: String(product?.containerSize ?? '1'),
    containerUnit: formatUnitLabel(product?.containerUnit ?? 'Stück'),
    parLevel: String(product?.parLevel ?? '0'),
    reorderPoint: String(product?.reorderPoint ?? '0'),
    isEasyCount: product?.isEasyCount ?? false,
    easyCountUnitQty: formatEasyCountQty(easyCountQtyFromLiters(product?.easyCountUnitQty, easyCountMeasureUnit)),
    easyCountMeasureUnit
  };
}

export function formatUnitLabel(unit?: string | number | null) {
  const value = String(unit ?? '').trim();
  const labels: Record<string, string> = {
    Stk: 'Stück',
    stk: 'Stück',
    pcs: 'Stück',
    l: 'Liter',
    L: 'Liter',
    ml: 'Milliliter',
    kg: 'Kilogramm',
    g: 'Gramm'
  };
  return labels[value] ?? value;
}

export function formatStockTargetUnit(product: Product) {
  return formatUnitLabel(product.containerUnit ?? product.unit);
}

export function formatPointDefinition(product: Product) {
  const unitQty = easyCountUnitQty(product.easyCountUnitQty);
  const measureUnit = normalizeEasyCountMeasureUnit(product.easyCountMeasureUnit) ?? 'Milliliter';
  return `1 Point = ${formatAmount(easyCountQtyFromLiters(unitQty, measureUnit))} ${formatEasyCountMeasureUnit(measureUnit)}`;
}

function formatEasyCountMeasureUnit(unit: EasyCountMeasureUnit) {
  if (unit === 'Liter') {
    return 'L';
  }
  if (unit === 'Milliliter') {
    return 'ml';
  }
  return 'cl';
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function buildMonthGrid(month: Date) {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function dateInRange(day: string, startsOn: string, endsOn: string) {
  return day >= startsOn.slice(0, 10) && day <= endsOn.slice(0, 10);
}
