export type Tab = 'dashboard' | 'stock' | 'shopping' | 'easy-count' | 'shifts' | 'checklists';

export type Product = {
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

export type ProductFormData = {
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

export type StockItem = {
  id: string;
  quantity: string | number;
  product: Product;
};

export type Location = {
  id: string;
  name: string;
  organizationId: string;
};

export type Membership = {
  role: string;
  organization: { id: string; name: string };
  location?: { id: string; name: string } | null;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  memberships?: Membership[];
};

export type Employee = {
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

export type Shift = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  employee?: Employee | null;
};

export type Vacation = {
  id: string;
  startsOn: string;
  endsOn: string;
  note?: string | null;
  employee: Employee;
};

export type EasyCountInput = {
  targetCount: string;
  registerCount: string;
};

export type EasyCountRun = {
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

export type InventoryProduct = Product & { current: number; target: number };
