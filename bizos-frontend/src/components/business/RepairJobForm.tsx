'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { RepairJobCreate, DeviceType, AddPartPayload, Item } from '@/types/api';
import { inventoryApi } from '@/lib/api/inventory';
import { Loader2, Trash2 } from 'lucide-react';

const DEVICE_OPTIONS: { value: DeviceType; label: string; hasModel: boolean }[] = [
  { value: 'phone',          label: 'Phone',           hasModel: true  },
  { value: 'tablet',         label: 'Tablet',          hasModel: true  },
  { value: 'laptop',         label: 'Laptop',          hasModel: true  },
  { value: 'computer',       label: 'Computer / PC',   hasModel: true  },
  { value: 'fan',            label: 'Fan',             hasModel: false },
  { value: 'extension',      label: 'Extension / Board', hasModel: false },
  { value: 'iron',           label: 'Iron',            hasModel: false },
  { value: 'washing_machine',label: 'Washing Machine', hasModel: false },
  { value: 'tv',             label: 'TV',              hasModel: false },
  { value: 'gadget',         label: 'Gadget',          hasModel: false },
  { value: 'other',          label: 'Other',           hasModel: false },
];

interface RepairJobFormProps {
  onSubmit: (data: RepairJobCreate) => Promise<void>;
  onCancel: () => void;
  initialValues?: Partial<RepairJobCreate>;
}

