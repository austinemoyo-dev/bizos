'use client';
import { useState, useCallback } from 'react';
import { FoodCredit } from '@/types/api';

const CACHE_KEY = 'food_payment_cache';

interface CachedPayment {
  vendor_name: string;
  credits: Pick<FoodCredit, 'id' | 'meal_description' | 'amount' | 'purchase_date' | 'meal_type'>[];
}

type PaymentCache = Record<string, CachedPayment>;

function readCache(): PaymentCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PaymentCache) : {};
  } catch {
    return {};
  }
}

export function useFoodPaymentCache() {
  const [cache, setCache] = useState<PaymentCache>(readCache);

  const storePayment = useCallback(
    (paymentId: string, vendorName: string, credits: FoodCredit[]) => {
      setCache((prev) => {
        const next: PaymentCache = {
          ...prev,
          [paymentId]: {
            vendor_name: vendorName,
            credits: credits.map(({ id, meal_description, amount, purchase_date, meal_type }) => ({
              id, meal_description, amount, purchase_date, meal_type,
            })),
          },
        };
        // Keep only last 50 payments to avoid unbounded growth
        const keys = Object.keys(next);
        if (keys.length > 50) {
          const oldest = keys.slice(0, keys.length - 50);
          oldest.forEach((k) => delete next[k]);
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const getPaymentDetail = useCallback(
    (paymentId: string): CachedPayment | null => cache[paymentId] ?? null,
    [cache],
  );

  return { storePayment, getPaymentDetail };
}
