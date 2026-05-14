'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Inventory Categories ───────────────────────────────────────────

export const DEFAULT_INV_CATEGORIES = [
  'Screen', 'Battery', 'Charging Port', 'Speaker',
  'Camera', 'Housing', 'Tools', 'Accessories', 'Other',
];

const CAT_KEY = 'bizos_inv_categories';

export function useInventoryCategories() {
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CAT_KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (list: string[]) => {
    setCustom(list);
    localStorage.setItem(CAT_KEY, JSON.stringify(list));
  };

  const categories = [
    ...DEFAULT_INV_CATEGORIES,
    ...custom.filter(c => !DEFAULT_INV_CATEGORIES.includes(c)),
  ];

  const addCategory = useCallback((name: string) => {
    const t = name.trim();
    if (!t || categories.includes(t)) return false;
    persist([...custom, t]);
    return true;
  }, [custom, categories]);

  const removeCategory = useCallback((name: string) => {
    if (DEFAULT_INV_CATEGORIES.includes(name)) return; // can't remove built-ins
    persist(custom.filter(c => c !== name));
  }, [custom]);

  return { categories, customCategories: custom, addCategory, removeCategory };
}

// ── Device Types ───────────────────────────────────────────────────
// Custom device types are displayed locally but always sent to backend as 'other'.
// The custom label gets stored in device_model by the form.

export interface CustomDeviceType {
  label: string;
  hasModel: boolean; // true = needs inventory part; false = manual fault
}

const DEV_KEY = 'bizos_device_types';

export const BUILTIN_DEVICE_OPTIONS = [
  { value: 'phone',           label: 'Phone',              hasModel: true,  builtin: true },
  { value: 'tablet',          label: 'Tablet',             hasModel: true,  builtin: true },
  { value: 'laptop',          label: 'Laptop',             hasModel: true,  builtin: true },
  { value: 'computer',        label: 'Computer / PC',      hasModel: true,  builtin: true },
  { value: 'fan',             label: 'Fan',                hasModel: false, builtin: true },
  { value: 'extension',       label: 'Extension / Board',  hasModel: false, builtin: true },
  { value: 'iron',            label: 'Iron',               hasModel: false, builtin: true },
  { value: 'washing_machine', label: 'Washing Machine',    hasModel: false, builtin: true },
  { value: 'tv',              label: 'TV',                 hasModel: false, builtin: true },
  { value: 'gadget',          label: 'Gadget',             hasModel: false, builtin: true },
] as const;

export function useDeviceTypes() {
  const [custom, setCustom] = useState<CustomDeviceType[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEV_KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (list: CustomDeviceType[]) => {
    setCustom(list);
    localStorage.setItem(DEV_KEY, JSON.stringify(list));
  };

  // Custom options use value `__custom_N` — the form maps these to 'other' before submitting
  const deviceOptions = [
    ...BUILTIN_DEVICE_OPTIONS,
    ...custom.map((c, i) => ({
      value: `__custom_${i}` as string,
      label: c.label,
      hasModel: c.hasModel,
      builtin: false,
    })),
  ];

  const addDeviceType = useCallback((label: string, hasModel: boolean) => {
    const t = label.trim();
    if (!t) return false;
    if (deviceOptions.some(d => d.label.toLowerCase() === t.toLowerCase())) return false;
    persist([...custom, { label: t, hasModel }]);
    return true;
  }, [custom, deviceOptions]);

  const removeDeviceType = useCallback((index: number) => {
    persist(custom.filter((_, i) => i !== index));
  }, [custom]);

  const editDeviceType = useCallback((index: number, updated: CustomDeviceType) => {
    const list = [...custom];
    list[index] = updated;
    persist(list);
  }, [custom]);

  return { deviceOptions, customDeviceTypes: custom, addDeviceType, removeDeviceType, editDeviceType };
}