export function RepairJobForm({ onSubmit, onCancel, initialValues }: RepairJobFormProps) {
  const [form, setForm] = useState<RepairJobCreate>({
    customer_name:    initialValues?.customer_name ?? '',
    customer_phone:   initialValues?.customer_phone ?? '',
    device_type:      initialValues?.device_type ?? 'phone',
    device_model:     initialValues?.device_model ?? '',
    fault_description:initialValues?.fault_description ?? '',
    labor_charge:     initialValues?.labor_charge ?? 0,
    total_charge:     initialValues?.total_charge ?? 0,
    notes:            initialValues?.notes ?? '',
    parts:            initialValues?.parts ?? [],
    received_at:      initialValues?.received_at ?? format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Inventory items query
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'active'],
    queryFn: () => inventoryApi.list(),
  });
  const inventoryItems = inventoryData?.items ?? [];

  const set = <K extends keyof RepairJobCreate>(k: K, v: RepairJobCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const deviceConfig = DEVICE_OPTIONS.find((d) => d.value === form.device_type);
  const showModel = deviceConfig?.hasModel ?? false;

  const updatePartsAndTotal = (newParts: any[], currentLabor: number | string) => {
    setForm(f => {
      const partsTotal = newParts.reduce((acc, p) => acc + (p.selling_price || 0) * p.quantity, 0);
      return {
        ...f,
        parts: newParts,
        total_charge: Number(currentLabor) + partsTotal,
      };
    });
  };

  const handleAddPart = (itemId: string) => {
    if (!itemId) return;
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    // Check if already added
    if (form.parts?.some(p => p.item_id === itemId)) return;

    const newPart: AddPartPayload & { _name: string } = {
      item_id: item.id,
      quantity: 1,
      unit_cost: item.purchase_price,
      selling_price: item.selling_price || item.purchase_price,
      damaged: false,
      _name: item.name,
    };

    updatePartsAndTotal([...(form.parts || []), newPart], form.labor_charge);
  };

  const handleUpdatePart = (index: number, updates: Partial<AddPartPayload>) => {
    const parts = [...(form.parts || [])];
    parts[index] = { ...parts[index], ...updates };
    updatePartsAndTotal(parts, form.labor_charge);
  };

  const handleRemovePart = (index: number) => {
    const parts = [...(form.parts || [])];
    parts.splice(index, 1);
    updatePartsAndTotal(parts, form.labor_charge);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (showModel && (!form.parts || form.parts.length === 0) && !initialValues) {
      setError('Please select at least one issue/part from the inventory.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        parts: form.parts?.map(({ _name, ...p }: any) => p),
      };

      if (showModel && !initialValues) {
        // Auto-map the selected inventory items to device model and fault description
        const issueNames = (form.parts || []).map((p: any) => p._name).join(', ');
        payload.device_model = issueNames;
        payload.fault_description = issueNames;
      }

      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Customer Name *</label>
        <input className="input" value={form.customer_name}
          onChange={(e) => set('customer_name', e.target.value)} required placeholder="John Doe" />
      </div>
      <div className="form-group">
        <label className="form-label">Customer Phone</label>
        <input className="input" type="tel" value={form.customer_phone ?? ''}
          onChange={(e) => set('customer_phone', e.target.value)} placeholder="08012345678" />
      </div>

      <div className="form-group">
        <label className="form-label">Date Received *</label>
        <input
          className="input"
          type="date"
          value={form.received_at ?? ''}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => set('received_at', e.target.value)}
          required
        />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
          Determines which accounting period this job belongs to.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Device Type *</label>
        <select className="input" value={form.device_type}
          onChange={(e) => {
            set('device_type', e.target.value as DeviceType);
            set('device_model', '');
            set('fault_description', '');
            set('parts', []); // Reset parts when changing type
          }} required>
          {DEVICE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {showModel && !initialValues && (
        <div style={{ background: 'var(--bg-card)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', border: '1px solid var(--border)' }}>
          <label className="form-label">Device Issue / Model (From Inventory) *</label>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Search and select the exact part/issue. This will automatically set the model and deduct stock.
          </p>
          <select 
            className="input" 
            value="" 
            onChange={(e) => handleAddPart(e.target.value)}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <option value="" disabled>+ Select issue/model from inventory...</option>
            {inventoryItems.filter(i => i.quantity_in_stock > 0).map(item => (
              <option key={item.id} value={item.id}>
                {item.name} - ₦{item.selling_price || item.purchase_price} ({item.quantity_in_stock} in stock)
              </option>
            ))}
          </select>

          {form.parts && form.parts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {form.parts.map((part: any, idx) => (
                <div key={part.item_id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
                    {part._name || 'Item'}
                  </div>
                  <input 
                    type="number" 
                    className="input" 
                    style={{ width: 70, padding: '4px 8px' }}
                    min={1}
                    value={part.quantity}
                    onChange={(e) => handleUpdatePart(idx, { quantity: parseInt(e.target.value) || 1 })}
                    title="Quantity"
                  />
                  <div style={{ width: 120 }}>
                    <CurrencyInput 
                      value={part.selling_price || 0}
                      onChange={(v) => handleUpdatePart(idx, { selling_price: v })}
                    />
                  </div>
                  <button type="button" className="btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleRemovePart(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Inputs for Basic Appliances */}
      {!showModel && (
        <div className="form-group">
          <label className="form-label">Fault Description *</label>
          <textarea className="input" value={form.fault_description ?? ''}
            onChange={(e) => set('fault_description', e.target.value)}
            placeholder="Describe the fault..."
            required
            style={{ minHeight: 60, resize: 'vertical' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
        <div className="form-group">
          <CurrencyInput label="Labor Charge" value={form.labor_charge}
            onChange={(v) => {
              setForm(f => {
                 const partsTotal = (f.parts || []).reduce((acc, p) => acc + (p.selling_price || 0) * p.quantity, 0);
                 return { ...f, labor_charge: v, total_charge: Number(v) + partsTotal };
              });
            }} />
        </div>
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Total Estimate</label>
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <CurrencyInput value={form.total_charge}
              onChange={(v) => set('total_charge', v)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Amount Paid</label>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <CurrencyInput value={form.amount_paid ?? form.total_charge}
              onChange={(v) => set('amount_paid', v)} />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Balance: ₦{(form.total_charge - (form.amount_paid ?? form.total_charge)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <input className="input" value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)} placeholder="Optional internal note" />
      </div>

      {error && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {initialValues ? 'Save Changes' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
