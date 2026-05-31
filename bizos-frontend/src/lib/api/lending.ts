import { api } from './client';

export type FinanceScope = 'business' | 'personal';

export interface LoanGiven {
  id: string;
  scope: FinanceScope;
  borrower_name: string;
  principal_amount: number;
  amount_repaid: number;
  outstanding: number;
  due_date: string | null;
  purpose: string | null;
  is_settled: boolean;
  given_at: string;
  notes: string | null;
  created_at: string;
  repayments: LoanRepayment[];
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  amount: number;
  repaid_at: string;
  notes: string | null;
  created_at: string;
}

export interface DebtOwed {
  id: string;
  scope: FinanceScope;
  creditor_name: string;
  principal_amount: number;
  amount_repaid: number;
  outstanding: number;
  due_date: string | null;
  purpose: string | null;
  is_settled: boolean;
  borrowed_at: string;
  notes: string | null;
  created_at: string;
  payments: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

export interface LendingSummary {
  scope: FinanceScope;
  total_lent_out: number;
  total_recovered: number;
  outstanding_receivable: number;
  overdue_loans: number;
  total_borrowed: number;
  total_repaid: number;
  outstanding_payable: number;
  overdue_debts: number;
}

export const lendingApi = {
  // Loans given
  listLoans: (scope?: FinanceScope, is_settled?: boolean) => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (is_settled !== undefined) qs.set('is_settled', String(is_settled));
    return api.get<LoanGiven[]>(`/lending/loans?${qs}`);
  },
  createLoan: (data: {
    scope: FinanceScope;
    borrower_name: string;
    principal_amount: number;
    due_date?: string;
    purpose?: string;
    given_at?: string;
    notes?: string;
  }) => api.post<LoanGiven>('/lending/loans', data),
  updateLoan: (id: string, data: Partial<{ borrower_name: string; due_date: string; purpose: string; notes: string }>) =>
    api.put<LoanGiven>(`/lending/loans/${id}`, data),
  repayLoan: (id: string, data: { amount: number; repaid_at?: string; notes?: string }) =>
    api.post<LoanRepayment>(`/lending/loans/${id}/repay`, data),

  // Debts owed
  listDebts: (scope?: FinanceScope, is_settled?: boolean) => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (is_settled !== undefined) qs.set('is_settled', String(is_settled));
    return api.get<DebtOwed[]>(`/lending/debts?${qs}`);
  },
  createDebt: (data: {
    scope: FinanceScope;
    creditor_name: string;
    principal_amount: number;
    due_date?: string;
    purpose?: string;
    borrowed_at?: string;
    notes?: string;
  }) => api.post<DebtOwed>('/lending/debts', data),
  updateDebt: (id: string, data: Partial<{ creditor_name: string; due_date: string; purpose: string; notes: string }>) =>
    api.put<DebtOwed>(`/lending/debts/${id}`, data),
  payDebt: (id: string, data: { amount: number; paid_at?: string; notes?: string }) =>
    api.post<DebtPayment>(`/lending/debts/${id}/pay`, data),

  // Summary
  summary: (scope: FinanceScope) => api.get<LendingSummary>(`/lending/summary/${scope}`),
};
