'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { RepairJobCreate, DeviceType, AddPartPayload } from '@/types/api';
import { inventoryApi } from '@/lib/api/inventory';
import { Loader2, Trash2, Plus, X, Pencil } from 'lucide-react';
import { useDeviceTypes } from '@/lib/hooks/useCustomOptions';

interface RepairJobFormProps {
  onSubmit:     (data: RepairJobCreate) => Promise<void>;
  onCancel:     () => void;
  initialValues?: Partial<RepairJobCreate>;
}

export function RepairJobForm({ onSubmit, onCancel, initialValues }: RepairJobFormProps) {
  const { deviceOptions, customDeviceTypes, addDeviceType, removeDeviceType } = useDeviceTypes();

  const [form, setForm] = useState<RepairJobCreate>({
    customer_name:     initialValues?.customer_name     ?? '',
    customer_phone:    initialValues?.customer_phone    ?? '',
    device_type:       initialValues?.device_type       ?? 'phone',
    device_model:      initialValues?.device_model      ?? '',
    fault_description: initialValues?.fault_description ?? '',
    labor_charge:      initialValues?.labor_charge      ?? 0,
    total_charge:      initialValues?.total_charge      ?? 0,
    status:            initialValues?.status            ?? 'received',
    notes:             initialValues?.notes             ?? '',
    parts:             initialValues?.parts             ?? [],
    received_at:       initialValues?.received_at       ?? format(new Date(), 'yyyy-MM-dd'),
    completed_at:      initialValues?.completed_at      ?? '',
  });

  // Track the selected value including custom__ prefix values
  const [selectedDeviceValue, setSelectedDeviceValue] = useState<string>(
    initialValues?.device_type ?? 'phone',
  );
  // When a custom device type is chosen, let user optionally override the name
  const [customDeviceName, setCustomDeviceName] = useState('');

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showManageDev, setShowManageDev] = useState(false);
  const [newDevInput, setNewDevInput]     = useState('');
  const [newDevHasModel, setNewDevHasModel] = useState(false);
  const [addDevError, setAddDevError]     = useState('');

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'active'],
    queryFn:  () => inventoryApi.list(),
  });
  const inventoryItems = inventoryData?.items ?? [];

  const set = <K extends keyof RepairJobCreate>(k: K, v: RepairJobCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Find config for currently selected device value
  const deviceConfig = deviceOptions.find(d => d.value === selectedDeviceValue);
  const showModel    = deviceConfig?.hasModel ?? false;
  const isCustomType = selectedDeviceValue.startsWith('__custom_');

  const handleDeviceChange = (value: string) => {
    setSelectedDeviceValue(value);
    const cfg = deviceOptions.find(d => d.value === value);
    // All custom types map to 'other' in the backend
    const backendType = value.startsWith('__custom_') ? 'other' : (value as DeviceType);
    setForm(f => ({
      ...f,
      device_type:       backendType,
      device_model:      '',
      fault_description: '',
      parts:             [],
    }));
    setCustomDeviceName('');
  };

  const updatePartsAndTotal = (newParts: any[], currentLabor: number | string) => {
    setForm(f => {
      const partsTotal = newParts.reduce((acc, p) => acc + (p.selling_price || 0) * p.quantity, 0);
      return { ...f, parts: newParts, total_charge: Number(currentLabor) + partsTotal };
    });
  };

  const handleAddPart = (itemId: string) => {
    if (!itemId) return;
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;
    if (form.parts?.some((p: any) => p.item_id === itemId)) return;
    const newPart: AddPartPayload & { _name: string } = {
      item_id:       item.id,
      quantity:      1,
      unit_cost:     item.purchase_price,
      selling_price: item.selling_price || item.purchase_price,
      damaged:       false,
      _name:         item.name,
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

  const handleAddDeviceType = () => {
    const ok = addDeviceType(newDevInput, newDevHasModel);
    if (!ok) { setAddDevError('Already exists or name is empty'); return; }
    setNewDevInput('');
    setAddDevError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (showModel && (!form.parts || form.parts.length === 0) && !initialValues) {
      setError('Please select at least one part or issue from inventory.');
      return;
    }

    if ((form.status === 'completed' || form.status === 'delivered') && !form.completed_at) {
      setError('Please enter the date this job was completed.');
      return;
    }

    setLoading(true);
    try {
      const payload: RepairJobCreate = {
        ...form,
        parts: form.parts?.map(({ _name, ...p }: any) => p),
        completed_at: form.completed_at || undefined,
      };

      if (showModel && !initialValues) {
        const issueNames = (form.parts || []).map((p: any) => p._name).join(', ');
        payload.device_model      = issueNames;
        payload.fault_description = issueNames;
      }

      // For custom device types, prefix the custom name into device_model
      if (isCustomType) {
        const label = deviceConfig?.label ?? '';
        const name  = (customDeviceName.trim() || label);
        payload.device_model      = name;
        // If fault_description is empty, use device name as placeholder
        if (!payload.fault_description) payload.fault_description = name;
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
      {/* Customer */}
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

      {/* Date received */}
      <div className="form-group">
        <label className="form-label">Date Received *</label>
        <input className="input" type="date" value={form.received_at ?? ''}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => set('received_at', e.target.value)} required />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
          Determines which accounting period this job belongs to.
        </p>
      </div>

      {/* Job Status */}
      <div className="form-group">
        <label className="form-label">Job Status *</label>
        <select
          className="input"
          value={form.status ?? 'received'}
          onChange={(e) => {
            const s = e.target.value as RepairJobCreate['status'];
            setForm(f => ({
              ...f,
              status: s,
              completed_at: (s === 'completed' || s === 'delivered') ? (f.completed_at || format(new Date(), 'yyyy-MM-dd')) : '',
            }));
          }}
        >
          <option value="received">Received</option>
          <option value="diagnosed">Diagnosed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Completion date — shown only when status is completed or delivered */}
      {(form.status === 'completed' || form.status === 'delivered') && (
        <div className="form-group">
          <label className="form-label">Date Completed *</label>
          <input
            className="input"
            type="date"
            value={form.completed_at ?? ''}
            max={format(new Date(), 'yyyy-MM-dd')}
            min={form.received_at ?? ''}
            onChange={(e) => set('completed_at', e.target.value)}
            required
          />
        </div>
      )}

      {/* Device type with manage panel */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label className="form-label" style={{ margin: 0 }}>Device Type *</label>
          <button
            type="button"
            onClick={() => setShowManageDev(v => !v)}
            style={{
              fontSize: '0.6rem', fontWeight: 700, color: '#C8102E',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            <Pencil size={10} />
            {showManageDev ? 'Done' : 'Manage Types'}
          </button>
        </div>

        <select
          className="input"
          value={selectedDeviceValue}
          onChange={(e) => handleDeviceChange(e.target.value)}
          required
        >
          {/* Built-in group */}
          <optgroup label="Standard">
            {deviceOptions.filter(d => d.builtin).map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </optgroup>
          {/* Custom group */}
          {deviceOptions.some(d => !d.builtin) && (
            <optgroup label="Custom">
              {deviceOptions.filter(d => !d.builtin).map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Manage device types panel */}
        {showManageDev && (
          <div style={{
            marginTop: 8, padding: '10px 12px',
            background: 'var(--bg-elevated)', borderRadius: 12,
            border: '1px solid var(--border-subtle)',
          }}>
            {/* Add form */}
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Add Custom Device Type
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                className="input"
                style={{ flex: 1, padding: '5px 10px', fontSize: 'var(--text-xs)' }}
                placeholder="e.g. Generator, Printer..."
                value={newDevInput}
                onChange={e => { setNewDevInput(e.target.value); setAddDevError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDeviceType(); } }}
              />
              <button type="button" className="btn-primary"
                style={{ padding: '5px 10px', fontSize: 'var(--text-xs)' }}
                onClick={handleAddDeviceType}>
                <Plus size={12} /> Add
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newDevHasModel}
                onChange={e => setNewDevHasModel(e.target.checked)}
                style={{ accentColor: '#C8102E' }}
              />
              Needs inventory part selection (like phone/laptop)
            </label>

            {addDevError && (
              <p style={{ fontSize: '0.6rem', color: 'var(--accent-red)', marginBottom: 6 }}>{addDevError}</p>
            )}

            {customDeviceTypes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {customDeviceTypes.map((dt, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 20,
                    background: 'var(--accent-primary-glow)',
                    border: '1px solid rgba(200,16,46,0.2)',
                    fontSize: '0.6rem', fontWeight: 600, color: '#C8102E',
                  }}>
                    {dt.label}
                    <button type="button"
                      onClick={() => removeDeviceType(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8102E', lineHeight: 0, padding: 0 }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {customDeviceTypes.length === 0 && (
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                No custom types yet. Custom types map to "Other" in the backend.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custom device name field (when a custom type is selected) */}
      {isCustomType && (
        <div className="form-group">
          <label className="form-label">Device Name / Brand</label>
          <input
            className="input"
            value={customDeviceName}
            onChange={e => setCustomDeviceName(e.target.value)}
            placeholder={`e.g. Samsung ${deviceConfig?.label ?? ''} Pro...`}
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Shown on the job card. Leave blank to use type name.
          </p>
        </div>
      )}

      {/* Parts picker (for phone/tablet/laptop/computer and custom with hasModel) */}
      {showModel && !initialValues && (
        <div style={{
          background: 'var(--bg-elevated)', padding: 'var(--space-3)',
          borderRadius: 14, marginBottom: 'var(--space-4)',
          border: '1px solid var(--border-subtle)',
        }}>
          <label className="form-label">Device Issue / Model (from Inventory) *</label>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Select part(s) — this sets the model and automatically deducts stock.
          </p>
          <select className="input" value=""
            onChange={(e) => handleAddPart(e.target.value)}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <option value="" disabled>+ Select issue / part from inventory...</option>
            {inventoryItems.filter(i => i.quantity_in_stock > 0).map(item => (
              <option key={item.id} value={item.id}>
                {item.name} — ₦{(item.selling_price || item.purchase_price).toLocaleString()} ({item.quantity_in_stock} in stock)
              </option>
            ))}
          </select>

          {form.parts && form.parts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.parts.map((part: any, idx) => (
                <div key={part.item_id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {part._name || 'Item'}
                  </div>
                  <input type="number" className="input"
                    style={{ width: 68, padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                    min={1} value={part.quantity} title="Quantity"
                    onChange={(e) => handleUpdatePart(idx, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <div style={{ width: 120 }}>
                    <CurrencyInput value={part.selling_price || 0}
                      onChange={(v) => handleUpdatePart(idx, { selling_price: v })} />
                  </div>
                  <button type="button" className="btn-ghost"
                    style={{ padding: '6px', color: 'var(--accent-red)' }}
                    onClick={() => handleRemovePart(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual fault description (non-hasModel types) */}
      {!showModel && (
        <div className="form-group">
          <label className="form-label">Fault Description *</label>
          <textarea className="input" value={form.fault_description ?? ''}
            onChange={(e) => set('fault_description', e.target.value)}
            placeholder="Describe the fault clearly..."
            required
            style={{ minHeight: 64, resize: 'vertical' }} />
        </div>
      )}

      {/* Charges */}
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
          <label className="form-label">Total Estimate</label>
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
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
            Balance: ₦{(form.total_charge - (form.amount_paid ?? form.total_charge)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <input className="input" value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)} placeholder="Optional internal note" />
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderLeft: '3px solid var(--accent-red)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 'var(--space-4)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-red)' }}>
            {error}
          </p>
        </div>
      )}

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
