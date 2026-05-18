'use client';
import { useState, useCallback } from 'react';

const BUDGET_KEY  = 'food_monthly_budget';
const LIMITS_KEY  = 'food_vendor_limits';

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useFoodBudget() {
  const [budget, setBudgetState] = useState<number>(() => readLocal(BUDGET_KEY, 0));
  const [limits, setLimitsState] = useState<Record<string, number>>(
    () => readLocal<Record<string, number>>(LIMITS_KEY, {}),
  );

  const saveBudget = useCallback((amount: number) => {
    setBudgetState(amount);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(amount));
  }, []);

  const setLimit = useCallback((vendor: string, limit: number) => {
    setLimitsState((prev) => {
      const next = { ...prev, [vendor]: limit };
      localStorage.setItem(LIMITS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getLimit = useCallback((vendor: string) => limits[vendor] ?? 0, [limits]);

  return { budget, saveBudget, limits, setLimit, getLimit };
}
