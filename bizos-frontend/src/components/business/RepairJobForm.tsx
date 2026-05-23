'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { RepairJobCreate, DeviceType, AddPartPayload } from '@/types/api';
import { inventoryApi } from '@/lib/api/inventory';
import { Loader2, Trash2, Plus, X, Pencil, Check } from 'lucide-react';
import { useDeviceTypes } from '@/lib/hooks/useCustomOptions';

interface RepairJobFormProps {
  onSubmit:     (data: RepairJobCreate) => Promise<void>;
  onCancel:     () => void;
  initialValues?: Partial<RepairJobCreate>;
  onAddPart?:   (data: AddPartPayload) => Promise<void>;
  existingParts?: Array<{ item_id: string; item_name: string; quantity: number; unit_cost: number; selling_price: number | null; damaged: boolean }>;
}

export function RepairJobForm({ onSubmit, onCancel, initialValues, onAddPart, existingParts }: RepairJobFormProps) {
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
  const [addingPartInline, setAddingPartInline] = useState(false);
  const [recentlyAddedParts, setRecentlyAddedParts] = useState<Array<{ item_id: string; name: string; quantity: number; selling_price: number }>>([]);
  const [stagedPart, setStagedPart] = useState<{ item_id: string; name: string; unit_cost: number; selling_price: number; quantity: number; max_qty: number } | null>(null);

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

  const handleAddPart = async (itemId: string) => {
    if (!itemId) return;
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    // In edit mode, stage the part for price/qty editing before submitting
    if (initialValues && onAddPart) {
      if (existingParts?.some(p => p.item_id === itemId)) return;
      if (recentlyAddedParts.some(p => p.item_id === itemId)) return;
      setStagedPart({
        item_id: item.id,
        name: item.name,
        unit_cost: item.purchase_price,
        selling_price: item.selling_price || item.purchase_price,
        quantity: 1,
        max_qty: item.quantity_in_stock,
      });
      return;
    }

    // In create mode, collect parts locally
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
        const partNames = (form.parts || []).map((p: any) => p._name);
        const fullIssueNames = partNames.join(', ');
        payload.fault_description = fullIssueNames;

        // device_model has a 100-char backend limit — truncate smartly
        if (fullIssueNames.length <= 100) {
          payload.device_model = fullIssueNames;
        } else {
          let truncated = '';
          let included = 0;
          for (const name of partNames) {
            const next = truncated ? `${truncated}, ${name}` : name;
            if (next.length > 90) break;          // leave room for suffix
            truncated = next;
            included++;
          }
          const remaining = partNames.length - included;
          payload.device_model = remaining > 0
            ? `${truncated} +${remaining} more`
            : truncated;
        }
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

      {/* Parts picker — always visible in edit mode, device-type dependent in create mode */}
      {(showModel || initialValues) && (
        <div style={{
          background: 'var(--bg-elevated)', padding: 'var(--space-3)',
          borderRadius: 14, marginBottom: 'var(--space-4)',
          border: '1px solid var(--border-subtle)',
        }}>
          <label className="form-label">
            {initialValues ? 'Add Parts / Items from Inventory' : 'Device Issue / Model (from Inventory) *'}
          </label>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            {initialValues
              ? 'Select new parts to add to this job — stock will be deducted automatically.'
              : 'Select part(s) — this sets the model and automatically deducts stock.'}
          </p>
          <select className="input" value=""
            onChange={(e) => handleAddPart(e.target.value)}
            disabled={addingPartInline}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <option value="" disabled>+ Select issue / part from inventory...</option>
            {inventoryItems.filter(i => i.quantity_in_stock > 0).map(item => (
              <option key={item.id} value={item.id}>
                {item.name} — ₦{(item.selling_price || item.purchase_price).toLocaleString()} ({item.quantity_in_stock} in stock)
              </option>
            ))}
          </select>

          {addingPartInline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Adding part...</span>
            </div>
          )}

          {/* Staged part — edit qty & price before confirming */}
          {initialValues && stagedPart && (
            <div style={{
              padding: '10px 12px', borderRadius: 10, marginBottom: 'var(--space-2)',
              background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {stagedPart.name}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 60px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Qty</label>
                  <input type="number" className="input"
                    style={{ padding: '6px 8px', fontSize: 'var(--text-xs)', minHeight: 36 }}
                    min={1} max={stagedPart.max_qty} value={stagedPart.quantity}
                    onChange={(e) => setStagedPart(s => s ? { ...s, quantity: Math.min(parseInt(e.target.value) || 1, s.max_qty) } : null)}
                  />
                </div>
                <div style={{ flex: '1 1 100px', minWidth: 100 }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Charge (₦)</label>
                  <CurrencyInput value={stagedPart.selling_price}
                    onChange={(v) => setStagedPart(s => s ? { ...s, selling_price: v } : null)} />
                </div>
                <button type="button" className="btn-primary"
                  disabled={addingPartInline}
                  style={{ padding: '6px 14px', minHeight: 36, gap: 6, fontSize: 'var(--text-xs)', flexShrink: 0 }}
                  onClick={async () => {
                    if (!stagedPart || !onAddPart) return;
                    setAddingPartInline(true);
                    try {
                      await onAddPart({
                        item_id: stagedPart.item_id,
                        quantity: stagedPart.quantity,
                        unit_cost: stagedPart.unit_cost,
                        selling_price: stagedPart.selling_price,
                        damaged: false,
                      });
                      setRecentlyAddedParts(prev => [...prev, {
                        item_id: stagedPart.item_id,
                        name: stagedPart.name,
                        quantity: stagedPart.quantity,
                        selling_price: stagedPart.selling_price,
                      }]);
                      setStagedPart(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to add part');
                    } finally {
                      setAddingPartInline(false);
                    }
                  }}
                >
                  {addingPartInline ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                  Add
                </button>
                <button type="button" className="btn-ghost"
                  style={{ padding: '6px', minHeight: 36, color: 'var(--text-muted)', flexShrink: 0 }}
                  onClick={() => setStagedPart(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Total: ₦{(stagedPart.selling_price * stagedPart.quantity).toLocaleString()} · {stagedPart.max_qty} in stock
              </p>
            </div>
          )}

          {/* Show existing parts (read-only) in edit mode */}
          {initialValues && existingParts && existingParts.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Current Parts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {existingParts.map((part) => (
                  <div key={part.item_id} style={{
                    display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--bg-overlay)', fontSize: 'var(--text-xs)',
                  }}>
                    <span style={{ flex: 1, fontWeight: 500, color: 'var(--text-primary)' }}>{part.item_name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>×{part.quantity}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      ₦{((part.selling_price ?? part.unit_cost) * part.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show recently added parts in edit mode */}
          {initialValues && recentlyAddedParts.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Just Added</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentlyAddedParts.map((part) => (
                  <div key={part.item_id} style={{
                    display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    <span style={{ flex: 1, fontWeight: 500, color: 'var(--text-primary)' }}>{part.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>×{part.quantity}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      ₦{(part.selling_price * part.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create mode: editable parts list */}
          {!initialValues && form.parts && form.parts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.parts.map((part: any, idx) => (
                <div key={part.item_id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 100px', minWidth: 0, fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {part._name || 'Item'}
                  </div>
                  <input type="number" className="input"
                    style={{ width: 58, flexShrink: 0, padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                    min={1} value={part.quantity} title="Quantity"
                    onChange={(e) => handleUpdatePart(idx, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <div style={{ flex: '1 1 90px', minWidth: 90 }}>
                    <CurrencyInput value={part.selling_price || 0}
                      onChange={(v) => handleUpdatePart(idx, { selling_price: v })} />
                  </div>
                  <button type="button" className="btn-ghost"
                    style={{ padding: '6px', color: 'var(--accent-red)', flexShrink: 0 }}
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

      {/* Charges — auto-fit wraps to 2-col on narrow modal, 3-col on wider screens */}
      <div className="repair-charges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
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
          <CurrencyInput label="Total Estimate" value={form.total_charge}
            onChange={(v) => set('total_charge', v)} />
        </div>
        <div className="form-group">
          <CurrencyInput label="Amount Paid" value={form.amount_paid ?? form.total_charge}
            onChange={(v) => set('amount_paid', v)} />
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
