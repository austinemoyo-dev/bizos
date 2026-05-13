# BizOS Frontend — Claude Code Master Prompt
**Dash & Co. Business + Personal Finance Operating System**
**Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Dexie.js + Zustand + Framer Motion**

---

## INSTRUCTIONS FOR AI AGENT

You are building the complete frontend for BizOS. Read this entire document before writing a single line of code. The backend API is already built and running. Your job is to build the UI that consumes it. Follow every specification exactly. Reference DESIGN.md for all visual decisions.

---

## PROJECT STRUCTURE TO CREATE

```
bizos-frontend/
├── public/
│   ├── manifest.json          ← PWA manifest
│   └── icons/                 ← PWA icons (192, 512)
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← root layout, font imports, providers
│   │   ├── globals.css         ← CSS variables from DESIGN.md, base styles
│   │   ├── (app)/              ← authenticated route group
│   │   │   ├── layout.tsx      ← AppShell (sidebar + main)
│   │   │   ├── business/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── repairs/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── sales/page.tsx
│   │   │   │   ├── expenses/page.tsx
│   │   │   │   ├── investments/page.tsx
│   │   │   │   ├── tithe/page.tsx
│   │   │   │   └── market-list/page.tsx
│   │   │   ├── personal/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── transactions/page.tsx
│   │   │   │   ├── food-vendor/page.tsx
│   │   │   │   ├── savings/page.tsx
│   │   │   │   └── tithe/page.tsx
│   │   │   └── reports/page.tsx
│   │   ├── login/page.tsx
│   │   └── page.tsx            ← redirect to /business/dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ScopeSwitcher.tsx
│   │   │   └── MobileTabBar.tsx
│   │   ├── shared/
│   │   │   ├── StatWidget.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SlidePanel.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── SyncIndicator.tsx
│   │   │   ├── CurrencyInput.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── business/
│   │   │   ├── RepairJobCard.tsx
│   │   │   ├── RepairJobForm.tsx
│   │   │   ├── JobDetailPanel.tsx
│   │   │   ├── AddPartForm.tsx
│   │   │   ├── InventoryItemForm.tsx
│   │   │   ├── SaleForm.tsx
│   │   │   └── TitheCard.tsx
│   │   ├── personal/
│   │   │   ├── FoodVendorForm.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   └── SavingsGoalCard.tsx
│   │   └── charts/
│   │       ├── RevenueAreaChart.tsx
│   │       ├── ExpensePieChart.tsx
│   │       ├── ProfitBarChart.tsx
│   │       └── FoodVendorBarChart.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts       ← base fetch wrapper with auth
│   │   │   ├── inventory.ts
│   │   │   ├── repairs.ts
│   │   │   ├── sales.ts
│   │   │   ├── expenses.ts
│   │   │   ├── investments.ts
│   │   │   ├── tithe.ts
│   │   │   ├── personal.ts
│   │   │   ├── food-vendor.ts
│   │   │   └── analytics.ts
│   │   ├── db/
│   │   │   └── dexie.ts        ← IndexedDB schema
│   │   ├── sync/
│   │   │   └── syncQueue.ts    ← offline queue + flush
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── inventoryStore.ts
│   │   │   ├── repairStore.ts
│   │   │   └── uiStore.ts      ← toast, modals, loading
│   │   ├── hooks/
│   │   │   ├── useOnlineStatus.ts
│   │   │   ├── useSync.ts
│   │   │   └── useDebounce.ts
│   │   ├── format.ts           ← currency, date formatting
│   │   └── motion-variants.ts  ← Framer Motion variants
│   └── types/
│       ├── api.ts              ← response types matching backend schemas
│       └── local.ts            ← Dexie local types
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "framer-motion": "^11",
    "zustand": "^4.5",
    "dexie": "^3.2",
    "dexie-react-hooks": "^1.1",
    "recharts": "^2.12",
    "lucide-react": "^0.383",
    "@tanstack/react-query": "^5",
    "clsx": "^2",
    "date-fns": "^3"
  }
}
```

---

## GLOBALS.CSS (COMPLETE)

Paste the entire CSS variables block from DESIGN.md into globals.css. Additionally include:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

