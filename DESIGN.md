# BizOS — Design System & UI Specification
**Dash & Co. Business + Personal Finance Operating System**
Version 1.0 | For AI Agent Consumption

---

## 1. Design Philosophy

BizOS is a **financial command center**, not a generic dashboard. The aesthetic direction is:

> **"Dark Precision"** — the feeling of a Bloomberg terminal crossed with a luxury watch interface. Dense with information, but never chaotic. Every pixel earns its place.

Tone keywords: **authoritative, structured, efficient, premium, trustworthy**

This is a tool used daily by a business owner who needs instant clarity on their financial state. The UI must reward repeated use — fast to scan, fast to act, zero cognitive overhead.

---

## 2. Color System

```css
:root {
  /* === BACKGROUNDS === */
  --bg-base: #0A0C10;           /* deepest background */
  --bg-surface: #111318;        /* cards, panels */
  --bg-elevated: #181C24;       /* modals, dropdowns */
  --bg-overlay: #1E2330;        /* hover states, selected rows */

  /* === BORDERS === */
  --border-subtle: #1F2535;     /* dividers, card edges */
  --border-default: #2A3347;    /* inputs, table borders */
  --border-strong: #3D4F6B;     /* focused states */

  /* === BRAND / ACCENT === */
  --accent-primary: #3B82F6;    /* blue — primary actions, links */
  --accent-primary-glow: rgba(59, 130, 246, 0.15);
  --accent-green: #10B981;      /* profit, income, success */
  --accent-green-glow: rgba(16, 185, 129, 0.12);
  --accent-red: #EF4444;        /* loss, expense, danger */
  --accent-red-glow: rgba(239, 68, 68, 0.12);
  --accent-amber: #F59E0B;      /* warnings, tithe due, low stock */
  --accent-amber-glow: rgba(245, 158, 11, 0.12);
  --accent-purple: #8B5CF6;     /* investments, personal finance scope */
  --accent-purple-glow: rgba(139, 92, 246, 0.12);

  /* === TEXT === */
  --text-primary: #E8EDF5;      /* headings, key numbers */
  --text-secondary: #8B96A8;    /* labels, descriptions */
  --text-muted: #4A5568;        /* placeholders, disabled */
  --text-inverse: #0A0C10;      /* text on colored buttons */

  /* === SEMANTIC === */
  --color-profit: var(--accent-green);
  --color-loss: var(--accent-red);
  --color-warning: var(--accent-amber);
  --color-investment: var(--accent-purple);
  --color-neutral: #60A5FA;

  /* === GLASS EFFECT === */
  --glass-bg: rgba(24, 28, 36, 0.85);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-blur: blur(12px);
}
```

---

## 3. Typography

```css
/* Import in globals.css */
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');

:root {
  /* Display: Syne — bold, geometric, memorable */
  --font-display: 'Syne', sans-serif;

  /* UI: DM Sans — clean, legible, professional */
  --font-ui: 'DM Sans', sans-serif;

  /* Mono: Space Mono — numbers, codes, financial data */
  --font-mono: 'Space Mono', monospace;

  /* === SCALE === */
  --text-xs: 0.6875rem;    /* 11px */
  --text-sm: 0.8125rem;    /* 13px */
  --text-base: 0.9375rem;  /* 15px */
  --text-md: 1.0625rem;    /* 17px */
  --text-lg: 1.25rem;      /* 20px */
  --text-xl: 1.5rem;       /* 24px */
  --text-2xl: 2rem;        /* 32px */
  --text-3xl: 2.75rem;     /* 44px */
  --text-4xl: 3.5rem;      /* 56px */

  /* === FINANCIAL NUMBERS always use mono === */
  /* Apply font-mono to: balances, amounts, totals, percentages */
}
```

### Typography Rules
- **All currency amounts** → `font-family: var(--font-mono)` — never DM Sans for numbers
- **Dashboard headings** → Syne 700/800
- **Section labels** → DM Sans 500, uppercase, letter-spacing 0.08em, --text-xs, --text-secondary
- **Body text, descriptions** → DM Sans 400, --text-base
- **Status badges, tags** → DM Sans 600, --text-xs
- **Table data** → DM Sans 400, --text-sm; numeric columns → Space Mono

---

