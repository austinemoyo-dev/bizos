'use client';

import { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, placeholder = '0.00', label, error, disabled }: CurrencyInputProps) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value === 0) { setDisplay(''); return; }
    setDisplay(value.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts.length > 1 ? '.' + parts[1] : '');
    setDisplay(formatted);
    const num = parseFloat(raw) || 0;
    onChange(num);
  };

  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div className="input-group">
        <span className="input-group-prefix">₦</span>
        <input
          type="text"
          inputMode="decimal"
          className="input input-currency"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{ flex: 1 }}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