html { font-family: var(--font-ui); font-size: 16px; }

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }

/* Focus ring */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Number inputs remove arrows */
input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## NEXT.CONFIG.JS (PWA)

```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } }
    },
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
```

Add `next-pwa` to dependencies.

---

## API CLIENT (lib/api/client.ts)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!skipAuth) {
    const token = localStorage.getItem('access_token');
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    // Attempt token refresh
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return request<T>(endpoint, options);
    }
    // Redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail ?? 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return true;
  } catch { return false; }
}

export const api = {
  get: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'GET', ...opts }),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { method: 'DELETE', ...opts }),
};
```

---

## DEXIE OFFLINE DATABASE (lib/db/dexie.ts)

```typescript
import Dexie, { Table } from 'dexie';

export interface LocalItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  purchase_price: number;
  selling_price?: number;
  quantity_in_stock: number;
  reorder_level: number;
  supplier?: string;
  is_active: boolean;
  updated_at: string;
}

export interface LocalRepairJob {
  id: string;
  job_number: number;
  customer_name: string;
  customer_phone?: string;
  device_type: string;
  device_model?: string;
  fault_description?: string;
  labor_charge: number;
  total_charge: number;
  status: string;
  received_at: string;
  delivered_at?: string;
  updated_at: string;
}

export interface LocalSale {
  id: string;
  item_id: string;
  customer?: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  sold_at: string;
}

export interface LocalExpense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
}

export interface LocalPersonalTx {
  id: string;
  type: 'income' | 'expense' | 'savings';
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
}

export interface LocalFoodCredit {
  id: string;
  vendor_name: string;
  meal_description?: string;
  amount: number;
  purchase_date: string;
  paid: boolean;
  paid_at?: string;
}

export interface PendingSync {
  id?: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: object;
  optimistic_id?: string; // local ID before server confirms
  created_at: number;
  retries: number;
}

export class BizOSDatabase extends Dexie {
  items!: Table<LocalItem>;
  repairJobs!: Table<LocalRepairJob>;
  sales!: Table<LocalSale>;
  expenses!: Table<LocalExpense>;
  personalTx!: Table<LocalPersonalTx>;
  foodCredits!: Table<LocalFoodCredit>;
  pendingSync!: Table<PendingSync>;

  constructor() {
    super('BizOSDB');
    this.version(1).stores({
      items:       'id, name, category, quantity_in_stock, is_active',
      repairJobs:  'id, job_number, status, customer_name, received_at',
      sales:       'id, item_id, sold_at',
      expenses:    'id, category, expense_date',
      personalTx:  'id, type, category, transaction_date',
      foodCredits: 'id, vendor_name, paid, purchase_date',
      pendingSync: '++id, endpoint, created_at',
    });
  }
}

export const db = new BizOSDatabase();
```

---

## SYNC QUEUE (lib/sync/syncQueue.ts)

```typescript
import { db, PendingSync } from '@/lib/db/dexie';

export async function queueMutation(
  endpoint: string,
  method: PendingSync['method'],
  payload?: object,
  optimistic_id?: string
): Promise<void> {
  await db.pendingSync.add({
    endpoint,
    method,
    payload,
    optimistic_id,
    created_at: Date.now(),
    retries: 0,
  });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('bizos-sync');
    } catch (_) { /* background sync not supported, will flush manually */ }
  }
}

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  const token = localStorage.getItem('access_token');
  if (!token) return { synced: 0, failed: 0 };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
  const pending = await db.pendingSync.orderBy('created_at').toArray();

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.retries >= 5) {
      await db.pendingSync.delete(item.id!);
      failed++;
      continue;
    }

    try {
      const res = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Success or client error (don't retry 4xx)
        await db.pendingSync.delete(item.id!);
        if (res.ok) synced++;
        else failed++;
      } else {
        await db.pendingSync.update(item.id!, { retries: item.retries + 1 });
        failed++;
      }
    } catch {
      // Still offline
      break;
    }
  }

  return { synced, failed };
}

export async function getPendingCount(): Promise<number> {
  return db.pendingSync.count();
}
```

---

## ZUSTAND STORES

### lib/stores/authStore.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'bizos-auth', partialize: (s) => ({ user: s.user }) }
  )
);
```

