// Auth
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Inventory
export interface Item {
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
  created_at: string;
  updated_at: string;
}

export interface ItemCreate {
  name: string;
  category: string;
  sku?: string;
  purchase_price: number;
  selling_price?: number;
  quantity_in_stock: number;
  reorder_level: number;
  supplier?: string;
}

export interface RestockPayload {
  quantity: number;
  unit_cost: number;
}

// Repairs
export type RepairStatus = 'received' | 'diagnosed' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';

export type DeviceType =
  | 'phone' | 'tablet' | 'laptop' | 'computer'
  | 'fan' | 'extension' | 'iron' | 'washing_machine' | 'tv'
  | 'gadget' | 'other';

export interface RepairJob {
  id: string;
  job_number: number;
  customer_name: string;
  customer_phone?: string;
  device_type: DeviceType;
  device_model?: string;
  fault_description?: string;
  labor_charge: number;
  total_charge: number;
  status: RepairStatus;
  amount_paid: number;
  balance: number;
  parts: JobPart[];
  parts_cost: number;
  profit: number;
  notes?: string;
  cancel_reason?: string;
  received_at: string;
  completed_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobPart {
  id: string;
  job_id: string;
  item_id: string;
  item_name?: string;
  quantity: number;
  unit_cost: number;
  selling_price?: number;
  damaged: boolean;
}

export interface RepairJobCreate {
  customer_name: string;
  customer_phone?: string;
  device_type: DeviceType;
  device_model?: string;
  fault_description?: string;
  labor_charge: number;
  total_charge: number;
  amount_paid?: number;
  notes?: string;
  parts?: AddPartPayload[];
  received_at?: string; // YYYY-MM-DD — accounting period date for this job
}

export interface AddPartPayload {
  item_id: string;
  quantity: number;
  unit_cost: number;
  selling_price?: number;
  damaged?: boolean;
}

export interface CancelJobPayload {
  cancel_reason?: string;
}

// Sales
export interface Sale {
  id: string;
  item_id: string;
  item_name: string;
  customer?: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  amount_paid: number;
  balance: number;
  profit: number;
  sold_at: string;
  created_at: string;
}

export interface SaleCreate {
  item_id: string;
  customer?: string;
  quantity: number;
  selling_price: number;
  amount_paid?: number;
  sold_at?: string;
}

// Expenses
export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
  created_at: string;
}

export interface ExpenseCreate {
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
}

// Investments & Loans (both use the Investment model, split by type)
export type InvestmentType = 'investment' | 'loan';

export interface Investment {
  id: string;
  party_name: string;
  type: InvestmentType;
  amount: number;
  expected_return?: number;
  amount_repaid: number;
  balance_outstanding: number;
  due_date?: string;
  purpose?: string;
  is_settled: boolean;
  received_at: string;
  created_at: string;
}

export interface InvestmentCreate {
  party_name: string;
  type: InvestmentType;
  amount: number;
  expected_return?: number;
  due_date?: string;
  purpose?: string;
}

export interface RepaymentPayload {
  amount: number;
}

// Tithe
export interface Tithe {
  id: string;
  scope: 'business' | 'personal';
  tithe_amount: number;
  paid: boolean;
  paid_at?: string;
  source?: string;
  created_at: string;
}

// Personal Finance
export interface PersonalTransaction {
  id: string;
  type: 'income' | 'expense' | 'savings';
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
}

export interface PersonalTransactionCreate {
  type: 'income' | 'expense' | 'savings';
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
}

// Settings & Goals
export interface BusinessProfile {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  updated_at: string;
}

export interface MonthlyGoal {
  id: string;
  month: number;
  year: number;
  revenue_target: number;
  profit_target: number;
  created_at: string;
  updated_at: string;
}

// Food Vendor
export interface FoodCredit {
  id: string;
  vendor_name: string;
  meal_description?: string;
  amount: number;
  purchase_date: string;
  paid: boolean;
  paid_at?: string;
  created_at: string;
}

export interface FoodCreditCreate {
  vendor_name: string;
  meal_description?: string;
  amount: number;
  purchase_date: string;
}

export interface FoodVendorPayment {
  id: string;
  vendor_name: string;
  amount_paid: number;
  paid_at: string;
  note?: string;
}

// Savings
export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
}

export interface SavingsGoalCreate {
  title: string;
  target_amount: number;
  deadline?: string;
}

// Market List
export interface MarketItem {
  id: string;
  name: string;
  quantity?: string;
  estimated_price?: number;
  purchased: boolean;
  created_at: string;
}

export interface MarketItemCreate {
  name: string;
  quantity?: string;
  estimated_price?: number;
}

// Analytics
export interface BusinessSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;         // revenue − all expenses (incl. paid tithe)
  cash_collected: number;     // cash collected from sales and repairs
  available_balance: number;  // cash_collected − total_expenses
  tithe_due: number;          // total unpaid tithe (all time)
  tithe_paid: number;         // tithe paid this period
  repair_count: number;
  sale_count: number;
  pending_jobs: number;
  low_stock_count: number;
  inventory_value: number;
  period_start: string;
  period_end: string;
}

export interface DebtorItem {
  id: string;
  type: 'sale' | 'repair';
  customer_name: string;
  reference: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  date: string;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  total: number;
  amount: number;  // alias for total (used in charts)
  percentage: number;
  count: number;
}

export interface PersonalSummary {
  total_income: number;
  total_expenses: number;
  net_savings: number;
  food_debt: number;
  tithe_due: number;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
