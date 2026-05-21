import { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CalendarDays,
  Check,
  ClipboardCheck,
  ListChecks,
  Package,
  ShieldCheck
} from 'lucide-react';
import { InventoryProduct, Tab } from '../../types';
import { formatAmount, formatUnitLabel } from '../../utils';

export function Dashboard({
  lowStock,
  productCount,
  employeeCount,
  shiftCount,
  locationName,
  onOpen
}: {
  lowStock: InventoryProduct[];
  productCount: number;
  employeeCount: number;
  shiftCount: number;
  locationName?: string;
  onOpen: (tab: Tab) => void;
}) {
  const priorityStock = lowStock.slice(0, 3);

  return (
    <section className="dashboard-view">
      <div className="hero-panel dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">{locationName ?? 'Pub-O'} · Heute</span>
          <h1>Alles im Blick</h1>
          <p>{lowStock.length > 0 ? `${lowStock.length} Bestände brauchen Aufmerksamkeit.` : 'Bestände, Team und Closing sehen ruhig aus.'}</p>
          <div className="hero-actions">
            <button className="primary-button light-button" type="button" onClick={() => onOpen('stock')}>
              <Package size={18} />
              Bestand prüfen
            </button>
            <button className="text-button ghost-button" type="button" onClick={() => onOpen('shifts')}>
              <CalendarDays size={18} />
              Dienstplan
            </button>
          </div>
        </div>
        <div className="hero-badge" aria-hidden="true">
          <ClipboardCheck size={34} />
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Produkte" value={String(productCount)} detail="im Bestand" />
        <Metric label="Stock Alerts" value={String(lowStock.length)} detail="unter Ziel" tone={lowStock.length > 0 ? 'alert' : 'ok'} />
        <Metric label="Team" value={String(employeeCount)} detail="aktive Profile" />
        <Metric label="Dienste" value={String(shiftCount)} detail="im Monat" />
      </div>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Priorität</span>
            <h2>Bestandswarnungen</h2>
          </div>
          <button className="inline-link" type="button" onClick={() => onOpen('shopping')}>
            Einkauf
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="dashboard-alert-list">
          {priorityStock.length === 0 && (
            <div className="empty-state calm-state">
              <Check size={18} />
              Keine kritischen Bestände.
            </div>
          )}
          {priorityStock.map((product) => (
            <button className="dashboard-alert" type="button" key={product.id} onClick={() => onOpen('stock')}>
              <span className="alert-icon"><AlertTriangle size={18} /></span>
              <span>
                <strong>{product.name}</strong>
                <small>{formatAmount(product.current)} von {formatAmount(product.target)} {formatUnitLabel(product.unit)}</small>
              </span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="quick-action-grid" aria-label="Schnellzugriff">
        <QuickAction label="Easy Count" detail="Nachbonnage" icon={<Calculator size={20} />} onClick={() => onOpen('easy-count')} />
        <QuickAction label="Closing" detail="Liste öffnen" icon={<ListChecks size={20} />} onClick={() => onOpen('checklists')} />
        <QuickAction label="Admin" detail="Standort und Login" icon={<ShieldCheck size={20} />} onClick={() => onOpen('admin')} />
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'alert' | 'ok';
}) {
  return (
    <div className={`metric${tone ? ` ${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function QuickAction({
  label,
  detail,
  icon,
  onClick
}: {
  label: string;
  detail: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="quick-action" type="button" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </button>
  );
}