### lib/stores/uiStore.ts

```typescript
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface UIState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (n: number) => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  activeScope: 'business' | 'personal';
  setActiveScope: (scope: 'business' | 'personal') => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pendingSyncCount: 0,
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),
  isOnline: true,
  setIsOnline: (v) => set({ isOnline: v }),
  activeScope: 'business',
  setActiveScope: (scope) => set({ activeScope: scope }),
}));
```

---

## FORMAT UTILITIES (lib/format.ts)

```typescript
export const formatNaira = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(num);
};

export const formatCompact = (amount: number): string => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return formatNaira(amount);
};

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date(date));

export const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));

export const formatProfit = (profit: number) => ({
  formatted: formatNaira(Math.abs(profit)),
  isPositive: profit >= 0,
  sign: profit >= 0 ? '+' : '-',
  label: profit >= 0 ? 'Profit' : 'Loss',
  color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
  bgColor: profit >= 0 ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
});

export const calcProfit = (revenue: number, expenses: number) => revenue - expenses;
export const calcTithe = (profit: number) => profit > 0 ? profit * 0.10 : 0;
```

---

## FRAMER MOTION VARIANTS (lib/motion-variants.ts)

```typescript
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const slideRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};
```

---

## KEY COMPONENT SPECIFICATIONS

### StatWidget.tsx

```tsx
interface StatWidgetProps {
  label: string;
  value: string;            // pre-formatted with formatNaira
  change?: string;          // "↑ +12% vs last week"
  changePositive?: boolean; // green or red for change
  accent?: 'profit' | 'loss' | 'warning' | 'neutral' | 'investment';
  icon?: React.ReactNode;
  loading?: boolean;
}
```

Render rules:
- Use Space Mono for the value (large, ~2rem)
- Left accent line: profit=green, loss=red, warning=amber, neutral=blue, investment=purple
- If loading=true: render Skeleton shimmer instead of value
- Hover: translateY(-1px), border brightens slightly
- Animate value with Framer Motion fadeUp on mount

### DataTable.tsx

```tsx
interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;        // right-align, mono font
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
}
```

Render rules:
- If loading: show 5 skeleton rows
- If data is empty: render EmptyState component
- Row hover: bg-overlay transition
- Numeric columns: font-mono, text-right
- Clickable rows: cursor-pointer

### SlidePanel.tsx

```tsx
interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: number;  // default 480
  children: React.ReactNode;
}
```

Render rules:
- Slides in from right (see slideRight variant)
- Dark overlay behind (bg-base at 60% opacity)
- Close on overlay click and Escape key
- Header: title + close button (X)
- Body: scrollable content
- Fixed at right edge, full height

### Badge.tsx

```tsx
type BadgeVariant =
  | 'received' | 'diagnosed' | 'in_progress' | 'completed' | 'delivered'
  | 'paid' | 'unpaid' | 'overdue'
  | 'profit' | 'loss';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;  // overrides default label
}
```

### CurrencyInput.tsx

```tsx
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}
```

Render rules:
- Prefix: "₦" in a styled input-group-prefix
- Input: font-mono, text-right
- Formats with commas as user types
- Returns raw number to onChange

---

## PAGE SPECIFICATIONS

### Business Dashboard (/business/dashboard)

Fetch on mount:
- `GET /analytics/business/summary?period_start=&period_end=` (default: this month)
- `GET /inventory/low-stock` (for alert count)
- `GET /repairs?status=received,diagnosed,in_progress&limit=5` (pending jobs)
- `GET /tithe?paid=false&scope=business` (unpaid tithe)
- `GET /analytics/business/revenue-trend` (chart data, last 7 days)
- `GET /analytics/business/expense-breakdown` (pie chart)

Layout: exactly as specified in DESIGN.md Section 6.2

Stat widgets (row 1):
1. Total Revenue → accent=neutral
2. Total Expenses → accent=loss
3. Net Profit → accent=profit or loss depending on sign
4. Available Balance → accent=profit