## 4. Spacing System

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Layout */
  --sidebar-width: 240px;
  --sidebar-collapsed: 64px;
  --header-height: 56px;
  --content-max: 1400px;
  --card-radius: 12px;
  --input-radius: 8px;
  --badge-radius: 6px;
  --button-radius: 8px;
}
```

---

## 5. Component Library

### 5.1 Cards

```css
/* Base Card */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--card-radius);
  padding: var(--space-6);
}

/* Stat Card (dashboard widgets) */
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--card-radius);
  padding: var(--space-5) var(--space-6);
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.stat-card:hover {
  border-color: var(--border-default);
  transform: translateY(-1px);
}
/* Colored left accent line */
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 12px 0 0 12px;
}
.stat-card.profit::before { background: var(--accent-green); }
.stat-card.loss::before   { background: var(--accent-red); }
.stat-card.warning::before { background: var(--accent-amber); }
.stat-card.neutral::before { background: var(--accent-primary); }

/* Glass Card (modals, overlays) */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--card-radius);
  backdrop-filter: var(--glass-blur);
}
```

### 5.2 Stat Widget (Dashboard)

```tsx
// components/shared/StatWidget.tsx
interface StatWidgetProps {
  label: string;
  value: string;         // pre-formatted: "₦124,500"
  change?: string;       // "+12% vs last week"
  changeType?: 'up' | 'down' | 'neutral';
  accent?: 'profit' | 'loss' | 'warning' | 'neutral' | 'investment';
  icon?: React.ReactNode;
  sublabel?: string;
}
```

Layout inside stat widget:
```
┌─────────────────────────────────┐
│ [icon]  LABEL (uppercase, muted)│
│                                 │
│ ₦124,500.00    (mono, large)    │
│                                 │
│ ↑ +12% vs last week  (small)   │
└─────────────────────────────────┘
```

### 5.3 Buttons

```css
/* Primary */
.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--button-radius);
  padding: var(--space-3) var(--space-5);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--button-radius);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: border-color 0.15s, color 0.15s;
}
.btn-ghost:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

/* Danger */
.btn-danger {
  background: var(--accent-red-glow);
  color: var(--accent-red);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--button-radius);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 600;
}

/* Icon Button */
.btn-icon {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--button-radius);
  color: var(--text-secondary);
  transition: all 0.15s;
}
.btn-icon:hover { color: var(--text-primary); border-color: var(--border-default); }
```

### 5.4 Inputs

```css
.input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.input::placeholder { color: var(--text-muted); }
.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-glow);
}
.input:invalid { border-color: var(--accent-red); }

/* Currency Input — monospace, right-aligned */
.input-currency {
  font-family: var(--font-mono);
  text-align: right;
  letter-spacing: 0.02em;
}

/* Input with prefix label */
.input-group {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  overflow: hidden;
}
.input-group-prefix {
  background: var(--bg-overlay);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-muted);
  border-right: 1px solid var(--border-default);
  white-space: nowrap;
  display: flex; align-items: center;
}
.input-group .input { border: none; border-radius: 0; }
```

### 5.5 Tables

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.data-table thead th {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}
.data-table thead th.numeric { text-align: right; }

.data-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}
.data-table tbody tr:hover { background: var(--bg-overlay); }
.data-table tbody tr:last-child { border-bottom: none; }

.data-table tbody td {
  padding: var(--space-4);
  color: var(--text-primary);
  vertical-align: middle;
}
.data-table tbody td.numeric {
  font-family: var(--font-mono);
  text-align: right;
  font-size: var(--text-xs);
}
.data-table tbody td.muted { color: var(--text-secondary); }
```

