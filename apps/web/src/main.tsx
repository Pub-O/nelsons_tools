import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ClipboardCheck,
  Calculator,
  Check,
  Pencil,
  Home,
  ListChecks,
  LogOut,
  Package,
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
  canConfigureProducts: boolean;
  canManageEmployees: boolean;
  canManageLists: boolean;
  canUseEasyCount: boolean;
  isActive: boolean;
};

type EasyCountInput = {
  startingCount: string;
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

const shifts = [
  { name: 'Mia', role: 'Bar', time: '16:00 - 23:00' },
  { name: 'Leon', role: 'Service', time: '18:00 - 01:00' },
  { name: 'Sara', role: 'Close', time: '20:00 - 02:00' }
];

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
    }
  }, [token, activeLocationId]);

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
          next[item.product.id] = next[item.product.id] ?? {
            startingCount: String(currentPoints),
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
          [result.product.id]: { startingCount: '0', targetCount: '0', registerCount: '0' }
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
          [result.product.id]: items[result.product.id] ?? { startingCount: '0', targetCount: '0', registerCount: '0' }
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

  async function saveEasyCount() {
    if (!activeLocationId) {
      setStatus('Bitte zuerst eine Location auswählen.');
      return;
    }

    const lines = easyCountProducts.map((product) => {
      const values = easyCounts[product.id] ?? { startingCount: '0', targetCount: '0', registerCount: '0' };
      return {
        productId: product.id,
        startingCount: Number(values.startingCount || 0),
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

    const lines = products.map((product) => ({
      productId: product.id,
      countedQty: Number(counts[product.id] || 0)
    }));

    if (!lines.length) {
      setStatus('Bitte zuerst ein Produkt anlegen.');
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
        {activeTab === 'dashboard' && <Dashboard lowStock={lowStock} productCount={products.length} />}
        {activeTab === 'stock' && <Stock products={inventory} />}
        {activeTab === 'shopping' && <Shopping lowStock={lowStock} />}
        {activeTab === 'easy-count' && (
          <EasyCount
            products={easyCountProducts}
            values={easyCounts}
            runs={easyCountRuns}
            onChange={(productId, field, value) => setEasyCounts((items) => ({
              ...items,
              [productId]: {
                ...(items[productId] ?? { startingCount: '0', targetCount: '0', registerCount: '0' }),
                [field]: value
              }
            }))}
            onSave={saveEasyCount}
          />
        )}
        {activeTab === 'shifts' && <Shifts />}
        {activeTab === 'checklists' && <Checklists />}
        {activeTab === 'admin' && (
          token ? (
            <AdminPanel
              user={user}
              locations={locations}
              activeLocationId={activeLocationId}
              products={products}
              employees={employees}
              counts={counts}
              onLocationChange={setActiveLocationId}
              onCountChange={(productId, value) => setCounts((items) => ({ ...items, [productId]: value }))}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onCreateEmployee={createEmployee}
              onSaveStockCount={saveStockCount}
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

function Dashboard({ lowStock, productCount }: { lowStock: Array<Product & { current: number; target: number }>; productCount: number }) {
  return (
    <>
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Heute</span>
          <h1>Pub-O</h1>
          <p>{productCount} Produkte, {lowStock.length} niedrige Bestände, Closing-Liste offen.</p>
        </div>
        <ClipboardCheck size={42} />
      </div>

      <div className="metric-grid">
        <Metric label="Produkte" value={String(productCount)} />
        <Metric label="Stock Alerts" value={String(lowStock.length)} />
        <Metric label="Team" value="3" />
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stock({ products }: { products: Array<Product & { current: number; target: number }> }) {
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
                <b>{product.current} {product.unit}</b>
              </div>
              <div className="stock-meter">
                <span style={{ width: `${percentage}%` }} />
              </div>
              <small>Ziel: {product.target || '-'} {product.unit}</small>
            </article>
          );
        })}
      </div>
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
                {Math.max(0, product.target - product.current)} {product.unit} bis Zielbestand
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
          const row = values[product.id] ?? { startingCount: '0', targetCount: '0', registerCount: '0' };
          const target = Number(row.targetCount || 0);
          const register = Number(row.registerCount || 0);
          const difference = target - register;
          const quantityPerPoint = Number(product.easyCountUnitQty ?? 1) || 1;
          const correction = difference * quantityPerPoint;

          return (
            <article className="easy-count-row" key={product.id}>
              <div className="stock-title">
                <div>
                  <strong>{product.name}</strong>
                  <span>1 Punkt = {formatAmount(quantityPerPoint)} {product.unit}</span>
                </div>
                <b>{difference >= 0 ? '+' : ''}{difference} Punkte</b>
              </div>
              <div className="form-grid three">
                <label>
                  Anfang
                  <input type="number" min="0" step="1" value={row.startingCount} onChange={(event) => onChange(product.id, 'startingCount', event.target.value)} />
                </label>
                <label>
                  Sollstand
                  <input type="number" min="0" step="1" value={row.targetCount} onChange={(event) => onChange(product.id, 'targetCount', event.target.value)} />
                </label>
                <label>
                  Kassastand
                  <input type="number" min="0" step="1" value={row.registerCount} onChange={(event) => onChange(product.id, 'registerCount', event.target.value)} />
                </label>
              </div>
              <small>Nachzubonnieren: {formatAmount(correction)} {product.unit}</small>
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
  products,
  employees,
  counts,
  onLocationChange,
  onCountChange,
  onCreateProduct,
  onUpdateProduct,
  onCreateEmployee,
  onSaveStockCount
}: {
  user: SessionUser | null;
  locations: Location[];
  activeLocationId: string;
  products: Product[];
  employees: Employee[];
  counts: Record<string, string>;
  onLocationChange: (locationId: string) => void;
  onCountChange: (productId: string, value: string) => void;
  onCreateProduct: (data: ProductFormData) => void;
  onUpdateProduct: (productId: string, data: ProductFormData) => void;
  onCreateEmployee: (data: Omit<Employee, 'id'>) => void;
  onSaveStockCount: () => void;
}) {
  return (
    <section className="section">
      <h2>Admin</h2>
      <div className="admin-summary">
        <strong>{user?.name ?? 'Admin'}</strong>
        <span>{products.length} Produkte verwaltet</span>
      </div>
      <label className="select-row">
        Standort
        <select value={activeLocationId} onChange={(event) => onLocationChange(event.target.value)}>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </label>
      <ProductForm onCreateProduct={onCreateProduct} />
      <ProductEditor products={products} onUpdateProduct={onUpdateProduct} />
      <EmployeeForm employees={employees} onCreateEmployee={onCreateEmployee} />
      <section className="section">
        <h2>Zählstand</h2>
        <div className="count-list">
          {products.length === 0 && <EmptyState text="Lege zuerst ein Produkt an." />}
          {products.map((product) => (
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

function ProductForm({
  onCreateProduct
}: {
  onCreateProduct: (data: ProductFormData) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    unit: 'Stk',
    containerType: 'Stück',
    containerSize: '1',
    containerUnit: 'Stk',
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
            <option>l</option>
            <option>ml</option>
            <option>Stk</option>
            <option>kg</option>
            <option>g</option>
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
                      <option>l</option>
                      <option>ml</option>
                      <option>Stk</option>
                      <option>kg</option>
                      <option>g</option>
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
                  <span>{formatPackage(product)} · Ziel {formatNullableAmount(product.parLevel)} {product.unit}</span>
                  {product.isEasyCount && <small>Easy Count: 1 Punkt = {formatNullableAmount(product.easyCountUnitQty)} {product.unit}</small>}
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
    canConfigureProducts: false,
    canManageEmployees: false,
    canManageLists: false,
    canUseEasyCount: false,
    isActive: true
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreateEmployee(form);
    setForm({
      name: '',
      email: '',
      phone: '',
      canConfigureProducts: false,
      canManageEmployees: false,
      canManageLists: false,
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
        <div className="permission-grid">
          <PermissionToggle label="Produkte konfigurieren" checked={form.canConfigureProducts} onChange={(checked) => setForm({ ...form, canConfigureProducts: checked })} />
          <PermissionToggle label="Mitarbeiter bearbeiten" checked={form.canManageEmployees} onChange={(checked) => setForm({ ...form, canManageEmployees: checked })} />
          <PermissionToggle label="Listen erstellen, bearbeiten" checked={form.canManageLists} onChange={(checked) => setForm({ ...form, canManageLists: checked })} />
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
              <span>{employee.email || employee.phone || 'Kein Kontakt hinterlegt'}</span>
            </div>
            <small>{employee.canUseEasyCount ? 'EasyCount erlaubt' : 'EasyCount gesperrt'}</small>
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

function Shifts() {
  return (
    <section className="section">
      <h2>Schichten</h2>
      <div className="timeline">
        {shifts.map((shift) => (
          <article className="timeline-row" key={shift.name}>
            <time>{shift.time}</time>
            <div>
              <strong>{shift.name}</strong>
              <span>{shift.role}</span>
            </div>
          </article>
        ))}
      </div>
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
  const unit = product.containerUnit ? ` ${product.containerUnit}` : '';
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
    unit: product?.unit ?? 'Stk',
    containerType: product?.containerType ?? 'Stück',
    containerSize: String(product?.containerSize ?? '1'),
    containerUnit: product?.containerUnit ?? 'Stk',
    parLevel: String(product?.parLevel ?? '0'),
    reorderPoint: String(product?.reorderPoint ?? '0'),
    isEasyCount: product?.isEasyCount ?? false,
    easyCountUnitQty: String(product?.easyCountUnitQty ?? '1')
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