Stat widgets (row 2):
5. Tithe Due (unpaid total) → accent=warning, click → /business/tithe
6. Pending Jobs count → accent=neutral, click → /business/repairs
7. Inventory Value → accent=neutral
8. Low Stock Count → accent=warning (red if >5), click → /business/inventory?filter=low_stock

Period selector: [This Week] [This Month] [This Year] [Custom Range]

Charts:
- Area chart: revenue vs expenses over selected period
- Donut chart: expense breakdown by category

Recent jobs table: last 5 repair jobs with status badges, click → job detail panel

### Repairs Page (/business/repairs)

State:
- activeTab: 'all' | 'received' | 'diagnosed' | 'in_progress' | 'completed' | 'delivered'
- selectedJobId: string | null (drives SlidePanel open state)
- searchQuery: string
- filters: { device_type: string, date_from: string, date_to: string }

On tab change: fetch `GET /repairs?status={tab}&q={search}&...`

Table columns: Job # | Customer | Device | Model | Status | Charge | Date | →
- Row click: open JobDetailPanel (SlidePanel) with that job's id
- Status column: render Badge component

New Job button: opens Modal with RepairJobForm

### Job Detail Panel

Fetch on open: `GET /repairs/{id}` (includes parts array)

Display:
- Job header: #number, status badge, device type
- Customer info: name + phone (tap-to-call link on mobile)
- Fault description
- Parts table: name, qty, cost, damaged toggle icon
- Add Part button (disabled if status=completed/delivered)
- Financial summary: revenue, parts cost, labor, profit (color-coded)
- Tithe due from this job
- Status progression buttons (context-aware: shows next logical status only)

Status change: `PATCH /repairs/{id}/status`

Add part: opens nested modal with AddPartForm
- Item search: autocomplete hitting `GET /inventory/search?q=`
- Quantity, cost fields
- Damaged toggle: if toggled, show amber warning "This will create a loss record"

### Inventory Page (/business/inventory)

Tabs: All Items | Low Stock

Table columns: Name | SKU | Category | Stock | Reorder | Purchase Price | Selling Price | Actions
- Low stock rows: amber text on stock number
- Actions: Edit button → SlidePanel with edit form; Restock button → quick modal

Add Item button: Modal with InventoryItemForm

Restock modal fields: Quantity to add, Unit cost paid

### Food Vendor Page (/personal/food-vendor)

Three stat cards: Outstanding Debt | This Week Total | Daily Average

Unpaid credits list grouped by day (most recent first):
- Each item: date, meal description, amount, vendor name
- Checkbox on each item for bulk selection

"Mark All Paid" button → calls `POST /food-vendor/pay` with all unpaid IDs
Confirmation modal before payment

Payment history section below: grouped payments, each showing amount + date

Add Meal button: FoodVendorForm modal
- Vendor name (text, with datalist of recent vendors)
- Date (default today)
- Meal description
- Amount (CurrencyInput)

### Reports Page (/reports)

Cards for each report type:
- P&L Report | Inventory Report | Repair Report | Personal Finance Report

Each card: description, period selector, [Download JSON] button
- On click: fetch appropriate endpoint, trigger browser download

---

## ONLINE/OFFLINE HANDLING

```typescript
// hooks/useOnlineStatus.ts
import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { flushSyncQueue } from '@/lib/sync/syncQueue';

export function useOnlineStatus() {
  const { setIsOnline, addToast } = useUIStore();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      addToast({ type: 'info', title: 'Back online', message: 'Syncing pending changes...' });
      const result = await flushSyncQueue();
      if (result.synced > 0) {
        addToast({ type: 'success', title: `${result.synced} changes synced` });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast({ type: 'warning', title: 'Offline mode', message: 'Changes will sync when reconnected.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}
```

When offline:
- All write operations: first write to Dexie, then queue to pendingSync
- All read operations: read from Dexie (stale data, acceptable)
- Show OfflineBanner at top of screen
- SyncIndicator in sidebar footer shows pending count

---

## TOAST SYSTEM

```tsx
// components/shared/Toast.tsx
// Uses useUIStore toasts array
// Renders fixed bottom-right stack
// Auto-removes after 4s (errors: 6s)
// AnimatePresence from framer-motion for enter/exit
// Max 3 visible at once (queue the rest)
```