### 5.6 Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--badge-radius);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Repair job statuses */
.badge-received   { background: rgba(96,165,250,0.1);  color: #60A5FA; }
.badge-diagnosed  { background: rgba(245,158,11,0.1);  color: #F59E0B; }
.badge-inprogress { background: rgba(139,92,246,0.1);  color: #8B5CF6; }
.badge-completed  { background: rgba(16,185,129,0.1);  color: #10B981; }
.badge-delivered  { background: rgba(107,114,128,0.1); color: #6B7280; }

/* Financial statuses */
.badge-paid    { background: rgba(16,185,129,0.1);  color: #10B981; }
.badge-unpaid  { background: rgba(245,158,11,0.1);  color: #F59E0B; }
.badge-overdue { background: rgba(239,68,68,0.1);   color: #EF4444; }

/* Dot indicator */
.badge::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
```

### 5.7 Sidebar Navigation

```
Width: 240px (expanded), 64px (collapsed)
Background: var(--bg-surface)
Right border: 1px solid var(--border-subtle)

Structure:
┌──────────────────────┐
│  [Logo] Dash & Co.   │  ← 56px header
├──────────────────────┤
│  BUSINESS            │  ← section label
│  ◉ Dashboard         │  ← active item
│  ○ Inventory         │
│  ○ Repairs           │
│  ○ Sales             │
│  ○ Expenses          │
│  ○ Investments       │
│  ○ Tithe             │
│  ○ Market List       │
├──────────────────────┤
│  PERSONAL            │  ← section label
│  ○ Dashboard         │
│  ○ Transactions      │
│  ○ Food Vendor       │
│  ○ Savings           │
│  ○ Tithe             │
├──────────────────────┤
│  ○ Reports           │
│  ○ Settings          │
│                      │
│  [Avatar] Augustine  │  ← bottom user bar
└──────────────────────┘
```

```css
/* Active nav item */
.nav-item-active {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
  border-right: 2px solid var(--accent-primary);
  border-radius: 8px 0 0 8px;
}
/* Nav section label */
.nav-section-label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding: var(--space-4) var(--space-4) var(--space-2);
}
```

### 5.8 Scope Switcher (Business vs Personal)

The scope switcher sits at the top of the sidebar or in the header. It clearly separates the two contexts.

```
┌─────────────────────────┐
│  [Business] [Personal]  │
└─────────────────────────┘
```

Business scope: accent = --accent-primary (blue)
Personal scope: accent = --accent-purple

When switching scope, the active accent color shifts across the UI (sidebar highlights, stat card accents, button color).

---

## 6. Page Layouts

### 6.1 App Shell

```
┌──────────────────────────────────────────────────┐
│ SIDEBAR (240px fixed)  │  MAIN CONTENT AREA       │
│                        │  ┌──────────────────┐    │
│  [nav items]           │  │ PAGE HEADER      │    │
│                        │  │ (title + actions)│    │
│                        │  ├──────────────────┤    │
│                        │  │                  │    │
│                        │  │  PAGE CONTENT    │    │
│                        │  │                  │    │
│                        │  └──────────────────┘    │
└──────────────────────────────────────────────────┘
```

```css
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  background: var(--bg-base);
}
.main-content {
  padding: var(--space-6) var(--space-8);
  max-width: var(--content-max);
  overflow-y: auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-8);
}
.page-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}
.page-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}
```

### 6.2 Business Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│ Good morning, Augustine          [Period Selector ▾] │
├──────────────────────────────────────────────────────┤
│ [Revenue]  [Expenses]  [Profit]  [Available Balance] │  ← 4-col stat row
├────────────────────────┬─────────────────────────────┤
│ [Tithe Due]  [Pending] │  [Inventory Value]           │  ← 3-col row
│ [Low Stock]            │                              │
├────────────────────────┴─────────────────────────────┤
│ Recent Repair Jobs (table, last 5)                    │
├──────────────────────────────────────────────────────┤
│ [Revenue Chart — 7 days]  │  [Expense Breakdown pie]  │
└──────────────────────────────────────────────────────┘
```

### 6.3 Repairs Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Repair Jobs               [+ New Job]               │
├─────────────────────────────────────────────────────┤
│ [All] [Received] [In Progress] [Completed] (tabs)   │
├─────────────────────────────────────────────────────┤
│ Search: [___________]  Filter: [Device ▾] [Date ▾]  │
├─────────────────────────────────────────────────────┤
│ JOB TABLE                                           │
│ # | Customer | Device | Fault | Status | Charge | → │
│ ...                                                 │
└─────────────────────────────────────────────────────┘

On row click → slide-in Detail Panel (right side, 480px)
```

### 6.4 Repair Job Detail Panel

```
┌───────────────────────────────────┐
│ Job #047              [Edit] [×]  │
│ ─────────────────────────────     │
│ STATUS: [● IN PROGRESS]           │
│ Customer: John Doe • 08012345678  │
│ Device: iPhone 13 Pro             │
│ Fault: Screen cracked             │
│                                   │
│ PARTS USED                        │
│ iPhone 13 Screen   ×1   ₦18,000  │
│ [+ Add Part]                      │
│                                   │
│ Labor Charge:        ₦5,000       │
│ Total Charge:        ₦25,000      │
│ Parts Cost:         -₦18,000      │
│ ─────────────────────────────     │
│ Profit:              ₦7,000 ✓     │
│ Tithe (10%):           ₦700       │
│                                   │
│ [Mark Completed]  [Mark Delivered]│
└───────────────────────────────────┘
```

### 6.5 Inventory Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Inventory                  [+ Add Item] [Import]    │
├──────────────────┬──────────────────────────────────┤
│ SUMMARY CARDS    │  [Total Items] [Total Value]     │
│                  │  [Low Stock Count]               │
├──────────────────┴──────────────────────────────────┤
│ Search: [___________]  Category: [All ▾]            │
├─────────────────────────────────────────────────────┤
│ Item | SKU | Stock | Reorder | Purchase | Selling  │
│ ─── LOW STOCK ITEMS (highlighted in amber) ───      │
│ ─── IN STOCK ITEMS ───                             │
└─────────────────────────────────────────────────────┘
```

### 6.6 Food Vendor Tracker (Personal)

```
┌─────────────────────────────────────────────────────┐
│ Food Vendor          [+ Record Meal]                │
├───────────────────┬─────────────────────────────────┤
│ Outstanding Debt  │  Weekly Total  │  Avg/Day        │
│ ₦4,200            │  ₦4,200        │  ₦600           │
├───────────────────┴─────────────────────────────────┤
│ THIS WEEK                         [Mark All Paid]   │
│ Mon 05 May  Jollof + chicken       ₦800            │
│ Mon 05 May  Fried rice             ₦600            │
│ Tue 06 May  Beans + plantain       ₦500            │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│ PAYMENT HISTORY                                     │
│ Week of Apr 28    ₦3,400   ✓ Paid  Apr 30          │
└─────────────────────────────────────────────────────┘
```

---

## 7. Motion & Animation

```css
/* Page transition */
@keyframes pageIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: pageIn 0.2s ease forwards; }

/* Stat counter animation (numbers count up on load) */
/* Use React countUp or CSS counter-increment trick */

/* Slide-in panel */
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
.panel-enter { animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

/* Skeleton loading pulse */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--bg-elevated) 25%,
    var(--bg-overlay)  50%,
    var(--bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

/* Toast notification */
@keyframes toastIn {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

### Framer Motion Variants (for Next.js)

```ts
// lib/motion-variants.ts
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.06 } }
};

