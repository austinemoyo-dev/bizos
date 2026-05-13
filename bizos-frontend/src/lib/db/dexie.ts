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
  optimistic_id?: string;
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
