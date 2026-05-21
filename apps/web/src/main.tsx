import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Calculator,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Home,
  ListChecks,
  LogOut,
  Package,
  Plane,
  Plus,
  Save,
  ShieldCheck,
  ShoppingCart,
  Users
} from 'lucide-react';
import './styles.css';

type Tab = 'dashboard' | 'stock' | 'shopping' | 'easy-count' | 'shifts' | 'checklists' | 'admin';

type Product = {
  id: string;
  name: string;
  category?: { name: string } | null;
  unit: string;
  containerType?: string;
  containerSize?: string | number | null;
  containerUnit?: string | null;
  reorderPoint?: string | number | null;
  parLevel?: string | number | null;
  isEasyCount?: boolean;
  easyCountUnitQty?: string | number | null;
};

type ProductFormData = {
  name: string;
  unit: string;
  containerType: string;
  containerSize: number;
  containerUnit: string;
  parLevel: number;
  reorderPoint: number;
  isEasyCount: boolean;
  easyCountUnitQty: number;
};

type StockItem = {
  id: string;
  quantity: string | number;
  product: Product;
};

type Location = {
  id: string;
  name: string;
  organizationId: string;
};

type Membership = {
  role: string;
  organization: { id: string; name: string };
  location?: { id: string; name: string } | null;
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
  memberships?: Membership[];
};

type Employee = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  weeklyHours: number;
  canConfigureProducts: boolean;
  canManageEmployees: boolean;
  canManageLists: boolean;
  canManageSchedule: boolean;
  canUseEasyCount: boolean;
  isActive: boolean;
};

type Shift = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  employee?: Employee | null;
};

type Vacation = {
  id: string;
  startsOn: string;
  endsOn: string;
  note?: string | null;
  employee: Employee;
};

type EasyCountInput = {
  targetCount: string;
  registerCount: string;
};

type EasyCountRun = {
  id: string;
  countedAt: string;
  lines: Array<{
    id: string;
    startingCount: number;
    targetCount: number;
    registerCount: number;
    differenceCount: number;
    quantityPerPoint: string | number;
    correctionQty: string | number;
    product: Product;
  }>;
};

const apiBase = window.location.hostname === 'int-web.pub-o.com'
  ? 'https://int-api.pub-o.com/api'
  : '/api';