export const slideInRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.2 } }
};
```

---

## 8. Charts & Data Visualization

Use **Recharts** for all charts. Styling rules:

```ts
// Shared chart theme
const CHART_THEME = {
  background: 'transparent',
  gridColor: '#1F2535',
  axisColor: '#4A5568',
  labelColor: '#8B96A8',
  tooltipBg: '#181C24',
  tooltipBorder: '#2A3347',
  colors: {
    revenue: '#3B82F6',
    expense: '#EF4444',
    profit:  '#10B981',
    tithe:   '#F59E0B',
    personal:'#8B5CF6',
  }
};

// All charts: no default borders, custom tooltip, no legend box borders
// Tooltip: glass style, mono font for amounts
```

Chart types per context:
- **Revenue over time** → AreaChart with gradient fill
- **Expense breakdown** → PieChart / DonutChart
- **Profit trend** → BarChart
- **Income vs Expense** → ComposedChart (bar + line)
- **Food vendor weekly** → BarChart

---

## 9. Forms

### Add Repair Job Form Fields (in order):
1. Customer Name (text)
2. Customer Phone (tel)
3. Device Type (select: Phone, Fan, Extension, Gadget, Other)
4. Device Model (text)
5. Fault Description (textarea)
6. Initial Charge Estimate (currency input)
7. [Submit → status: "Received"]

### Add Parts to Job:
- Item search (autocomplete from inventory)
- Quantity (number)
- Mark as Damaged (toggle — triggers loss record)

### Add Inventory Item Form:
1. Item Name
2. Category (select)
3. SKU / Barcode (optional)
4. Purchase Price (currency)
5. Selling Price (currency)
6. Initial Quantity
7. Reorder Level
8. Supplier

### Record Sale Form:
1. Item (search autocomplete)
2. Customer (optional)
3. Quantity
4. Selling Price (auto-filled from item, editable)
5. Date

### Record Food Vendor Meal:
1. Vendor Name (text, with recent suggestions)
2. Date (date picker, default today)
3. Meal Description (text)
4. Amount (currency)

---

## 10. Offline / PWA Indicators

```css
/* Offline banner */
.offline-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: var(--accent-amber);
  color: var(--text-inverse);
  text-align: center;
  padding: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  z-index: 9999;
}

