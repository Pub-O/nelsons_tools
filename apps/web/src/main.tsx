import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
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
import { Checklists } from './modules/checklists/Checklists';
import { coreModules, navigationModules, paidAddonModules } from './modules/catalog';
import { Dashboard } from './modules/dashboard/Dashboard';
import { EmptyState } from './modules/shared/EmptyState';
import { Shopping } from './modules/shopping/Shopping';
import {
  EasyCountInput,
  EasyCountRun,
  Employee,
  Location,
  InventoryProduct,
  Product,
  ProductFormData,
  SessionUser,
  Shift,
  StockItem,
  Tab,
  Vacation
} from './types';
import {
  addMonths,
  buildMonthGrid,
  dateInRange,
  firstName,
  formatAmount,
  formatDateInput,
  formatNullableAmount,
  formatPackage,
  formatPointDefinition,
  formatShortDate,
  formatTime,
  formatUnitLabel,
  productToForm,
  startOfMonth
} from './utils';
import './styles.css';

const apiBase = window.location.hostname === 'int-web.pub-o.com'
  ? 'https://int-api.pub-o.com/api'
  : '/api';

type AppArea = 'app' | 'admin';
type AdminTab = 'overview' | 'modules' | 'products' | 'team' | 'location';

function App() {
  const [activeArea, setActiveArea] = useState<AppArea>('app');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
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
    setActiveArea('admin');
    setActiveAdminTab('overview');
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
    setActiveArea('app');
    setActiveTab('dashboard');
    setActiveAdminTab('overview');
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
          note: 'Zählstand',
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
    <main className={activeArea === 'admin' ? 'app-shell admin-shell' : 'app-shell'}>
      <header className="top-bar">
        <div className="brand-lockup">
          <img src="/img/pub-o-logo.png" alt="" />
          <div>
            <strong>Pub-O</strong>
            <span>{activeArea === 'admin' ? 'Admin Dashboard' : activeLocation?.name ?? 'Pub-Organizer'}</span>
          </div>
        </div>
        <div className="top-actions">
          {activeArea === 'admin' && (
            <button className="text-button compact-button" type="button" onClick={() => setActiveArea('app')}>
              <Home size={17} />
              App
            </button>
          )}
          {activeArea === 'app' && (
            <button className="text-button compact-button" type="button" onClick={() => setActiveArea('admin')}>
              <ShieldCheck size={17} />
              Admin
            </button>
          )}
          {token && (
            <button className="icon-button" aria-label="Abmelden" onClick={logout}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      <section className="content">
        {status && <div className="status-line">{status}</div>}
        {activeArea === 'app' ? (
          <AppWorkspace
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lowStock={lowStock}
            products={inventory}
            productCount={products.length}
            employeeCount={employees.length}
            shiftCount={scheduleShifts.length}
            activeLocationName={activeLocation?.name}
            counts={counts}
            setCounts={setCounts}
            easyCountProducts={easyCountProducts}
            easyCounts={easyCounts}
            setEasyCounts={setEasyCounts}
            easyCountRuns={easyCountRuns}
            scheduleMonth={scheduleMonth}
            scheduleShifts={scheduleShifts}
            vacations={vacations}
            employees={employees}
            setScheduleMonth={setScheduleMonth}
            createShift={createShift}
            createVacation={createVacation}
            saveEasyCount={saveEasyCount}
            saveStockCount={saveStockCount}
          />
        ) : (
          token ? (
            <AdminWorkspace
              activeAdminTab={activeAdminTab}
              setActiveAdminTab={setActiveAdminTab}
              user={user}
              locations={locations}
              activeLocationId={activeLocationId}
              products={products}
              employees={employees}
              onLocationChange={setActiveLocationId}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onCreateEmployee={createEmployee}
            />
          ) : (
            <AuthPanel onAuthenticated={handleAuthenticated} setStatus={setStatus} />
          )
        )}
      </section>

      {activeArea === 'app' && (
        <nav className="bottom-nav" aria-label="Hauptnavigation">
          {navigationModules.map((module) => (
            <NavButton tab={module.id} activeTab={activeTab} label={module.shortLabel} onClick={setActiveTab} key={module.id}>
              {moduleIcon(module.id, 21)}
            </NavButton>
          ))}
        </nav>
      )}
    </main>
  );
}

function AppWorkspace({
  activeTab,
  setActiveTab,
  lowStock,
  products,
  productCount,
  employeeCount,
  shiftCount,
  activeLocationName,
  counts,
  setCounts,
  easyCountProducts,
  easyCounts,
  setEasyCounts,
  easyCountRuns,
  scheduleMonth,
  scheduleShifts,
  vacations,
  employees,
  setScheduleMonth,
  createShift,
  createVacation,
  saveEasyCount,
  saveStockCount
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  lowStock: InventoryProduct[];
  products: InventoryProduct[];
  productCount: number;
  employeeCount: number;
  shiftCount: number;
  activeLocationName?: string;
  counts: Record<string, string>;
  setCounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  easyCountProducts: InventoryProduct[];
  easyCounts: Record<string, EasyCountInput>;
  setEasyCounts: React.Dispatch<React.SetStateAction<Record<string, EasyCountInput>>>;
  easyCountRuns: EasyCountRun[];
  scheduleMonth: Date;
  scheduleShifts: Shift[];
  vacations: Vacation[];
  employees: Employee[];
  setScheduleMonth: (month: Date) => void;
  createShift: (data: { employeeId: string; date: string; startsAt: string; endsAt: string; title: string }) => void;
  createVacation: (data: { employeeId: string; startsOn: string; endsOn: string; note: string }) => void;
  saveEasyCount: () => void;
  saveStockCount: () => void;
}) {
  return (
    <>
      {activeTab === 'dashboard' && (
        <Dashboard
          lowStock={lowStock}
          productCount={productCount}
          employeeCount={employeeCount}
          shiftCount={shiftCount}
          locationName={activeLocationName}
          onOpen={setActiveTab}
        />
      )}
      {activeTab === 'stock' && (
        <Stock
          products={products}
          counts={counts}
          onCountChange={(productId, value) => setCounts((items) => ({ ...items, [productId]: value }))}
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
        />
      )}
      {activeTab === 'checklists' && <Checklists />}
    </>
  );
}

function moduleIcon(tab: Tab, size: number) {
  const icons: Record<Tab, React.ReactNode> = {
    dashboard: <Home size={size} />,
    stock: <Package size={size} />,
    shopping: <ShoppingCart size={size} />,
    'easy-count': <Calculator size={size} />,
    checklists: <ListChecks size={size} />,
    shifts: <CalendarDays size={size} />
  };
  return icons[tab];
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

function Stock({
  products,
  counts,
  onCountChange,
  onSaveStockCount
}: {
  products: InventoryProduct[];
  counts: Record<string, string>;
  onCountChange: (productId: string, value: string) => void;
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

function EasyCount({
  products,
  values,
  runs,
  onChange,
  onSave
}: {
  products: InventoryProduct[];
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
      <form className="form-card" onSubmit={submit} autoComplete={mode === 'login' ? 'on' : 'off'}>
        <label>
          {mode === 'login' ? 'Login E-Mail' : 'E-Mail'}
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete={mode === 'login' ? 'username' : 'off'}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label>
          {mode === 'login' ? 'Login Passwort' : 'Passwort'}
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
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

function AdminWorkspace({
  activeAdminTab,
  setActiveAdminTab,
  user,
  locations,
  activeLocationId,
  products,
  employees,
  onLocationChange,
  onCreateProduct,
  onUpdateProduct,
  onCreateEmployee
}: {
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  user: SessionUser | null;
  locations: Location[];
  activeLocationId: string;
  products: Product[];
  employees: Employee[];
  onLocationChange: (locationId: string) => void;
  onCreateProduct: (data: ProductFormData) => void;
  onUpdateProduct: (productId: string, data: ProductFormData) => void;
  onCreateEmployee: (data: Omit<Employee, 'id'>) => void;
}) {
  const activeLocation = locations.find((location) => location.id === activeLocationId);

  return (
    <section className="admin-workspace">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">Konfiguration</span>
          <h1>Admin Dashboard</h1>
          <p>{activeLocation?.name ?? 'Standort'} verwalten, Module vorbereiten und Betriebsdaten konfigurieren.</p>
        </div>
        <ShieldCheck size={42} />
      </div>

      <nav className="admin-nav" aria-label="Admin Navigation">
        <AdminNavButton tab="overview" activeTab={activeAdminTab} label="Übersicht" onClick={setActiveAdminTab} />
        <AdminNavButton tab="modules" activeTab={activeAdminTab} label="Module & Abo" onClick={setActiveAdminTab} />
        <AdminNavButton tab="products" activeTab={activeAdminTab} label="Produkte" onClick={setActiveAdminTab} />
        <AdminNavButton tab="team" activeTab={activeAdminTab} label="Team" onClick={setActiveAdminTab} />
        <AdminNavButton tab="location" activeTab={activeAdminTab} label="Standort" onClick={setActiveAdminTab} />
      </nav>

      {activeAdminTab === 'overview' && (
        <AdminOverview
          user={user}
          locationName={activeLocation?.name}
          productCount={products.length}
          employeeCount={employees.length}
          onOpen={setActiveAdminTab}
        />
      )}
      {activeAdminTab === 'modules' && <ModulePlanOverview />}
      {activeAdminTab === 'products' && (
        <section className="section">
          <ProductEditor products={products} onUpdateProduct={onUpdateProduct} />
          <ProductForm onCreateProduct={onCreateProduct} />
        </section>
      )}
      {activeAdminTab === 'team' && <EmployeeForm employees={employees} onCreateEmployee={onCreateEmployee} />}
      {activeAdminTab === 'location' && (
        <LocationSettings
          user={user}
          locations={locations}
          activeLocationId={activeLocationId}
          onLocationChange={onLocationChange}
        />
      )}
    </section>
  );
}

function AdminNavButton({
  tab,
  activeTab,
  label,
  onClick
}: {
  tab: AdminTab;
  activeTab: AdminTab;
  label: string;
  onClick: (tab: AdminTab) => void;
}) {
  return (
    <button className={activeTab === tab ? 'active' : ''} type="button" onClick={() => onClick(tab)}>
      {label}
    </button>
  );
}

function AdminOverview({
  user,
  locationName,
  productCount,
  employeeCount,
  onOpen
}: {
  user: SessionUser | null;
  locationName?: string;
  productCount: number;
  employeeCount: number;
  onOpen: (tab: AdminTab) => void;
}) {
  return (
    <section className="section">
      <div className="admin-summary">
        <strong>{user?.name ?? 'Admin'}</strong>
        <span>{locationName ?? 'Kein Standort ausgewählt'} · Zugang aktiv</span>
      </div>
      <div className="admin-config-grid">
        <button className="admin-config-card" type="button" onClick={() => onOpen('modules')}>
          <ShieldCheck size={22} />
          <strong>Module & Abo</strong>
          <span>Basisfunktionen und Add-ons vorbereiten.</span>
        </button>
        <button className="admin-config-card" type="button" onClick={() => onOpen('products')}>
          <Package size={22} />
          <strong>{productCount} Produkte</strong>
          <span>Sortiment, Gebinde und Zielbestände konfigurieren.</span>
        </button>
        <button className="admin-config-card" type="button" onClick={() => onOpen('team')}>
          <Users size={22} />
          <strong>{employeeCount} Teamprofile</strong>
          <span>Rechte und Dienstplan-Zugriff verwalten.</span>
        </button>
        <button className="admin-config-card" type="button" onClick={() => onOpen('location')}>
          <Home size={22} />
          <strong>Standort</strong>
          <span>Aktiven Betrieb und Organisation prüfen.</span>
        </button>
      </div>
    </section>
  );
}

function LocationSettings({
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
      <h2>Standort</h2>
      <div className="admin-summary">
        <strong>{user?.memberships?.[0]?.organization.name ?? 'Organisation'}</strong>
        <span>Standort und Zugang aktiv.</span>
      </div>
      <label className="select-row">
        Aktiver Standort
        <select value={activeLocationId} onChange={(event) => onLocationChange(event.target.value)}>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ModulePlanOverview() {
  return (
    <section className="section">
      <h2>Module & Abo</h2>
      <div className="module-plan-grid">
        <ModulePlanColumn title="Basisfunktionen" modules={coreModules} />
        <ModulePlanColumn title="Paid Add-ons" modules={paidAddonModules} />
      </div>
    </section>
  );
}

function ModulePlanColumn({
  title,
  modules
}: {
  title: string;
  modules: typeof coreModules;
}) {
  return (
    <div className="module-plan-column">
      <strong>{title}</strong>
      <div className="module-list">
        {modules.map((module) => (
          <article className="module-row" key={module.id}>
            <span>{moduleIcon(module.id, 18)}</span>
            <div>
              <strong>{module.label}</strong>
              <small>{module.summary}</small>
            </div>
            <em>{module.tier === 'core' ? 'inkludiert' : 'Add-on'}</em>
          </article>
        ))}
      </div>
    </div>
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
  onCreateVacation
}: {
  month: Date;
  shifts: Shift[];
  vacations: Vacation[];
  employees: Employee[];
  onMonthChange: (month: Date) => void;
  onCreateShift: (data: { employeeId: string; date: string; startsAt: string; endsAt: string; title: string }) => void;
  onCreateVacation: (data: { employeeId: string; startsOn: string; endsOn: string; note: string }) => void;
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