Use toast throughout the app:
- Successful form submit: `addToast({ type: 'success', title: 'Job created' })`
- API error: `addToast({ type: 'error', title: 'Failed', message: error.message })`
- Tithe paid: `addToast({ type: 'success', title: 'Tithe marked as paid', message: 'Expense recorded.' })`
- Low stock (on inventory load if items exist): `addToast({ type: 'warning', title: `${count} items low on stock` })`

---

## PWA MANIFEST (public/manifest.json)

```json
{
  "name": "BizOS — Dash & Co.",
  "short_name": "BizOS",
  "description": "Business + Personal Finance Operating System",
  "start_url": "/business/dashboard",
  "display": "standalone",
  "background_color": "#0A0C10",
  "theme_color": "#0A0C10",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## MOBILE BOTTOM TAB BAR (< 768px)

Replace sidebar with bottom tab bar on mobile:

Tabs: [Business] [Repairs] [Inventory] [Personal] [More]

"More" opens a full-screen drawer with remaining nav items.

Fixed at bottom, height 64px + CSS env(safe-area-inset-bottom).

---

## CHART CONFIGURATIONS

### RevenueAreaChart.tsx

```tsx
// Recharts AreaChart
// X-axis: dates, formatted as "May 5"
// Y-axis: compact naira format (₦50K)
// Two areas: revenue (blue), expenses (red/30% opacity)
// Custom tooltip: glass style, mono font for amounts
// No cartesian grid color from recharts defaults — use var(--border-subtle)
// Responsive container, height 240px
```

### ExpensePieChart.tsx

```tsx
// Recharts PieChart (donut: innerRadius=60)
// Colors per category from CHART_THEME
// Custom legend below chart
// Custom tooltip showing category name + amount + %
// Animate on mount
```

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## TAILWIND CONFIG

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        ui: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        bg: {
          base: '#0A0C10',
          surface: '#111318',
          elevated: '#181C24',
          overlay: '#1E2330',
        },
        border: {
          subtle: '#1F2535',
          default: '#2A3347',
          strong: '#3D4F6B',
        },
        accent: {
          primary: '#3B82F6',
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
          purple: '#8B5CF6',
        },
        text: {
          primary: '#E8EDF5',
          secondary: '#8B96A8',
          muted: '#4A5568',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## WHAT NOT TO BUILD

- Do NOT build the backend
- Do NOT build authentication pages beyond a simple login form
- Do NOT add any AI features
- Do NOT use any UI component library (shadcn, MUI, Chakra) — build all components from scratch using Tailwind + CSS variables
- Do NOT use react-hook-form — use controlled components with useState
- Do NOT use Next.js Image component for external URLs
- Do NOT add features not listed in this document

---

## BUILD ORDER FOR THIS SESSION

1. `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`
2. `public/manifest.json`
3. `src/app/globals.css` (full CSS variables + base styles)
4. `src/app/layout.tsx` (font imports, QueryClientProvider, metadata)
5. `src/lib/format.ts`, `src/lib/motion-variants.ts`
6. `src/types/api.ts`, `src/types/local.ts`
7. `src/lib/api/client.ts`
8. `src/lib/db/dexie.ts`
9. `src/lib/sync/syncQueue.ts`
10. `src/lib/stores/authStore.ts`, `src/lib/stores/uiStore.ts`
11. `src/lib/hooks/` (useOnlineStatus, useSync, useDebounce)
12. Shared components: StatWidget, DataTable, Badge, Modal, SlidePanel, Toast, Skeleton, EmptyState, CurrencyInput, PageHeader, OfflineBanner, SyncIndicator
13. Layout components: AppShell, Sidebar, ScopeSwitcher, MobileTabBar
14. `src/app/login/page.tsx`
15. `src/app/(app)/layout.tsx` (AppShell wrapper, auth guard)
16. Business pages in order: dashboard → repairs → inventory → sales → expenses → investments → tithe → market-list
17. Personal pages in order: dashboard → transactions → food-vendor → savings → tithe
18. Reports page
19. `src/lib/api/` module files (one per resource)

Do not skip steps. Do not combine steps. Build in this exact order.