const checklistItems = [
  'Kassa zählen',
  'Zapfhähne spülen',
  'Kühlhaus prüfen',
  'Reservierungen kontrollieren',
  'Closing-Notiz schreiben'
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [token, setToken] = useState(() => localStorage.getItem('puboAccessToken') ?? '');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [easyCounts, setEasyCounts] = useState<Record<string, EasyCountInput>>({});
  const [easyCountRuns, setEasyCountRuns] = useState<EasyCountRun[]>([]);
  const [scheduleMonth, setScheduleMonth] = useState(() => startOfMonth(new Date()));
  const [scheduleShifts, setScheduleShifts] = useState<Shift[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [status, setStatus] = useState('');

  const activeLocation = locations.find((location) => location.id === activeLocationId);
  const membership = user?.memberships?.[0];
  const organizationId = membership?.organization.id ?? activeLocation?.organizationId ?? '';

  const inventory = useMemo(() => {
    const stockByProduct = new Map(stockItems.map((item) => [item.product.id, item]));
    return products.map((product) => {
      const item = stockByProduct.get(product.id);
      const current = Number(item?.quantity ?? 0);
      const target = Number(product.parLevel ?? product.reorderPoint ?? 0);
      return {
        ...product,
        current,
        target
      };
    });
  }, [products, stockItems]);

  const lowStock = useMemo(
    () => inventory.filter((product) => product.target > 0 && product.current <= product.target * 0.75),
    [inventory]
  );

  const easyCountProducts = useMemo(
    () => inventory.filter((product) => product.isEasyCount),
    [inventory]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadAdminData(token);
  }, [token]);

  useEffect(() => {
    if (token && activeLocationId) {
      void loadStock(token, activeLocationId);
      void loadEasyCountRuns(token, activeLocationId);
      void loadScheduleData(token, activeLocationId, scheduleMonth);
    }
  }, [token, activeLocationId, organizationId, scheduleMonth]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? 'Request failed');
    }

    return response.json() as Promise<T>;
  }

  async function loadAdminData(accessToken = token) {
    try {
      const [me, locationResult, productResult, employeeResult] = await Promise.all([
        request<{ user: SessionUser }>('/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        request<{ locations: Location[] }>('/locations', {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        request<{ products: Product[] }>('/products', {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        request<{ employees: Employee[] }>('/employees', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);

      setUser(me.user);
      setLocations(locationResult.locations);
      setProducts(productResult.products);
      setEmployees(employeeResult.employees);

      if (!activeLocationId && locationResult.locations[0]) {
        setActiveLocationId(locationResult.locations[0].id);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Admin-Daten konnten nicht geladen werden.');
    }
  }

  async function loadStock(accessToken: string, locationId: string) {
    try {
      const result = await request<{ stockItems: StockItem[] }>(`/stock?locationId=${locationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStockItems(result.stockItems);
      setCounts((existing) => {
        const next = { ...existing };
        for (const item of result.stockItems) {
          next[item.product.id] = String(item.quantity);
        }
        return next;
      });
      setEasyCounts((existing) => {
        const next = { ...existing };
        for (const item of result.stockItems) {
          const quantityPerPoint = Number(item.product.easyCountUnitQty ?? 1) || 1;
          const currentPoints = Math.round(Number(item.quantity ?? 0) / quantityPerPoint);
          next[item.product.id] = {
            targetCount: String(currentPoints),
            registerCount: String(currentPoints)
          };
        }
        return next;
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Bestand konnte nicht geladen werden.');
    }
  }

  async function loadEasyCountRuns(accessToken: string, locationId: string) {
    try {
      const result = await request<{ runs: EasyCountRun[] }>(`/easy-count-runs?locationId=${locationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setEasyCountRuns(result.runs);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'EasyCount konnte nicht geladen werden.');
    }
  }

  async function loadScheduleData(accessToken: string, locationId: string, month: Date) {
    if (!organizationId) {
      return;
    }

    try {
      const from = formatDateInput(startOfMonth(month));
      const to = formatDateInput(addMonths(startOfMonth(month), 1));
      const [shiftResult, vacationResult] = await Promise.all([
        request<{ shifts: Shift[] }>(`/shifts?locationId=${locationId}&from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        request<{ vacations: Vacation[] }>(`/vacations?organizationId=${organizationId}&from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);
      setScheduleShifts(shiftResult.shifts);
      setVacations(vacationResult.vacations);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Dienstplan konnte nicht geladen werden.');
    }
  }

  function handleAuthenticated(accessToken: string) {
    localStorage.setItem('puboAccessToken', accessToken);
    setToken(accessToken);
    setActiveTab('admin');
    setStatus('Admin-Zugang aktiv.');
  }

  function logout() {
    localStorage.removeItem('puboAccessToken');
    setToken('');
    setUser(null);
    setLocations([]);
    setProducts([]);
    setStockItems([]);
    setCounts({});
    setEmployees([]);
    setEasyCounts({});
    setEasyCountRuns([]);
    setScheduleShifts([]);
    setVacations([]);
    setActiveTab('dashboard');
  }

  async function createProduct(data: ProductFormData) {
    if (!organizationId) {
      setStatus('Keine Organisation gefunden. Bitte neu anmelden.');
      return;
    }

    try {
      const result = await request<{ product: Product }>('/products', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          name: data.name,
          unit: data.unit,
          containerType: data.containerType,
          containerSize: data.containerSize,
          containerUnit: data.containerUnit,
          parLevel: data.parLevel,
          reorderPoint: data.reorderPoint,
          isEasyCount: data.isEasyCount,
          easyCountUnitQty: data.isEasyCount ? data.easyCountUnitQty : undefined
        })
      });
      setProducts((items) => [...items, result.product].sort((a, b) => a.name.localeCompare(b.name)));
      setCounts((items) => ({ ...items, [result.product.id]: '0' }));
      if (result.product.isEasyCount) {
        setEasyCounts((items) => ({
          ...items,
          [result.product.id]: { targetCount: '0', registerCount: '0' }
        }));
      }
      setStatus(`${result.product.name} wurde angelegt.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Produkt konnte nicht angelegt werden.');
    }
  }

  async function updateProduct(productId: string, data: ProductFormData) {
    if (!organizationId) {
      setStatus('Keine Organisation gefunden. Bitte neu anmelden.');
      return;
    }

    try {
      const result = await request<{ product: Product }>(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          organizationId,
          name: data.name,
          unit: data.unit,
          containerType: data.containerType,
          containerSize: data.containerSize,
          containerUnit: data.containerUnit,
          parLevel: data.parLevel,
          reorderPoint: data.reorderPoint,
          isEasyCount: data.isEasyCount,
          easyCountUnitQty: data.isEasyCount ? data.easyCountUnitQty : undefined
        })
      });
      setProducts((items) => items
        .map((item) => (item.id === result.product.id ? result.product : item))
        .sort((a, b) => a.name.localeCompare(b.name)));
      if (result.product.isEasyCount) {
        setEasyCounts((items) => ({
          ...items,
          [result.product.id]: items[result.product.id] ?? { targetCount: '0', registerCount: '0' }
        }));
      } else {
        setEasyCounts((items) => {
          const next = { ...items };
          delete next[result.product.id];
          return next;
        });
      }
      setStatus(`${result.product.name} wurde aktualisiert.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Produkt konnte nicht aktualisiert werden.');
    }
  }

  async function createEmployee(data: Omit<Employee, 'id'>) {
    if (!organizationId) {
      setStatus('Keine Organisation gefunden. Bitte neu anmelden.');
      return;
    }

    try {
      const result = await request<{ employee: Employee }>('/employees', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          ...data,
          email: data.email || undefined,
          phone: data.phone || undefined
        })
      });
      setEmployees((items) => [...items, result.employee].sort((a, b) => a.name.localeCompare(b.name)));
      setStatus(`${result.employee.name} wurde angelegt.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Mitarbeiter konnte nicht angelegt werden.');
    }
  }

  async function createShift(data: {
    employeeId: string;
    date: string;
    startsAt: string;
    endsAt: string;
    title: string;
  }) {
    if (!activeLocationId) {
      setStatus('Bitte zuerst eine Location auswählen.');
      return;
    }

    try {
      const result = await request<{ shift: Shift }>('/shifts', {
        method: 'POST',
        body: JSON.stringify({
          locationId: activeLocationId,
          employeeId: data.employeeId,
          title: data.title,
          startsAt: `${data.date}T${data.startsAt}:00`,
          endsAt: `${data.date}T${data.endsAt}:00`
        })
      });
      setScheduleShifts((items) => [...items, result.shift].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setStatus('Dienst wurde eingetragen.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Dienst konnte nicht eingetragen werden.');
    }
  }

  async function createVacation(data: {
    employeeId: string;
    startsOn: string;
    endsOn: string;
    note: string;
  }) {
    if (!organizationId) {
      setStatus('Keine Organisation gefunden. Bitte neu anmelden.');
      return;
    }

    try {
      const result = await request<{ vacation: Vacation }>('/vacations', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          employeeId: data.employeeId,
          startsOn: data.startsOn,
          endsOn: data.endsOn,
          note: data.note || undefined
        })
      });
      setVacations((items) => [...items, result.vacation].sort((a, b) => a.startsOn.localeCompare(b.startsOn)));
      setStatus('Urlaub wurde eingetragen.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Urlaub konnte nicht eingetragen werden.');
    }
  }

  async function saveEasyCount() {
    if (!activeLocationId) {
      setStatus('Bitte zuerst eine Location auswählen.');
      return;
    }

    const lines = easyCountProducts.map((product) => {
      const quantityPerPoint = Number(product.easyCountUnitQty ?? 1) || 1;
      const lastCount = Math.round(product.current / quantityPerPoint);
      const values = easyCounts[product.id] ?? {
        targetCount: String(lastCount),
        registerCount: String(lastCount)
      };
      return {
        productId: product.id,
        startingCount: lastCount,
        targetCount: Number(values.targetCount || 0),
        registerCount: Number(values.registerCount || 0)
      };
    });

    if (!lines.length) {
      setStatus('Bitte zuerst ein Produkt mit Easy Count aktivieren.');
      return;
    }

    try {
      await request('/easy-count-runs', {
        method: 'POST',
        body: JSON.stringify({
          locationId: activeLocationId,
          note: 'Einfache Nachbonnage',
          lines
        })
      });
      await Promise.all([
        loadStock(token, activeLocationId),
        loadEasyCountRuns(token, activeLocationId)
      ]);
      setStatus('EasyCount wurde gespeichert.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'EasyCount konnte nicht gespeichert werden.');
    }
  }

  async function saveStockCount() {
    if (!activeLocationId) {
      setStatus('Bitte zuerst eine Location auswählen.');
      return;
    }

    const lines = products.filter((product) => !product.isEasyCount).map((product) => ({
      productId: product.id,
      countedQty: Number(counts[product.id] || 0)
    }));

    if (!lines.length) {
      setStatus('Bitte zuerst ein reguläres Stock-Produkt anlegen.');
      return;
    }

    try {
      await request('/stock-counts', {
        method: 'POST',
        body: JSON.stringify({
          locationId: activeLocationId,
          note: 'Admin-Zählstand',
          lines
        })
      });
      await loadStock(token, activeLocationId);
      setStatus('Zählstand wurde gespeichert.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Zählstand konnte nicht gespeichert werden.');
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-lockup">
          <img src="/img/pub-o-logo.png" alt="" />
          <div>
            <strong>Pub-O</strong>
            <span>{activeLocation?.name ?? 'Pub-Organizer'}</span>
          </div>
        </div>
        {token ? (
          <button className="icon-button" aria-label="Abmelden" onClick={logout}>
            <LogOut size={20} />
          </button>
        ) : (
          <button className="icon-button" aria-label="Admin öffnen" onClick={() => setActiveTab('admin')}>
            <ShieldCheck size={20} />
          </button>
        )}
      </header>

      <section className="content">
        {status && <div className="status-line">{status}</div>}
        {activeTab === 'dashboard' && (
          <Dashboard
            lowStock={lowStock}
            productCount={products.length}
            employeeCount={employees.length}
            shiftCount={scheduleShifts.length}
            locationName={activeLocation?.name}
            onOpen={setActiveTab}
          />
        )}
        {activeTab === 'stock' && (
          <Stock
            products={inventory}
            counts={counts}
            onCountChange={(productId, value) => setCounts((items) => ({ ...items, [productId]: value }))}
            onCreateProduct={createProduct}
            onUpdateProduct={updateProduct}
            onSaveStockCount={saveStockCount}
          />
        )}
        {activeTab === 'shopping' && <Shopping lowStock={lowStock} />}
        {activeTab === 'easy-count' && (
          <EasyCount
            products={easyCountProducts}
            values={easyCounts}
            runs={easyCountRuns}
            onChange={(productId, field, value) => setEasyCounts((items) => ({
              ...items,
              [productId]: {
                ...(items[productId] ?? { targetCount: '0', registerCount: '0' }),
                [field]: value
              }
            }))}
            onSave={saveEasyCount}
          />
        )}
        {activeTab === 'shifts' && (
          <Schedule
            month={scheduleMonth}
            shifts={scheduleShifts}
            vacations={vacations}
            employees={employees}
            onMonthChange={setScheduleMonth}
            onCreateShift={createShift}
            onCreateVacation={createVacation}
            onCreateEmployee={createEmployee}
          />
        )}
        {activeTab === 'checklists' && <Checklists />}
        {activeTab === 'admin' && (
          token ? (
            <AdminPanel
              user={user}
              locations={locations}
              activeLocationId={activeLocationId}
              onLocationChange={setActiveLocationId}
            />
          ) : (
            <AuthPanel onAuthenticated={handleAuthenticated} setStatus={setStatus} />
          )
        )}
      </section>

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        <NavButton tab="dashboard" activeTab={activeTab} label="Home" onClick={setActiveTab}>
          <Home size={21} />
        </NavButton>
        <NavButton tab="stock" activeTab={activeTab} label="Stock" onClick={setActiveTab}>
          <Package size={21} />
        </NavButton>
        <NavButton tab="shopping" activeTab={activeTab} label="Einkauf" onClick={setActiveTab}>
          <ShoppingCart size={21} />
        </NavButton>
        <NavButton tab="easy-count" activeTab={activeTab} label="Easy" onClick={setActiveTab}>
          <Calculator size={21} />
        </NavButton>
        <NavButton tab="checklists" activeTab={activeTab} label="Listen" onClick={setActiveTab}>
          <ListChecks size={21} />
        </NavButton>
        <NavButton tab="shifts" activeTab={activeTab} label="Dienst" onClick={setActiveTab}>
          <CalendarDays size={21} />
        </NavButton>
        <NavButton tab="admin" activeTab={activeTab} label="Admin" onClick={setActiveTab}>
          <ShieldCheck size={21} />
        </NavButton>
      </nav>
    </main>
  );
}

function NavButton({
  tab,
  activeTab,
  label,
  children,
  onClick
}: {
  tab: Tab;
  activeTab: Tab;
  label: string;
  children: React.ReactNode;
  onClick: (tab: Tab) => void;
}) {
  return (
    <button className={activeTab === tab ? 'active' : ''} onClick={() => onClick(tab)}>
      {children}
      <span>{label}</span>
    </button>
  );
}

function Dashboard({
  lowStock,
  productCount,
  employeeCount,
  shiftCount,
  locationName,
  onOpen
}: {
  lowStock: Array<Product & { current: number; target: number }>;
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
  icon: React.ReactNode;
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

function Stock({
  products,
  counts,
  onCountChange,
  onCreateProduct,
  onUpdateProduct,
  onSaveStockCount
}: {
  products: Array<Product & { current: number; target: number }>;
  counts: Record<string, string>;
  onCountChange: (productId: string, value: string) => void;
  onCreateProduct: (data: ProductFormData) => void;
  onUpdateProduct: (productId: string, data: ProductFormData) => void;
  onSaveStockCount: () => void;
}) {
  return (
    <section className="section">
      <h2>Bestand</h2>
      <div className="stock-list">
        {products.length === 0 && <EmptyState text="Noch keine Produkte angelegt." />}
        {products.map((product) => {
          const target = product.target || 1;
          const percentage = Math.min(100, Math.round((product.current / target) * 100));
          return (
            <article className="stock-card" key={product.id}>
              <div className="stock-title">
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatPackage(product)}</span>
                </div>
                <b>{formatAmount(product.current)} {formatUnitLabel(product.unit)}</b>
              </div>
              <div className="stock-meter">
                <span style={{ width: `${percentage}%` }} />
              </div>
              <small>Ziel: {product.target || '-'} {formatUnitLabel(product.unit)}</small>
              {product.isEasyCount && (
                <small>Last Count: {formatAmount(product.current / (Number(product.easyCountUnitQty ?? 1) || 1))} Punkte · {formatPointDefinition(product)}</small>
              )}
            </article>
          );
        })}
      </div>
      <ProductEditor products={products} onUpdateProduct={onUpdateProduct} />
      <ProductForm onCreateProduct={onCreateProduct} />
      <section className="section">
        <h2>Zählstand</h2>
        <div className="count-list">
          {products.filter((product) => !product.isEasyCount).length === 0 && <EmptyState text="Keine regulären Stock-Produkte angelegt." />}
          {products.filter((product) => !product.isEasyCount).map((product) => (
            <label className="count-row" key={product.id}>
              <span>
                <strong>{product.name}</strong>
                <small>{formatPackage(product)}</small>
              </span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={counts[product.id] ?? '0'}
                onChange={(event) => onCountChange(product.id, event.target.value)}
              />
            </label>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={onSaveStockCount}>
          <Save size={18} />
          Zählstand speichern
        </button>
      </section>
    </section>
  );
}

function Shopping({ lowStock }: { lowStock: Array<Product & { current: number; target: number }> }) {
  return (
    <section className="section">
      <h2>Einkauf</h2>
      <div className="action-list">
        {lowStock.length === 0 && <EmptyState text="Keine niedrigen Bestände." />}
        {lowStock.map((product) => (
          <article className="list-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>
                {Math.max(0, product.target - product.current)} {formatUnitLabel(product.unit)} bis Zielbestand
              </span>
            </div>
            <input type="checkbox" aria-label={`${product.name} erledigt`} />
          </article>
        ))}
      </div>
    </section>
  );
}

function EasyCount({
  products,
  values,
  runs,
  onChange,
  onSave
}: {
  products: Array<Product & { current: number; target: number }>;
  values: Record<string, EasyCountInput>;
  runs: EasyCountRun[];
  onChange: (productId: string, field: keyof EasyCountInput, value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="section">
      <h2>Einfache Nachbonnage</h2>
      <div className="count-list">
        {products.length === 0 && <EmptyState text="Aktiviere Easy Count zuerst bei einem Produkt." />}
        {products.map((product) => {
          const quantityPerPoint = Number(product.easyCountUnitQty ?? 1) || 1;
          const lastCount = Math.round(product.current / quantityPerPoint);
          const row = values[product.id] ?? {
            targetCount: String(lastCount),
            registerCount: String(lastCount)
          };
          const target = Number(row.targetCount || 0);
          const register = Number(row.registerCount || 0);
          const difference = target - register;
          const correction = difference * quantityPerPoint;

          return (
            <article className="easy-count-row" key={product.id}>
              <div className="stock-title">
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatPointDefinition(product)}</span>
                </div>
                <b>{difference >= 0 ? '+' : ''}{difference} Punkte</b>
              </div>
              <div className="admin-summary compact-summary">
                <strong>Last Count</strong>
                <span>{lastCount} Punkte Sollstand</span>
              </div>
              <div className="form-grid">
                <label>
                  Lagerstand
                  <input type="number" min="0" step="1" value={row.targetCount} onChange={(event) => onChange(product.id, 'targetCount', event.target.value)} />
                </label>
                <label>
                  Kassastand
                  <input type="number" min="0" step="1" value={row.registerCount} onChange={(event) => onChange(product.id, 'registerCount', event.target.value)} />
                </label>
              </div>
              <small>Nachzubonnieren: {formatAmount(correction)} {formatUnitLabel(product.unit)}</small>
            </article>
          );
        })}
      </div>
      <button className="primary-button" type="button" onClick={onSave}>
        <Save size={18} />
        EasyCount speichern
      </button>
      {runs[0] && (
        <div className="admin-summary">
          <strong>Letzter EasyCount</strong>
          <span>{new Date(runs[0].countedAt).toLocaleString('de-AT')}</span>
          <small>{runs[0].lines.map((line) => `${line.product.name}: ${line.differenceCount >= 0 ? '+' : ''}${line.differenceCount}`).join(' · ')}</small>
        </div>
      )}
    </section>
  );
}

function AuthPanel({
  onAuthenticated,
  setStatus
}: {
  onAuthenticated: (token: string) => void;
  setStatus: (message: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: 'Nelsons Pub',
    locationName: 'Main Bar'
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : form;

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? 'Anmeldung fehlgeschlagen.');
      }

      onAuthenticated(result.accessToken);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.');
    }
  }

  return (
    <section className="section">
      <h2>{mode === 'login' ? 'Admin Login' : 'Admin Setup'}</h2>
      <form className="form-card" onSubmit={submit}>
        <label>
          E-Mail
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label>
          Passwort
          <input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </label>
        {mode === 'register' && (
          <>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Organisation
              <input value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} required />
            </label>
            <label>
              Standort
              <input value={form.locationName} onChange={(event) => setForm({ ...form, locationName: event.target.value })} required />
            </label>
          </>
        )}
        <button className="primary-button" type="submit">
          <ShieldCheck size={18} />
          {mode === 'login' ? 'Einloggen' : 'Admin anlegen'}
        </button>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Ersten Admin-Zugang anlegen' : 'Zum Login wechseln'}
        </button>
      </form>
    </section>
  );
}

function AdminPanel({
  user,
  locations,
  activeLocationId,
  onLocationChange
}: {
  user: SessionUser | null;
  locations: Location[];
  activeLocationId: string;
  onLocationChange: (locationId: string) => void;
}) {
  return (
    <section className="section">
      <h2>Admin</h2>
      <div className="admin-summary">
        <strong>{user?.name ?? 'Admin'}</strong>
        <span>Standort und Zugang aktiv.</span>
      </div>
      <label className="select-row">
        Standort
        <select value={activeLocationId} onChange={(event) => onLocationChange(event.target.value)}>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ProductForm({
  onCreateProduct
}: {
  onCreateProduct: (data: ProductFormData) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    unit: 'Stück',
    containerType: 'Stück',
    containerSize: '1',
    containerUnit: 'Stück',
    parLevel: '0',
    reorderPoint: '0',
    isEasyCount: false,
    easyCountUnitQty: '1'
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreateProduct({
      name: form.name,
      unit: form.unit,
      containerType: form.containerType,
      containerSize: Number(form.containerSize || 0),
      containerUnit: form.containerUnit,
      parLevel: Number(form.parLevel || 0),
      reorderPoint: Number(form.reorderPoint || 0),
      isEasyCount: form.isEasyCount,
      easyCountUnitQty: Number(form.easyCountUnitQty || 1)
    });
    setForm({ ...form, name: '', parLevel: '0', reorderPoint: '0' });
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2>Produkt hinzufügen</h2>
      <label>
        Produktname
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <div className="form-grid">
        <label>
          Gebinde
          <select value={form.containerType} onChange={(event) => setForm({ ...form, containerType: event.target.value })}>
            <option>Fass</option>
            <option>Flasche</option>
            <option>Kiste</option>
            <option>Stück</option>
            <option>Karton</option>
            <option>Packung</option>
          </select>
        </label>
        <label>
          Größe
          <input type="number" min="0" step="0.001" value={form.containerSize} onChange={(event) => setForm({ ...form, containerSize: event.target.value })} />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Größen-Einheit
          <select value={form.containerUnit} onChange={(event) => setForm({ ...form, containerUnit: event.target.value })}>
            <option>Liter</option>
            <option>Milliliter</option>
            <option>Stück</option>
            <option>Kilogramm</option>
            <option>Gramm</option>
          </select>
        </label>
        <label>
          Zähleinheit
          <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required />
        </label>
      </div>
      <label>
        Zielbestand
        <input type="number" min="0" step="0.001" value={form.parLevel} onChange={(event) => setForm({ ...form, parLevel: event.target.value })} />
      </label>
      <label>
        Nachbestellen ab
        <input type="number" min="0" step="0.001" value={form.reorderPoint} onChange={(event) => setForm({ ...form, reorderPoint: event.target.value })} />
      </label>
      <label className="check-row compact">
        <input type="checkbox" checked={form.isEasyCount} onChange={(event) => setForm({ ...form, isEasyCount: event.target.checked })} />
        <span>Easy Count</span>
      </label>
      {form.isEasyCount && (
        <label>
          Menge pro Punkt
          <input type="number" min="0" step="0.001" value={form.easyCountUnitQty} onChange={(event) => setForm({ ...form, easyCountUnitQty: event.target.value })} />
        </label>
      )}
      <button className="primary-button" type="submit">
        <Plus size={18} />
        Produkt speichern
      </button>
    </form>
  );
}

function ProductEditor({
  products,
  onUpdateProduct
}: {
  products: Product[];
  onUpdateProduct: (productId: string, data: ProductFormData) => void;
}) {
  const [editingProductId, setEditingProductId] = useState('');
  const [form, setForm] = useState(() => productToForm(products[0]));

  function startEditing(product: Product) {
    setEditingProductId(product.id);
    setForm(productToForm(product));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editingProductId) {
      return;
    }

    onUpdateProduct(editingProductId, {
      name: form.name,
      unit: form.unit,
      containerType: form.containerType,
      containerSize: Number(form.containerSize || 0),
      containerUnit: form.containerUnit,
      parLevel: Number(form.parLevel || 0),
      reorderPoint: Number(form.reorderPoint || 0),
      isEasyCount: form.isEasyCount,
      easyCountUnitQty: Number(form.easyCountUnitQty || 1)
    });
    setEditingProductId('');
  }

  return (
    <section className="section">
      <h2>Produkte bearbeiten</h2>
      <div className="count-list">
        {products.length === 0 && <EmptyState text="Noch keine Produkte angelegt." />}
        {products.map((product) => (
          <article className="product-edit-row" key={product.id}>
            {editingProductId === product.id ? (
              <form className="inline-edit-form" onSubmit={submit}>
                <label>
                  Produktname
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>
                <div className="form-grid">
                  <label>
                    Gebinde
                    <select value={form.containerType} onChange={(event) => setForm({ ...form, containerType: event.target.value })}>
                      <option>Fass</option>
                      <option>Flasche</option>
                      <option>Kiste</option>
                      <option>Stück</option>
                      <option>Karton</option>
                      <option>Packung</option>
                    </select>
                  </label>
                  <label>
                    Größe
                    <input type="number" min="0" step="0.001" value={form.containerSize} onChange={(event) => setForm({ ...form, containerSize: event.target.value })} />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Größen-Einheit
                    <select value={form.containerUnit} onChange={(event) => setForm({ ...form, containerUnit: event.target.value })}>
                      <option>Liter</option>
                      <option>Milliliter</option>
                      <option>Stück</option>
                      <option>Kilogramm</option>
                      <option>Gramm</option>
                    </select>
                  </label>
                  <label>
                    Zähleinheit
                    <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Zielbestand
                    <input type="number" min="0" step="0.001" value={form.parLevel} onChange={(event) => setForm({ ...form, parLevel: event.target.value })} />
                  </label>
                  <label>
                    Nachbestellen ab
                    <input type="number" min="0" step="0.001" value={form.reorderPoint} onChange={(event) => setForm({ ...form, reorderPoint: event.target.value })} />
                  </label>
                </div>
                <label className="check-row compact">
                  <input type="checkbox" checked={form.isEasyCount} onChange={(event) => setForm({ ...form, isEasyCount: event.target.checked })} />
                  <span>Easy Count</span>
                </label>
                {form.isEasyCount && (
                  <label>
                    Menge pro Punkt
                    <input type="number" min="0" step="0.001" value={form.easyCountUnitQty} onChange={(event) => setForm({ ...form, easyCountUnitQty: event.target.value })} />
                  </label>
                )}
                <div className="button-row">
                  <button className="primary-button" type="submit">
                    <Check size={18} />
                    Speichern
                  </button>
                  <button className="text-button" type="button" onClick={() => setEditingProductId('')}>
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatPackage(product)} · Ziel {formatNullableAmount(product.parLevel)} {formatUnitLabel(product.unit)}</span>
                  {product.isEasyCount && <small>Easy Count: {formatPointDefinition(product)}</small>}
                </div>
                <button className="text-button compact-button" type="button" onClick={() => startEditing(product)} aria-label={`${product.name} bearbeiten`}>
                  <Pencil size={17} />
                  Bearbeiten
                </button>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function EmployeeForm({
  employees,
  onCreateEmployee
}: {
  employees: Employee[];
  onCreateEmployee: (data: Omit<Employee, 'id'>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    weeklyHours: '0',
    canConfigureProducts: false,
    canManageEmployees: false,
    canManageLists: false,
    canManageSchedule: false,
    canUseEasyCount: false,
    isActive: true
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreateEmployee({
      ...form,
      weeklyHours: Number(form.weeklyHours || 0)
    });
    setForm({
      name: '',
      email: '',
      phone: '',
      weeklyHours: '0',
      canConfigureProducts: false,
      canManageEmployees: false,
      canManageLists: false,
      canManageSchedule: false,
      canUseEasyCount: false,
      isActive: true
    });
  }

  return (
    <section className="section">
      <form className="form-card" onSubmit={submit}>
        <h2>Mitarbeiter hinzufügen</h2>
        <label>
          Name
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <div className="form-grid">
          <label>
            E-Mail
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Telefon
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
        </div>
        <label>
          Stunden pro Woche
          <input type="number" min="0" step="1" value={form.weeklyHours} onChange={(event) => setForm({ ...form, weeklyHours: event.target.value })} />
        </label>
        <div className="permission-grid">
          <PermissionToggle label="Produkte konfigurieren" checked={form.canConfigureProducts} onChange={(checked) => setForm({ ...form, canConfigureProducts: checked })} />
          <PermissionToggle label="Mitarbeiter bearbeiten" checked={form.canManageEmployees} onChange={(checked) => setForm({ ...form, canManageEmployees: checked })} />
          <PermissionToggle label="Listen erstellen, bearbeiten" checked={form.canManageLists} onChange={(checked) => setForm({ ...form, canManageLists: checked })} />
          <PermissionToggle label="Dienstplanung" checked={form.canManageSchedule} onChange={(checked) => setForm({ ...form, canManageSchedule: checked })} />
          <PermissionToggle label="Einfache Nachbonnage" checked={form.canUseEasyCount} onChange={(checked) => setForm({ ...form, canUseEasyCount: checked })} />
        </div>
        <button className="primary-button" type="submit">
          <Users size={18} />
          Mitarbeiter speichern
        </button>
      </form>
      <div className="count-list">
        {employees.length === 0 && <EmptyState text="Noch keine Mitarbeiter angelegt." />}
        {employees.map((employee) => (
          <article className="employee-row" key={employee.id}>
            <div>
              <strong>{employee.name}</strong>
              <span>{employee.email || employee.phone || 'Kein Kontakt hinterlegt'} · {employee.weeklyHours || 0} h/Woche</span>
            </div>
            <small>{employee.canManageSchedule ? 'Dienstplanung' : employee.canUseEasyCount ? 'EasyCount erlaubt' : 'Basis'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function PermissionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="check-row compact">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Schedule({
  month,
  shifts,
  vacations,
  employees,
  onMonthChange,
  onCreateShift,
  onCreateVacation,
  onCreateEmployee
}: {
  month: Date;
  shifts: Shift[];
  vacations: Vacation[];
  employees: Employee[];
  onMonthChange: (month: Date) => void;
  onCreateShift: (data: { employeeId: string; date: string; startsAt: string; endsAt: string; title: string }) => void;
  onCreateVacation: (data: { employeeId: string; startsOn: string; endsOn: string; note: string }) => void;
  onCreateEmployee: (data: Omit<Employee, 'id'>) => void;
}) {
  const [shiftForm, setShiftForm] = useState({
    employeeId: employees[0]?.id ?? '',
    date: formatDateInput(new Date()),
    startsAt: '18:00',
    endsAt: '23:00',
    title: 'Dienst'
  });
  const [vacationForm, setVacationForm] = useState({
    employeeId: employees[0]?.id ?? '',
    startsOn: formatDateInput(new Date()),
    endsOn: formatDateInput(new Date()),
    note: ''
  });
  const calendarDays = useMemo(() => buildMonthGrid(month), [month]);
  const schedulingEmployees = employees.filter((employee) => employee.canManageSchedule);

  useEffect(() => {
    if (employees[0] && !shiftForm.employeeId) {
      setShiftForm((current) => ({ ...current, employeeId: employees[0].id }));
    }
    if (employees[0] && !vacationForm.employeeId) {
      setVacationForm((current) => ({ ...current, employeeId: employees[0].id }));
    }
  }, [employees, shiftForm.employeeId, vacationForm.employeeId]);

  function submitShift(event: FormEvent) {
    event.preventDefault();
    const employeeId = shiftForm.employeeId || employees[0]?.id;
    if (!employeeId) {
      return;
    }

    onCreateShift({ ...shiftForm, employeeId });
  }

  function submitVacation(event: FormEvent) {
    event.preventDefault();
    const employeeId = vacationForm.employeeId || employees[0]?.id;
    if (!employeeId) {
      return;
    }

    onCreateVacation({ ...vacationForm, employeeId });
  }

  return (
    <section className="section">
      <div className="calendar-header">
        <button className="icon-button secondary" type="button" aria-label="Voriger Monat" onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft size={20} />
        </button>
        <h2>{month.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}</h2>
        <button className="icon-button secondary" type="button" aria-label="Nächster Monat" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-grid">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
          <div className="calendar-weekday" key={day}>{day}</div>
        ))}
        {calendarDays.map((day) => {
          const dayKey = formatDateInput(day);
          const dayShifts = shifts
            .filter((shift) => formatDateInput(new Date(shift.startsAt)) === dayKey)
            .slice(0, 3);
          const hiddenShiftCount = Math.max(0, shifts.filter((shift) => formatDateInput(new Date(shift.startsAt)) === dayKey).length - 3);
          const dayVacations = vacations.filter((vacation) => dateInRange(dayKey, vacation.startsOn, vacation.endsOn));

          return (
            <article className={day.getMonth() === month.getMonth() ? 'calendar-day' : 'calendar-day muted'} key={dayKey}>
              <div className="calendar-date">
                <strong>{day.getDate()}</strong>
                {dayVacations.length > 0 && <span title={dayVacations.map((vacation) => vacation.employee.name).join(', ')}><Plane size={13} /> {dayVacations.length}</span>}
              </div>
              <div className="shift-chip-list">
                {dayShifts.map((shift) => (
                  <div className="shift-chip" key={shift.id}>
                    <strong>{firstName(shift.employee?.name ?? shift.title)}</strong>
                    <span>{formatTime(shift.startsAt)}</span>
                  </div>
                ))}
                {hiddenShiftCount > 0 && <small>+{hiddenShiftCount} weitere</small>}
              </div>
            </article>
          );
        })}
      </div>

      <EmployeeForm employees={employees} onCreateEmployee={onCreateEmployee} />

      <form className="form-card" onSubmit={submitShift}>
        <h2>Dienst eintragen</h2>
        <label>
          Mitarbeiter
          <select value={shiftForm.employeeId} onChange={(event) => setShiftForm({ ...shiftForm, employeeId: event.target.value })}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} ({employee.weeklyHours || 0} h/Woche)</option>
            ))}
          </select>
        </label>
        <div className="form-grid three">
          <label>
            Datum
            <input type="date" value={shiftForm.date} onChange={(event) => setShiftForm({ ...shiftForm, date: event.target.value })} />
          </label>
          <label>
            Start
            <input type="time" value={shiftForm.startsAt} onChange={(event) => setShiftForm({ ...shiftForm, startsAt: event.target.value })} />
          </label>
          <label>
            Ende
            <input type="time" value={shiftForm.endsAt} onChange={(event) => setShiftForm({ ...shiftForm, endsAt: event.target.value })} />
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={employees.length === 0}>
          <CalendarDays size={18} />
          Dienst speichern
        </button>
      </form>

      <form className="form-card" onSubmit={submitVacation}>
        <h2>Urlaub eintragen</h2>
        <label>
          Mitarbeiter
          <select value={vacationForm.employeeId} onChange={(event) => setVacationForm({ ...vacationForm, employeeId: event.target.value })}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Von
            <input type="date" value={vacationForm.startsOn} onChange={(event) => setVacationForm({ ...vacationForm, startsOn: event.target.value })} />
          </label>
          <label>
            Bis
            <input type="date" value={vacationForm.endsOn} onChange={(event) => setVacationForm({ ...vacationForm, endsOn: event.target.value })} />
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={employees.length === 0}>
          <Plane size={18} />
          Urlaub speichern
        </button>
      </form>

      {schedulingEmployees.length > 0 && (
        <section className="section">
          <h2>Urlaubskalender</h2>
          <div className="count-list">
            {vacations.length === 0 && <EmptyState text="Keine Urlaube in diesem Monat." />}
            {vacations.map((vacation) => (
              <article className="employee-row" key={vacation.id}>
                <div>
                  <strong>{vacation.employee.name}</strong>
                  <span>{formatShortDate(vacation.startsOn)} bis {formatShortDate(vacation.endsOn)}</span>
                </div>
                <small>{vacation.note || 'Urlaub'}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function Checklists() {
  return (
    <section className="section">
      <h2>Closing</h2>
      <div className="action-list">
        {checklistItems.map((item) => (
          <label className="check-row" key={item}>
            <input type="checkbox" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function formatPackage(product: Product) {
  const size = Number(product.containerSize ?? 0);
  const formattedSize = size > 0 ? ` ${Number.isInteger(size) ? size : size.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}` : '';
  const unit = product.containerUnit ? ` ${formatUnitLabel(product.containerUnit)}` : '';
  return `${product.containerType ?? 'Stück'}${formattedSize}${unit}`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatNullableAmount(value: Product[keyof Product]) {
  const amount = Number(value ?? 0);
  return formatAmount(amount);
}

function productToForm(product?: Product) {
  return {
    name: product?.name ?? '',
    unit: formatUnitLabel(product?.unit ?? 'Stück'),
    containerType: product?.containerType ?? 'Stück',
    containerSize: String(product?.containerSize ?? '1'),
    containerUnit: formatUnitLabel(product?.containerUnit ?? 'Stück'),
    parLevel: String(product?.parLevel ?? '0'),
    reorderPoint: String(product?.reorderPoint ?? '0'),
    isEasyCount: product?.isEasyCount ?? false,
    easyCountUnitQty: String(product?.easyCountUnitQty ?? '1')
  };
}

function formatUnitLabel(unit?: string | number | null) {
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

function formatPointDefinition(product: Product) {
  const unitQty = Number(product.easyCountUnitQty ?? 1) || 1;
  const unit = formatUnitLabel(product.unit);
  if (unit === 'Milliliter' && unitQty === 100) {
    return '1 Punkt = 100 ml';
  }
  if (unit === 'Liter' && Math.abs(unitQty - 0.125) < 0.001) {
    return '1 Punkt = 1/8 Liter';
  }
  if (unit === 'Milliliter' && unitQty === 20) {
    return '1 Punkt = 2 cl';
  }
  return `1 Punkt = ${formatAmount(unitQty)} ${unit}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function buildMonthGrid(month: Date) {
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

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function dateInRange(day: string, startsOn: string, endsOn: string) {
  return day >= startsOn.slice(0, 10) && day <= endsOn.slice(0, 10);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