/* Sync status indicator in sidebar footer */
.sync-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.sync-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
}
.sync-dot.synced  { background: var(--accent-green); }
.sync-dot.pending { background: var(--accent-amber); animation: pulse 1.5s infinite; }
.sync-dot.offline { background: var(--accent-red); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```

---

## 11. Notifications / Toast System

```
Position: bottom-right, stacked
Max visible: 3

Types:
- success: green left border
- error: red left border
- warning: amber left border
- info: blue left border

Auto-dismiss: 4 seconds (errors: 6 seconds)
```

```css
.toast {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--card-radius);
  padding: var(--space-4) var(--space-5);
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  border-left: 3px solid;
}
.toast-success { border-left-color: var(--accent-green); }
.toast-error   { border-left-color: var(--accent-red); }
.toast-warning { border-left-color: var(--accent-amber); }
.toast-info    { border-left-color: var(--accent-primary); }
```

---

## 12. Responsive Breakpoints

```css
/* Mobile-first (PWA on phone) */
@media (max-width: 768px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { /* bottom tab bar */ }
  .main-content { padding: var(--space-4); }
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .detail-panel { /* full screen modal */ }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .sidebar { width: var(--sidebar-collapsed); /* icon only */ }
  .app-shell { grid-template-columns: var(--sidebar-collapsed) 1fr; }
}

@media (min-width: 1201px) {
  /* Full layout as specified */
}
```

### Mobile Bottom Tab Bar (< 768px)

```
┌──────────────────────────────────┐
│ [Home] [Jobs] [Stock] [Personal] │
└──────────────────────────────────┘
```

Background: var(--bg-surface)
Border-top: 1px solid var(--border-subtle)
Height: 64px + safe-area-inset-bottom

---

## 13. Empty States

Every list/table must have an empty state:

```
Icon (large, muted)
Primary text: "No repair jobs yet"
Secondary text: "Create your first job to start tracking."
[CTA Button]
```

---

## 14. Loading States

- **Page load**: Skeleton cards matching the layout
- **Table load**: 5 skeleton rows
- **Stat cards**: Shimmer rectangles
- **Chart**: Skeleton with correct aspect ratio
- **Form submit**: Button shows spinner + "Saving…", disabled

---

## 15. Financial Number Formatting

```ts
// lib/format.ts

export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
  // Output: ₦124,500.00
};

export const formatCompact = (amount: number): string => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `₦${(amount / 1_000).toFixed(1)}K`;
  return formatNaira(amount);
};

export const formatProfit = (profit: number) => ({
  formatted: formatNaira(Math.abs(profit)),
  isPositive: profit >= 0,
  label: profit >= 0 ? 'Profit' : 'Loss',
  color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
});
```

---

## 16. Accessibility

- All interactive elements: minimum 44×44px touch target
- Focus rings: `outline: 2px solid var(--accent-primary); outline-offset: 2px`
- Color is never the only indicator (icons + text accompany all status colors)
- ARIA labels on icon-only buttons
- `prefers-reduced-motion`: disable all animations if set

---

## 17. Key UX Rules

1. **Profit is always green, loss is always red** — no exceptions
2. **Tithe due** shows amber alert on dashboard until paid
3. **Low stock** shows amber badge on inventory nav item
4. **Pending repair jobs** shows count badge on repairs nav item
5. **All currency inputs** use naira prefix (₦) and monospace font
6. **Date fields** default to today
7. **Damaged part toggle** in job form shows a warning before confirming
8. **Completed job** cannot have parts added — form is locked
9. **Offline mutations** show a subtle "Pending sync" indicator on the record
10. **Scope (Business/Personal)** is always visible in the header

---

*End of DESIGN.md*
